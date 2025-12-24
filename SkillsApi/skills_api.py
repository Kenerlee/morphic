#!/usr/bin/env python3
"""
Anthropic Skills API Server
支持多个 Skills 调用，限流 5 QPS
"""

import os
import asyncio
import threading
import queue
import time
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

import json

import anthropic
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


# 加载环境变量
def load_env():
    # 优先从项目根目录的 .env.local 加载（与主项目共享配置）
    parent_env_path = Path(__file__).parent.parent / ".env.local"
    if parent_env_path.exists():
        with open(parent_env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()

    # 然后从 SkillsApi/.env 加载（可以覆盖上面的配置）
    local_env_path = Path(__file__).parent / ".env"
    if local_env_path.exists():
        with open(local_env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()


load_env()

# 初始化 FastAPI
app = FastAPI(
    title="Anthropic Skills API",
    description="API for calling various Anthropic Skills with rate limiting",
    version="1.0.0",
)

# 配置 CORS 以允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化限流器 (5 requests per second)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Anthropic 客户端
api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    raise ValueError("ANTHROPIC_API_KEY not found in environment variables")

# 设置较长的超时时间（Skills 调用可能需要较长时间执行代码）
client = anthropic.Anthropic(
    api_key=api_key,
    timeout=300.0,  # 5分钟超时
)

# Beta headers for Skills API and Files API
BETA_HEADERS = ["code-execution-2025-08-25", "skills-2025-10-02", "files-api-2025-04-14"]


# Skills 配置
class SkillType(str, Enum):
    ANTHROPIC = "anthropic"
    CUSTOM = "custom"


class AvailableSkills(str, Enum):
    # Anthropic 官方 Skills
    PDF = "pdf"
    XLSX = "xlsx"
    PPTX = "pptx"
    DOCX = "docx"

    # 自定义 Skills
    CUSTOMER_SEGMENTATION = "skill_014ko5Yg5TtsnS9mYBt5PtR2"
    HOMESTAY_MARKET_ENTRY = "skill_015FtmDcs3NUKhwqTgukAyWc"


# Skills 元数据
SKILLS_METADATA = {
    "pdf": {
        "type": "anthropic",
        "name": "PDF Processing",
        "description": "Extract, create, merge, and manipulate PDF documents",
    },
    "xlsx": {
        "type": "anthropic",
        "name": "Excel Processing",
        "description": "Create and analyze Excel spreadsheets",
    },
    "pptx": {
        "type": "anthropic",
        "name": "PowerPoint Processing",
        "description": "Create and modify PowerPoint presentations",
    },
    "docx": {
        "type": "anthropic",
        "name": "Word Processing",
        "description": "Create and edit Word documents",
    },
    "skill_014ko5Yg5TtsnS9mYBt5PtR2": {
        "type": "custom",
        "name": "Customer Segmentation",
        "description": "Advanced customer segmentation analysis using Targeting™ model",
    },
    "skill_015FtmDcs3NUKhwqTgukAyWc": {
        "type": "custom",
        "name": "Homestay Market Entry",
        "description": "Data-driven homestay investment decision support and market research",
    },
}


# 请求模型
class SkillRequest(BaseModel):
    skill_ids: List[str] = Field(..., description="List of skill IDs to use (max 8)")
    message: str = Field(..., description="User message/prompt")
    max_tokens: int = Field(
        default=16384, ge=1, le=128000, description="Maximum tokens in response (up to 128k)"
    )
    container_id: Optional[str] = Field(
        None, description="Reuse existing container ID for multi-turn conversations"
    )


class SkillResponse(BaseModel):
    status: str
    container_id: str
    stop_reason: str
    model: str
    response: List[Dict[str, Any]]
    usage: Dict[str, int]
    file_ids: List[str] = Field(default_factory=list, description="List of file IDs generated during execution")


class FileDownloadResponse(BaseModel):
    status: str
    file_id: str
    filename: str
    size_bytes: int
    content_type: str


# API 路由


@app.get("/")
async def root():
    """API 根路径"""
    return {
        "message": "Anthropic Skills API Server",
        "version": "1.0.0",
        "rate_limit": "5 requests per second",
        "docs": "/docs",
    }


@app.get("/skills")
async def list_skills():
    """列出所有可用的 Skills"""
    return {"total": len(SKILLS_METADATA), "skills": SKILLS_METADATA}


@app.post("/invoke", response_model=SkillResponse)
@limiter.limit("5/second")
async def invoke_skills(request: Request, skill_request: SkillRequest):
    """
    调用指定的 Skills

    Rate Limit: 5 requests per second
    """
    # 验证 skill_ids 数量
    if len(skill_request.skill_ids) > 8:
        raise HTTPException(
            status_code=400, detail="Maximum 8 skills allowed per request"
        )

    # 验证 skill_ids 是否存在
    invalid_skills = [
        sid for sid in skill_request.skill_ids if sid not in SKILLS_METADATA
    ]
    if invalid_skills:
        raise HTTPException(
            status_code=400, detail=f"Invalid skill IDs: {invalid_skills}"
        )

    # 构建 skills 配置
    skills_config = []
    for skill_id in skill_request.skill_ids:
        metadata = SKILLS_METADATA[skill_id]
        skills_config.append(
            {"type": metadata["type"], "skill_id": skill_id, "version": "latest"}
        )

    try:
        # 构建容器配置
        container = {"skills": skills_config}
        if skill_request.container_id:
            container["id"] = skill_request.container_id

        # 调用 Anthropic API
        response = client.beta.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=skill_request.max_tokens,
            betas=BETA_HEADERS,
            container=container,
            messages=[{"role": "user", "content": skill_request.message}],
            tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
        )

        # 处理响应内容并提取 file_ids
        response_content = []
        file_ids = []

        for content in response.content:
            if hasattr(content, "text"):
                response_content.append({"type": "text", "text": content.text})
            elif content.type == "bash_code_execution_tool_result":
                # 从 bash 结果中提取 file_ids
                result_content = getattr(content, "content", None)
                if result_content and hasattr(result_content, "type"):
                    if result_content.type == "bash_code_execution_result":
                        for item in getattr(result_content, "content", []):
                            if hasattr(item, "file_id") and item.file_id:
                                file_ids.append(item.file_id)
                response_content.append({"type": content.type, "data": str(content)})
            else:
                response_content.append({"type": content.type, "data": str(content)})

        return SkillResponse(
            status="success",
            container_id=response.container.id
            if hasattr(response, "container") and response.container
            else "",
            stop_reason=response.stop_reason,
            model=response.model,
            response=response_content,
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
            file_ids=file_ids,
        )

    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"Anthropic API Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@app.post("/invoke/{skill_name}")
@limiter.limit("5/second")
async def invoke_single_skill(
    request: Request, skill_name: str, message: str, max_tokens: int = 4096
):
    """
    调用单个 Skill (简化版接口)

    Rate Limit: 5 requests per second
    """
    # 查找 skill ID
    skill_id = None
    for sid, metadata in SKILLS_METADATA.items():
        if (
            sid == skill_name
            or metadata["name"].lower().replace(" ", "-") == skill_name.lower()
        ):
            skill_id = sid
            break

    if not skill_id:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")

    # 复用 invoke_skills 逻辑
    skill_request = SkillRequest(
        skill_ids=[skill_id], message=message, max_tokens=max_tokens
    )

    return await invoke_skills(request, skill_request)


@app.post("/stream/invoke")
@limiter.limit("5/second")
async def invoke_skills_stream(request: Request, skill_request: SkillRequest):
    """
    调用指定的 Skills (流式响应)

    返回 Server-Sent Events (SSE) 格式的流式响应
    Rate Limit: 5 requests per second

    使用线程和队列来支持keepalive heartbeat，避免长时间无事件导致连接超时
    """
    # 验证 skill_ids 数量
    if len(skill_request.skill_ids) > 8:
        raise HTTPException(
            status_code=400, detail="Maximum 8 skills allowed per request"
        )

    # 验证 skill_ids 是否存在
    invalid_skills = [
        sid for sid in skill_request.skill_ids if sid not in SKILLS_METADATA
    ]
    if invalid_skills:
        raise HTTPException(
            status_code=400, detail=f"Invalid skill IDs: {invalid_skills}"
        )

    # 构建 skills 配置
    skills_config = []
    for skill_id in skill_request.skill_ids:
        metadata = SKILLS_METADATA[skill_id]
        skills_config.append(
            {"type": metadata["type"], "skill_id": skill_id, "version": "latest"}
        )

    # 使用队列在线程间传递数据
    event_queue = queue.Queue()

    # 用于跟踪当前正在执行的内容块
    current_blocks = {}
    step_counter = [0]  # 使用列表以便在闭包中修改
    active_steps_info = {}  # 跟踪每个 block_index 对应的 step_number
    collected_file_ids = []  # 收集执行过程中产生的文件ID

    def run_anthropic_stream():
        """在单独线程中运行Anthropic流式调用"""
        try:
            # 构建容器配置
            container = {"skills": skills_config}
            if skill_request.container_id:
                container["id"] = skill_request.container_id

            # 调用 Anthropic API (流式)
            with client.beta.messages.stream(
                model="claude-sonnet-4-5-20250929",
                max_tokens=skill_request.max_tokens,
                betas=BETA_HEADERS,
                container=container,
                messages=[{"role": "user", "content": skill_request.message}],
                tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
            ) as stream:
                for event in stream:
                    # 处理不同类型的事件
                    if hasattr(event, "type"):
                        if event.type == "content_block_delta":
                            if hasattr(event.delta, "text"):
                                # 文本增量
                                event_queue.put({"type": "text_delta", "text": event.delta.text})
                            # 处理 code_execution 的输入增量
                            elif hasattr(event.delta, "type"):
                                if event.delta.type == "code_execution_input_json_delta":
                                    # 代码输入增量
                                    if hasattr(event.delta, "partial_json"):
                                        event_queue.put({
                                            "type": "code_input_delta",
                                            "partial_json": event.delta.partial_json,
                                            "index": event.index
                                        })

                        elif event.type == "content_block_start":
                            block = event.content_block
                            block_type = getattr(block, "type", "unknown")
                            block_index = event.index

                            # 记录当前块，包括可能的结果内容
                            current_blocks[block_index] = {
                                "type": block_type,
                                "id": getattr(block, "id", None),
                                "name": getattr(block, "name", None),
                                "content": []  # 用于收集结果内容
                            }

                            if block_type == "tool_use":
                                # Claude 调用工具（如 code_execution）
                                step_counter[0] += 1
                                # 记录此 block_index 对应的 step_number
                                active_steps_info[block_index] = {"step_number": step_counter[0]}
                                event_queue.put({
                                    "type": "step_start",
                                    "step_type": "tool_use",
                                    "step_number": step_counter[0],
                                    "tool_name": getattr(block, "name", "unknown"),
                                    "tool_id": getattr(block, "id", ""),
                                    "index": block_index
                                })
                            elif block_type == "server_tool_use":
                                # 服务器端工具调用（skill 执行）
                                step_counter[0] += 1
                                # 记录此 block_index 对应的 step_number
                                active_steps_info[block_index] = {"step_number": step_counter[0]}
                                event_queue.put({
                                    "type": "step_start",
                                    "step_type": "server_tool_use",
                                    "step_number": step_counter[0],
                                    "tool_name": getattr(block, "name", "skill"),
                                    "tool_id": getattr(block, "id", ""),
                                    "index": block_index
                                })
                            elif block_type == "code_execution_tool_result":
                                # 代码执行结果 - 提取结果内容
                                result_content = getattr(block, "content", [])
                                result_data = []
                                for item in result_content:
                                    item_type = getattr(item, "type", "unknown")
                                    if item_type == "text":
                                        result_data.append({
                                            "type": "text",
                                            "text": getattr(item, "text", "")
                                        })
                                    elif item_type == "image":
                                        # 图片结果（如图表）
                                        result_data.append({
                                            "type": "image",
                                            "media_type": getattr(item.source, "media_type", "image/png") if hasattr(item, "source") else "image/png"
                                        })

                                event_queue.put({
                                    "type": "code_result_start",
                                    "index": block_index,
                                    "tool_use_id": getattr(block, "tool_use_id", ""),
                                    "result": result_data if result_data else None
                                })
                            elif block_type == "server_tool_result":
                                # 服务器端工具结果 - 提取结果内容
                                result_content = getattr(block, "content", [])
                                result_data = []
                                for item in result_content:
                                    item_type = getattr(item, "type", "unknown")
                                    if item_type == "text":
                                        result_data.append({
                                            "type": "text",
                                            "text": getattr(item, "text", "")
                                        })

                                event_queue.put({
                                    "type": "server_result_start",
                                    "index": block_index,
                                    "tool_use_id": getattr(block, "tool_use_id", ""),
                                    "result": result_data if result_data else None
                                })
                            elif block_type == "text":
                                # 文本块开始
                                event_queue.put({
                                    "type": "content_start",
                                    "content_type": "text",
                                    "index": block_index
                                })
                            elif block_type in ("text_editor_code_execution_tool_result", "bash_code_execution_tool_result"):
                                # Skills 的代码执行结果 - 提取结果内容
                                # block.content 是 BetaTextEditorCodeExecutionViewResultBlock 或类似对象
                                result_content = getattr(block, "content", None)
                                result_data = None

                                if result_content:
                                    # 获取内容类型
                                    content_type = getattr(result_content, "type", "unknown")

                                    if content_type == "text_editor_code_execution_view_result":
                                        # 文件查看结果
                                        result_data = {
                                            "type": "file_view",
                                            "content": getattr(result_content, "content", ""),
                                            "file_type": getattr(result_content, "file_type", "text"),
                                            "num_lines": getattr(result_content, "num_lines", 0),
                                            "start_line": getattr(result_content, "start_line", 1),
                                            "total_lines": getattr(result_content, "total_lines", 0)
                                        }
                                    elif content_type == "text_editor_code_execution_edit_result":
                                        # 文件编辑结果
                                        result_data = {
                                            "type": "file_edit",
                                            "path": getattr(result_content, "path", ""),
                                            "old_content": getattr(result_content, "old_content", ""),
                                            "new_content": getattr(result_content, "new_content", "")
                                        }
                                    elif content_type == "bash_code_execution_result":
                                        # Bash 执行结果 - 也检查是否有文件输出
                                        file_ids_in_result = []
                                        result_items = getattr(result_content, "content", [])
                                        for item in result_items:
                                            if hasattr(item, "file_id") and item.file_id:
                                                file_ids_in_result.append(item.file_id)
                                                collected_file_ids.append(item.file_id)

                                        result_data = {
                                            "type": "bash_result",
                                            "stdout": getattr(result_content, "stdout", ""),
                                            "stderr": getattr(result_content, "stderr", ""),
                                            "exit_code": getattr(result_content, "exit_code", 0),
                                            "file_ids": file_ids_in_result if file_ids_in_result else None
                                        }
                                    else:
                                        # 其他类型，尝试提取通用信息
                                        result_data = {
                                            "type": content_type,
                                            "content": str(result_content)[:500]  # 截断以避免过长
                                        }

                                event_queue.put({
                                    "type": "skill_result_start",
                                    "result_type": block_type.replace("_tool_result", ""),
                                    "index": block_index,
                                    "tool_use_id": getattr(block, "tool_use_id", ""),
                                    "result": result_data
                                })
                            else:
                                # 其他类型
                                event_queue.put({
                                    "type": "content_start",
                                    "content_type": block_type,
                                    "index": block_index
                                })

                        elif event.type == "content_block_stop":
                            block_index = event.index
                            block_info = current_blocks.get(block_index, {})
                            block_type = block_info.get("type", "unknown")

                            if block_type in ("tool_use", "server_tool_use"):
                                # 步骤完成 - 查找对应的 step_number
                                # 通过 index 或 tool_id 匹配步骤
                                step_num = active_steps_info.get(block_index, {}).get("step_number", block_index + 1)
                                event_queue.put({
                                    "type": "step_complete",
                                    "step_type": block_type,
                                    "step_number": step_num,
                                    "tool_name": block_info.get("name", "unknown"),
                                    "tool_id": block_info.get("id", ""),
                                    "index": block_index
                                })
                            elif block_type == "code_execution_tool_result":
                                # 代码执行结果完成
                                event_queue.put({
                                    "type": "code_result_complete",
                                    "index": block_index
                                })
                            elif block_type in ("text_editor_code_execution_tool_result", "bash_code_execution_tool_result"):
                                # Skills 代码执行结果完成
                                event_queue.put({
                                    "type": "skill_result_complete",
                                    "result_type": block_type.replace("_tool_result", ""),
                                    "index": block_index
                                })
                            else:
                                event_queue.put({
                                    "type": "content_stop",
                                    "content_type": block_type,
                                    "index": block_index
                                })

                            # 清理
                            if block_index in current_blocks:
                                del current_blocks[block_index]

                        elif event.type == "message_start":
                            event_queue.put({"type": "message_start"})
                        elif event.type == "message_stop":
                            event_queue.put({
                                "type": "message_stop",
                                "total_steps": step_counter[0]
                            })

                # 获取最终响应
                final_message = stream.get_final_message()
                container_id = ""
                if hasattr(final_message, "container") and final_message.container:
                    container_id = final_message.container.id

                # 从最终消息中再次提取file_ids（以防流式处理时遗漏）
                for content in final_message.content:
                    if hasattr(content, "type") and content.type == "bash_code_execution_tool_result":
                        result_content = getattr(content, "content", None)
                        if result_content and hasattr(result_content, "type"):
                            if result_content.type == "bash_code_execution_result":
                                for item in getattr(result_content, "content", []):
                                    if hasattr(item, "file_id") and item.file_id:
                                        if item.file_id not in collected_file_ids:
                                            collected_file_ids.append(item.file_id)

                # 发送完成事件
                event_queue.put({
                    "type": "done",
                    "container_id": container_id,
                    "stop_reason": final_message.stop_reason,
                    "usage": {
                        "input_tokens": final_message.usage.input_tokens,
                        "output_tokens": final_message.usage.output_tokens
                    },
                    "file_ids": collected_file_ids if collected_file_ids else None
                })

        except anthropic.APIError as e:
            event_queue.put({"type": "error", "error": f"Anthropic API Error: {str(e)}"})
        except Exception as e:
            event_queue.put({"type": "error", "error": f"Internal Server Error: {str(e)}"})
        finally:
            # 标记流结束
            event_queue.put(None)

    async def generate_stream():
        """异步生成器，从队列读取事件并发送keepalive"""
        # 启动Anthropic流式调用线程
        stream_thread = threading.Thread(target=run_anthropic_stream, daemon=True)
        stream_thread.start()

        KEEPALIVE_INTERVAL = 15  # 每15秒发送一次keepalive
        last_event_time = time.time()

        while True:
            try:
                # 非阻塞方式检查队列，超时1秒
                try:
                    event = event_queue.get(timeout=1.0)
                except queue.Empty:
                    event = None

                current_time = time.time()

                if event is None and not stream_thread.is_alive():
                    # 线程结束且队列为空，退出
                    break
                elif event is None:
                    # 队列暂时为空，检查是否需要发送keepalive
                    if current_time - last_event_time >= KEEPALIVE_INTERVAL:
                        # 发送SSE keepalive注释（以:开头的行被SSE客户端忽略但保持连接）
                        yield f": keepalive {int(current_time)}\n\n"
                        last_event_time = current_time
                else:
                    # 有实际事件，发送它
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                    last_event_time = current_time

                    # 如果是结束事件，退出循环
                    if event.get("type") in ("done", "error"):
                        break

            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'error': f'Stream error: {str(e)}'}, ensure_ascii=False)}\n\n"
                break

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/files/{file_id}/metadata")
@limiter.limit("10/second")
async def get_file_metadata(request: Request, file_id: str):
    """
    获取文件元数据

    Rate Limit: 10 requests per second
    """
    try:
        file_metadata = client.beta.files.retrieve_metadata(
            file_id=file_id,
            betas=["files-api-2025-04-14"]
        )
        return {
            "status": "success",
            "file_id": file_id,
            "filename": file_metadata.filename,
            "size_bytes": file_metadata.size_bytes,
            "created_at": file_metadata.created_at if hasattr(file_metadata, "created_at") else None,
            "mime_type": file_metadata.mime_type if hasattr(file_metadata, "mime_type") else None,
        }
    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"Anthropic API Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@app.get("/files/{file_id}/download")
