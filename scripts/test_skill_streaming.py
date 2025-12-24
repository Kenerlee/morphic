"""
通过 LiteLLM Proxy 使用 Streaming 模式执行民宿调研 Skill
"""

import json
import httpx
from typing import Generator

# LiteLLM Proxy 配置
LITELLM_API_KEY = "sk-0kMWU6LVas6lrj_UYIIM8g"
LITELLM_BASE_URL = "https://litellm-2025.onrender.com"
MODEL = "claude-sonnet-4-5"
SKILL_ID = "skill_015FtmDcs3NUKhwqTgukAyWc"


def call_skill_streaming(messages: list, container_id: str = None) -> Generator[str, None, dict]:
    """使用 streaming 模式调用 Skill"""
    url = f"{LITELLM_BASE_URL}/v1/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LITELLM_API_KEY}",
        "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02"
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
        "stream": True,  # 启用 streaming
        "container": container,
        "tools": [
            {
                "type": "code_execution_20250825",
                "name": "code_execution"
            }
        ]
    }

    print(f"  正在调用 LiteLLM Proxy (Streaming 模式)...")

    full_content = ""
    final_result = {}

    try:
        transport = httpx.HTTPTransport(retries=3, http2=False)
        with httpx.Client(timeout=httpx.Timeout(900.0, connect=60.0), transport=transport) as client:
            with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    print(f"  错误: {response.status_code}")
                    error_text = response.read().decode()
                    print(f"  响应: {error_text[:500]}")
                    return

                for line in response.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]  # 去掉 "data: " 前缀
                        if data_str.strip() == "[DONE]":
                            break

                        try:
                            data = json.loads(data_str)
                            # 提取 delta content
                            choices = data.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    full_content += content
                                    print(content, end="", flush=True)

                            # 保存 usage 信息
                            if "usage" in data:
                                final_result["usage"] = data["usage"]

                            # 保存 provider_specific_fields
                            if "provider_specific_fields" in data:
                                final_result["provider_specific_fields"] = data["provider_specific_fields"]

                        except json.JSONDecodeError:
                            pass

                print()  # 换行

        final_result["content"] = full_content
        return final_result

    except httpx.ReadTimeout:
        print("\n  请求超时 (读取超时)")
        return None
    except httpx.ConnectTimeout:
        print("\n  请求超时 (连接超时)")
        return None
    except Exception as e:
        print(f"\n  请求异常: {type(e).__name__}: {e}")
        return None


def main():
    print("=" * 70)
    print("  🏠 民宿市场调研 Skill 完整执行测试 (Streaming 模式)")
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

    result = call_skill_streaming(messages)

    if not result:
        print("\n调用失败，请稍后重试")
        return

    print("-" * 70)

    # 获取 container_id
    provider_fields = result.get("provider_specific_fields", {})
    if provider_fields:
        container_id = provider_fields.get("container", {}).get("id")
        if container_id:
            print(f"\n📦 Container ID: {container_id}")

    # 添加到消息历史
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
    print("  ✅ 第1轮完成")
    print("=" * 70)

    # 询问是否继续第2轮
    print("\n是否继续请求生成完整报告？(需要再等待几分钟)")
    print("(自动继续...)")

    # 第2轮
    print("\n" + "=" * 70)
    print("  第2轮：请求详细报告")
    print("=" * 70)

    user_msg_2 = """请生成完整的市场调研报告，包括：执行摘要、市场分析、竞品分析、财务测算、风险提示和最终结论。"""

    print(f"\n👤 用户: {user_msg_2}")
    messages.append({"role": "user", "content": user_msg_2})

    print("\n🤖 助手:")
    print("-" * 70)

    result = call_skill_streaming(messages, container_id)

    if not result:
        print("\n第2轮调用失败")
        return

    print("-" * 70)

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
    main()
