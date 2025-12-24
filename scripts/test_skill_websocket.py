"""
通过 WebSocket 封装 HTTP Streaming 调用 Skill
利用 WebSocket 无超时限制的特性绕过 Railway 的 HTTP 超时
"""

import asyncio
import json
import aiohttp
from typing import List, Dict, Any

# LiteLLM Proxy 配置
LITELLM_API_KEY = "sk-0kMWU6LVas6lrj_UYIIM8g"
LITELLM_BASE_URL = "https://llm.moments.top"
MODEL = "claude-sonnet-4-5"
SKILL_ID = "skill_015FtmDcs3NUKhwqTgukAyWc"


async def call_skill_async(messages: List[Dict[str, str]], container_id: str = None) -> Dict[str, Any]:
    """使用 aiohttp 的长连接池调用 Skill"""
    url = f"{LITELLM_BASE_URL}/v1/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LITELLM_API_KEY}",
        "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02",
        "Connection": "keep-alive"
    }

    container = {
        "skills": [
            {
                "type": "custom",
                "skill_id": SKILL_ID,
                "version": "latest"
            }
        ]
    }

    if container_id:
        container["id"] = container_id

    payload = {
        "model": MODEL,
        "messages": messages,
        "max_tokens": 8192,
        "stream": True,
        "container": container,
        "tools": [
            {
                "type": "code_execution_20250825",
                "name": "code_execution"
            }
        ]
    }

    print(f"  正在调用 (Async Streaming)...")

    full_content = ""
    final_result = {}

    # 使用非常长的超时和 TCP keepalive
    timeout = aiohttp.ClientTimeout(total=1800, connect=60, sock_read=900)
    connector = aiohttp.TCPConnector(
        keepalive_timeout=600,
        enable_cleanup_closed=True,
        force_close=False
    )

    try:
        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"  错误: {response.status}")
                    print(f"  响应: {error_text[:500]}")
                    return None

                # 处理 SSE 流
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break

                        try:
                            data = json.loads(data_str)
                            choices = data.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    full_content += content
                                    print(content, end="", flush=True)

                            if "usage" in data:
                                final_result["usage"] = data["usage"]

                            if "provider_specific_fields" in data:
                                final_result["provider_specific_fields"] = data["provider_specific_fields"]

                        except json.JSONDecodeError:
                            pass

                print()  # 换行

        final_result["content"] = full_content
        return final_result

    except asyncio.TimeoutError:
        print("\n  请求超时")
        return None
    except aiohttp.ClientError as e:
        print(f"\n  连接错误: {type(e).__name__}: {e}")
        return None
    except Exception as e:
        print(f"\n  请求异常: {type(e).__name__}: {e}")
        return None


async def main():
    print("=" * 70)
    print("  🏠 民宿市场调研 Skill (Async Streaming 模式)")
    print("=" * 70)
    print(f"\nSkill ID: {SKILL_ID}")
    print(f"Model: {MODEL}")
    print(f"Proxy: {LITELLM_BASE_URL}")

    messages = []
    container_id = None

    # 第1轮
    print("\n" + "=" * 70)
    print("  第1轮：发起调研请求")
    print("=" * 70)

    user_msg = """请帮我做杭州西湖龙井村民宿市场调研。
基本信息：龙井村3层老宅300平米，6间客房，年租15万，预算50万，目标2年回本，定位茶文化精品民宿。
请进行完整分析并给出Go/No-Go建议。"""

    print(f"\n👤 用户: {user_msg}")
    messages.append({"role": "user", "content": user_msg})

    print("\n🤖 助手:")
    print("-" * 70)

    result = await call_skill_async(messages)

    if not result:
        print("\n调用失败")
        return

    print("-" * 70)

    # 获取 container_id
    provider_fields = result.get("provider_specific_fields", {})
    if provider_fields:
        container_id = provider_fields.get("container", {}).get("id")
        if container_id:
            print(f"\n📦 Container ID: {container_id}")

    messages.append({"role": "assistant", "content": result.get("content", "")})

    # Token 统计
    print("\n" + "=" * 70)
    print("  📊 Token 使用")
    print("=" * 70)
    if result and "usage" in result:
        usage = result["usage"]
        print(f"Prompt Tokens: {usage.get('prompt_tokens', 'N/A')}")
        print(f"Completion Tokens: {usage.get('completion_tokens', 'N/A')}")
        print(f"Total Tokens: {usage.get('total_tokens', 'N/A')}")

    print("\n" + "=" * 70)
    print("  ✅ 调研完成")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