@limiter.limit("5/second")
async def download_file(request: Request, file_id: str):
    """
    下载文件内容

    Rate Limit: 5 requests per second
    返回文件的原始内容
    """
    try:
        # 先获取元数据以获取文件名
        file_metadata = client.beta.files.retrieve_metadata(
            file_id=file_id,
            betas=["files-api-2025-04-14"]
        )

        # 下载文件内容
        file_content = client.beta.files.download(
            file_id=file_id,
            betas=["files-api-2025-04-14"]
        )

        # 读取文件内容
        content_bytes = file_content.read()

        # 根据文件扩展名确定 MIME 类型
        filename = file_metadata.filename
        mime_type = "application/octet-stream"  # 默认
        if filename.endswith(".md"):
            mime_type = "text/markdown"
        elif filename.endswith(".txt"):
            mime_type = "text/plain"
        elif filename.endswith(".json"):
            mime_type = "application/json"
        elif filename.endswith(".xlsx"):
            mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif filename.endswith(".docx"):
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif filename.endswith(".pdf"):
            mime_type = "application/pdf"
        elif filename.endswith(".pptx"):
            mime_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

        from fastapi.responses import Response
        from urllib.parse import quote

        # URL encode the filename for the Content-Disposition header
        encoded_filename = quote(filename)

        return Response(
            content=content_bytes,
            media_type=mime_type,
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                "Content-Length": str(len(content_bytes))
            }
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"Anthropic API Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@app.get("/files")
@limiter.limit("5/second")
async def list_files(request: Request):
    """
    列出所有可用文件

    Rate Limit: 5 requests per second
    """
    try:
        files = client.beta.files.list(betas=["files-api-2025-04-14"])
        return {
            "status": "success",
            "files": [
                {
                    "file_id": f.id,
                    "filename": f.filename,
                    "size_bytes": f.size_bytes,
                    "created_at": f.created_at if hasattr(f, "created_at") else None,
                }
                for f in files.data
            ]
        }
    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"Anthropic API Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "api_key_configured": bool(api_key)}


