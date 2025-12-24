"""
通过 LiteLLM 调用 Anthropic Skills 的示例代码

重要说明:
================================================================================
LiteLLM 官方文档确认支持在 chat completions 中使用 Anthropic Skills！

正确的调用方式是在请求中包含:
- tools: [{"type": "code_execution_20250825", "name": "code_execution"}]
- container: {"skills": [{"type": "custom", "skill_id": "xxx", "version": "latest"}]}

但是，第三方 LiteLLM Proxy (如 llm.moments.top) 可能没有完整实现这些 beta 功能。
如果代理不支持，需要自建 LiteLLM Proxy 或直接调用 Anthropic API。
================================================================================
"""

import os
import json
import httpx
from typing import Optional, Dict, Any

# ============================================================
# 配置区域
# ============================================================

# 第三方 LiteLLM 代理配置（你提供的）
THIRD_PARTY_PROXY_KEY = "sk-0kMWU6LVas6lrj_UYIIM8g"
THIRD_PARTY_PROXY_URL = "https://llm.moments.top"
THIRD_PARTY_MODEL = "claude-sonnet-4-5"

# Anthropic 直接 API 配置
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_BASE_URL = "https://api.anthropic.com"
ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929"

# Skill 配置
SKILL_ID = "skill_015FtmDcs3NUKhwqTgukAyWc"


# ============================================================
# 方法1: 通过 LiteLLM Proxy 调用 Skills（标准 LiteLLM 方式）
# ============================================================