# ============================================================================
# OpenAI 兼容的代理端点 (替代 LiteLLM)
# ============================================================================

class OpenAIChatMessage(BaseModel):
    role: str
    content: str

class OpenAIChatRequest(BaseModel):
    model: str = "claude-sonnet-4-5"
    messages: List[OpenAIChatMessage]
    max_tokens: int = 16384
    stream: bool = True
    container: Optional[Dict[str, Any]] = None
    tools: Optional[List[Dict[str, Any]]] = None


# 模型映射
MODEL_MAPPING = {
    "claude-sonnet-4-5": "claude-sonnet-4-5-20250929",
    "claude-sonnet-4": "claude-sonnet-4-20250514",
    "claude-opus-4": "claude-opus-4-20250514",
    "claude-3-7-sonnet": "claude-3-7-sonnet-latest",
}


@app.post("/v1/chat/completions")
@limiter.limit("5/second")
async def openai_chat_completions(request: Request, chat_request: OpenAIChatRequest):
    """
    OpenAI 兼容的 chat/completions 端点
    支持 Anthropic Skills 和 code_execution

    自动发送 keepalive 心跳，避免 Cloudflare 超时
    """
    # 模型映射
    model = MODEL_MAPPING.get(chat_request.model, chat_request.model)

    # 转换消息格式
    messages = [{"role": m.role, "content": m.content} for m in chat_request.messages]

    # 构建容器配置
    container = chat_request.container

    # 构建工具配置
    tools_config = chat_request.tools

    # 确定是否使用 Skills beta
    betas = []
    if container and container.get("skills"):
        betas = BETA_HEADERS
    elif tools_config:
        # 检查是否有 code_execution 工具
        for tool in tools_config:
            if tool.get("type", "").startswith("code_execution"):
                betas = ["code-execution-2025-08-25"]
                break

    if chat_request.stream:
        return await _stream_chat_completion(model, messages, chat_request.max_tokens, container, tools_config, betas)
    else:
        return await _non_stream_chat_completion(model, messages, chat_request.max_tokens, container, tools_config, betas)


async def _non_stream_chat_completion(model, messages, max_tokens, container, tools_config, betas):
    """非流式响应"""
    try:
        kwargs = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
        }
        if betas:
            kwargs["betas"] = betas
        if container:
            kwargs["container"] = container
        if tools_config:
            kwargs["tools"] = tools_config

        if betas:
            response = client.beta.messages.create(**kwargs)
        else:
            response = client.messages.create(**kwargs)

        # 转换为 OpenAI 格式
        content = ""
        for block in response.content:
            if hasattr(block, "text"):
                content += block.text

        return {
            "id": f"chatcmpl-{response.id}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content
                },
                "finish_reason": response.stop_reason
            }],
            "usage": {
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens
            },
            "provider_specific_fields": {
                "container": {"id": response.container.id} if hasattr(response, "container") and response.container else None
            }
        }
    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"Anthropic API Error: {str(e)}")


async def _stream_chat_completion(model, messages, max_tokens, container, tools_config, betas):
    """流式响应，带 keepalive 心跳"""

    event_queue = queue.Queue()

    def run_stream():
        try:
            kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": messages,
            }
            if betas:
                kwargs["betas"] = betas
            if container:
                kwargs["container"] = container
            if tools_config:
                kwargs["tools"] = tools_config

            if betas:
                stream_context = client.beta.messages.stream(**kwargs)
            else:
                stream_context = client.messages.stream(**kwargs)

            with stream_context as stream:
                for event in stream:
                    if hasattr(event, "type"):
                        if event.type == "content_block_delta":
                            if hasattr(event.delta, "text"):
                                # 转换为 OpenAI 格式的 delta
                                openai_chunk = {
                                    "id": "chatcmpl-stream",
                                    "object": "chat.completion.chunk",
                                    "created": int(time.time()),
                                    "model": model,
                                    "choices": [{
                                        "index": 0,
                                        "delta": {"content": event.delta.text},
                                        "finish_reason": None
                                    }]
                                }
                                event_queue.put(openai_chunk)
                        elif event.type == "message_stop":
                            pass  # 等待获取 final message

                # 获取最终响应
                final_message = stream.get_final_message()
                container_id = ""
                if hasattr(final_message, "container") and final_message.container:
                    container_id = final_message.container.id

                # 发送最终 chunk
                final_chunk = {
                    "id": "chatcmpl-stream",
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": model,
                    "choices": [{
                        "index": 0,
                        "delta": {},
                        "finish_reason": final_message.stop_reason
                    }],
                    "usage": {
                        "prompt_tokens": final_message.usage.input_tokens,
                        "completion_tokens": final_message.usage.output_tokens,
                        "total_tokens": final_message.usage.input_tokens + final_message.usage.output_tokens
                    },
                    "provider_specific_fields": {
                        "container": {"id": container_id} if container_id else None
                    }
                }
                event_queue.put(final_chunk)
                event_queue.put("DONE")

        except Exception as e:
            event_queue.put({"error": str(e)})
            event_queue.put("DONE")
        finally:
            event_queue.put(None)

    async def generate():
        stream_thread = threading.Thread(target=run_stream, daemon=True)
        stream_thread.start()

        KEEPALIVE_INTERVAL = 15
        last_event_time = time.time()

        while True:
            try:
                try:
                    event = event_queue.get(timeout=1.0)
                except queue.Empty:
                    event = None

                current_time = time.time()

                if event is None and not stream_thread.is_alive():
                    break
                elif event is None:
                    if current_time - last_event_time >= KEEPALIVE_INTERVAL:
                        # 发送 SSE keepalive 注释
                        yield f": keepalive {int(current_time)}\n\n"
                        last_event_time = current_time
                elif event == "DONE":
                    yield "data: [DONE]\n\n"
                    break
                elif isinstance(event, dict):
                    if "error" in event:
                        yield f"data: {json.dumps({'error': event['error']})}\n\n"
                        break
                    else:
                        yield f"data: {json.dumps(event)}\n\n"
                        last_event_time = current_time

            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                break

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/v1/models")
async def list_models():
    """列出可用模型"""
    models = [
        {"id": "claude-sonnet-4-5", "object": "model", "owned_by": "anthropic"},
        {"id": "claude-sonnet-4", "object": "model", "owned_by": "anthropic"},
        {"id": "claude-opus-4", "object": "model", "owned_by": "anthropic"},
        {"id": "claude-3-7-sonnet", "object": "model", "owned_by": "anthropic"},
    ]
    return {"object": "list", "data": models}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