def call_via_litellm_with_skills(
    message: str,
    proxy_url: str,
    api_key: str,
    model: str
) -> Optional[Dict[str, Any]]:
    """
    通过 LiteLLM Proxy 使用 container 参数调用 Skills
    这是 LiteLLM 官方文档推荐的方式
    """
    print("\n" + "=" * 60)
    print("方法1: 通过 LiteLLM Proxy 调用 Skills")
    print("=" * 60)

    url = f"{proxy_url}/v1/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        # LiteLLM 需要这些 header 来启用 beta 功能
        "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02"
    }

    # LiteLLM 官方推荐的 Skills 调用格式
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": message}
        ],
        "max_tokens": 4096,
        # LiteLLM 支持 container 参数来指定 Skills
        "container": {
            "skills": [
                {
                    "type": "custom",
                    "skill_id": SKILL_ID,
                    "version": "latest"
                }
            ]
        },
        # code_execution 工具是 Skills 运行的必要条件
        "tools": [
            {
                "type": "code_execution_20250825",
                "name": "code_execution"
            }
        ]
    }

    print(f"URL: {url}")
    print(f"Model: {model}")
    print(f"Skill ID: {SKILL_ID}")
    print(f"\nPayload:\n{json.dumps(payload, indent=2, ensure_ascii=False)}")

    try:
        with httpx.Client(timeout=120.0) as client:
            response = client.post(url, headers=headers, json=payload)
            print(f"\n状态码: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                print(f"\n响应:\n{json.dumps(result, indent=2, ensure_ascii=False)}")

                # 提取内容
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                print(f"\n[回复]: {content}")

                # 检查 provider_specific_fields 中的 container 信息
                provider_fields = result.get("provider_specific_fields", {})
                if provider_fields:
                    print(f"\n[Provider Specific Fields]: {json.dumps(provider_fields, indent=2)}")

                return result
            else:
                print(f"错误: {response.text}")
                error_data = response.json() if response.text else {}
                error_msg = error_data.get("error", {}).get("message", "")

                if "container" in error_msg.lower() or "skills" in error_msg.lower():
                    print("\n提示: 该 LiteLLM Proxy 可能不支持 Skills/Container 功能")
                elif "extra" in error_msg.lower():
                    print("\n提示: 该 LiteLLM Proxy 不接受 container/tools 等额外参数")

                print("\n建议:")
                print("1. 自建 LiteLLM Proxy 并配置 Anthropic API Key")
                print("2. 或直接调用 Anthropic API")
                return None

    except Exception as e:
        print(f"请求错误: {e}")
        return None


# ============================================================
# 方法2: 直接调用 Anthropic API + Skills
# ============================================================

def call_anthropic_directly(message: str) -> Optional[Dict[str, Any]]:
    """
    直接调用 Anthropic API，这是最可靠的方式
    """
    print("\n" + "=" * 60)
    print("方法2: 直接调用 Anthropic API + Skills")
    print("=" * 60)

    if not ANTHROPIC_API_KEY:
        print("错误: 未设置 ANTHROPIC_API_KEY")
        print("请设置: export ANTHROPIC_API_KEY=sk-ant-...")
        return None

    url = f"{ANTHROPIC_BASE_URL}/v1/messages"

    headers = {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02"
    }

    payload = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": message}],
        "container": {
            "skills": [
                {
                    "type": "custom",
                    "skill_id": SKILL_ID,
                    "version": "latest"
                }
            ]
        },
        "tools": [
            {
                "type": "code_execution_20250825",
                "name": "code_execution"
            }
        ]
    }

    print(f"URL: {url}")
    print(f"Model: {ANTHROPIC_MODEL}")
    print(f"Skill ID: {SKILL_ID}")

    try:
        with httpx.Client(timeout=120.0) as client:
            response = client.post(url, headers=headers, json=payload)
            print(f"\n状态码: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                print(f"\n响应:\n{json.dumps(result, indent=2, ensure_ascii=False)}")
                extract_and_display_content(result)

                if result.get("stop_reason") == "pause_turn":
                    print("\n[检测到 pause_turn，继续执行...]")
                    result = handle_pause_turn(result, [{"role": "user", "content": message}])

                return result
            else:
                print(f"错误: {response.text}")
                return None

    except Exception as e:
        print(f"请求错误: {e}")
        return None


# ============================================================
# 方法3: 使用 LiteLLM Python SDK
# ============================================================

def call_via_litellm_sdk(message: str) -> Optional[Any]:
    """
    使用 LiteLLM Python SDK 调用 Skills
    需要先 pip install litellm
    """
    print("\n" + "=" * 60)
    print("方法3: 使用 LiteLLM Python SDK")
    print("=" * 60)

    if not ANTHROPIC_API_KEY:
        print("错误: 未设置 ANTHROPIC_API_KEY")
        return None

    try:
        import litellm
        from litellm import completion
    except ImportError:
        print("请先安装 litellm: pip install litellm")
        return None

    # 设置 API Key
    os.environ["ANTHROPIC_API_KEY"] = ANTHROPIC_API_KEY

    print(f"Model: anthropic/{ANTHROPIC_MODEL}")
    print(f"Skill ID: {SKILL_ID}")

    try:
        # LiteLLM SDK 调用方式
        response = completion(
            model=f"anthropic/{ANTHROPIC_MODEL}",
            messages=[{"role": "user", "content": message}],
            max_tokens=4096,
            tools=[
                {
                    "type": "code_execution_20250825",
                    "name": "code_execution"
                }
            ],
            container={
                "skills": [
                    {
                        "type": "custom",
                        "skill_id": SKILL_ID,
                        "version": "latest"
                    }
                ]
            }
        )

        print(f"\n响应: {response}")

        # 提取内容
        if hasattr(response, 'choices') and response.choices:
            content = response.choices[0].message.content
            print(f"\n[回复]: {content}")

        # 检查 provider_specific_fields
        if hasattr(response, 'provider_specific_fields'):
            print(f"\n[Provider Fields]: {response.provider_specific_fields}")

        return response

    except Exception as e:
        print(f"错误: {e}")
        return None


# ============================================================
# 辅助函数
# ============================================================

def extract_and_display_content(result: Dict[str, Any]):
    """从 Anthropic 响应中提取并显示内容"""
    print("\n" + "-" * 40)
    print("提取的内容:")
    print("-" * 40)

    if "content" in result:
        for item in result["content"]:
            item_type = item.get("type")

            if item_type == "text":
                print(f"\n[文本]:\n{item.get('text')}")

            elif item_type == "tool_use":
                print(f"\n[工具调用]: {item.get('name')}")
                print(f"  ID: {item.get('id')}")

            elif item_type == "server_tool_use":
                print(f"\n[服务器工具调用]: {item.get('name')}")
                input_data = item.get('input', {})
                print(f"  命令: {input_data.get('command')}")
                print(f"  路径: {input_data.get('path')}")

            elif "tool_result" in item_type:
                print(f"\n[工具结果]: {item_type}")
                content = item.get("content", {})
                if isinstance(content, dict) and content.get("type") == "text_editor_code_execution_view_result":
                    file_content = content.get("content", "")
                    print(f"  文件内容前200字符: {file_content[:200]}...")

            else:
                print(f"\n[{item_type}]")


def handle_pause_turn(response: Dict[str, Any], messages: list, max_retries: int = 10) -> Dict[str, Any]:
    """处理 pause_turn"""
    url = f"{ANTHROPIC_BASE_URL}/v1/messages"

    headers = {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02"
    }

    for i in range(max_retries):
        if response.get("stop_reason") != "pause_turn":
            break

        print(f"\n[pause_turn 第 {i+1} 次继续...]")
        messages.append({"role": "assistant", "content": response.get("content", [])})

        payload = {
            "model": ANTHROPIC_MODEL,
            "max_tokens": 4096,
            "container": {
                "id": response.get("container", {}).get("id"),
                "skills": [{"type": "custom", "skill_id": SKILL_ID, "version": "latest"}]
            },
            "messages": messages,
            "tools": [{"type": "code_execution_20250825", "name": "code_execution"}]
        }

        with httpx.Client(timeout=120.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                response = resp.json()
                extract_and_display_content(response)
            else:
                print(f"错误: {resp.text}")
                break

    return response


# ============================================================
# 主函数
# ============================================================

def main():
    print("=" * 60)
    print("LiteLLM + Anthropic Skills 调用测试")
    print("=" * 60)
    print(f"\n配置信息:")
    print(f"  第三方代理: {THIRD_PARTY_PROXY_URL}")
    print(f"  Anthropic API: {ANTHROPIC_BASE_URL}")
    print(f"  Skill ID: {SKILL_ID}")
    print(f"  ANTHROPIC_API_KEY: {'已设置 ✓' if ANTHROPIC_API_KEY else '未设置 ✗'}")

    print("\n" + "=" * 60)
    print("LiteLLM 官方支持的 Skills 调用格式:")
    print("=" * 60)
    print("""
response = completion(
    model="claude-sonnet-4-5-20250929",
    messages=[...],
    tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
    container={
        "skills": [{"type": "custom", "skill_id": "xxx", "version": "latest"}]
    }
)
""")

    print("=" * 60)
    print("\n选择调用方式:")
    print("1. 通过第三方 LiteLLM Proxy 调用 Skills (llm.moments.top)")
    print("2. 直接调用 Anthropic API + Skills (推荐)")
    print("3. 使用 LiteLLM Python SDK + Skills")

    choice = input("\n请输入选择 (1-3，默认2): ").strip() or "2"

    message = input("\n请输入消息 (默认: '请使用这个 skill 帮我分析一下杭州西湖附近的民宿市场'): ").strip()
    if not message:
        message = "请使用这个 skill 帮我分析一下杭州西湖附近的民宿市场"

    if choice == "1":
        call_via_litellm_with_skills(
            message,
            THIRD_PARTY_PROXY_URL,
            THIRD_PARTY_PROXY_KEY,
            THIRD_PARTY_MODEL
        )
    elif choice == "2":
        call_anthropic_directly(message)
    elif choice == "3":
        call_via_litellm_sdk(message)
    else:
        print("无效选择")


if __name__ == "__main__":
    main()
