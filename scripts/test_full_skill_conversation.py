"""
通过 LiteLLM 完整执行民宿调研 Skill 的多轮对话
"""

import json
import httpx
from typing import List, Dict, Any

# 配置
LITELLM_API_KEY = "sk-0kMWU6LVas6lrj_UYIIM8g"
LITELLM_BASE_URL = "https://llm.moments.top"
MODEL = "claude-sonnet-4-5"
SKILL_ID = "skill_015FtmDcs3NUKhwqTgukAyWc"


def call_skill(messages: List[Dict[str, str]], container_id: str = None, max_retries: int = 3) -> Dict[str, Any]:
    """调用 Skill，带重试机制"""
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

    # 如果有 container_id，复用之前的 container
    if container_id:
        container["id"] = container_id

    payload = {
        "model": MODEL,
        "messages": messages,
        "max_tokens": 4096,
        "container": container,
        "tools": [
            {
                "type": "code_execution_20250825",
                "name": "code_execution"
            }
        ]
    }

    for attempt in range(max_retries):
        try:
            print(f"  [尝试 {attempt + 1}/{max_retries}]")
            with httpx.Client(timeout=300.0) as client:
                response = client.post(url, headers=headers, json=payload)

                if response.status_code == 200:
                    return response.json()
                else:
                    print(f"错误: {response.status_code}")
                    print(response.text)
                    if attempt < max_retries - 1:
                        print("  重试中...")
                        import time
                        time.sleep(2)
                    else:
                        return None
        except Exception as e:
            print(f"  请求异常: {e}")
            if attempt < max_retries - 1:
                print("  重试中...")
                import time
                time.sleep(3)
            else:
                return None
    return None


def extract_response(result: Dict[str, Any]) -> str:
    """提取响应内容"""
    if result and "choices" in result:
        return result["choices"][0]["message"]["content"]
    return ""


def print_divider(title: str = ""):
    """打印分隔线"""
    print("\n" + "=" * 70)
    if title:
        print(f"  {title}")
        print("=" * 70)


def main():
    print_divider("🏠 民宿市场调研 Skill 完整执行测试")
    print(f"\nSkill ID: {SKILL_ID}")
    print(f"LiteLLM Proxy: {LITELLM_BASE_URL}")
    print(f"Model: {MODEL}")

    # 保存对话历史
    messages = []
    container_id = None

    # ============================================================
    # 第1轮：发起调研请求
    # ============================================================
    print_divider("第1轮：发起调研请求")

    user_msg_1 = """请帮我做杭州西湖龙井村民宿市场调研。基本信息：龙井村3层老宅300平米，6间客房，年租15万，预算50万，目标2年回本，定位茶文化精品民宿，客群是年轻情侣和小家庭。"""

    print(f"\n👤 用户: {user_msg_1}")
    messages.append({"role": "user", "content": user_msg_1})

    result = call_skill(messages)
    if not result:
        print("调用失败")
        return

    assistant_msg_1 = extract_response(result)
    print(f"\n🤖 助手:\n{assistant_msg_1}")
    messages.append({"role": "assistant", "content": assistant_msg_1})

    # 获取 container_id（如果有）
    if "provider_specific_fields" in result:
        container_info = result.get("provider_specific_fields", {}).get("container", {})
        if container_info:
            container_id = container_info.get("id")
            print(f"\n📦 Container ID: {container_id}")

    # ============================================================
    # 第2轮：请求开始正式调研
    # ============================================================
    print_divider("第2轮：请求开始正式调研")

    user_msg_2 = """请开始分析，包括：流量趋势、竞品分析、投资回报测算、Go/No-Go建议。"""

    print(f"\n👤 用户: {user_msg_2}")
    messages.append({"role": "user", "content": user_msg_2})

    result = call_skill(messages, container_id)
    if not result:
        print("调用失败")
        return

    assistant_msg_2 = extract_response(result)
    print(f"\n🤖 助手:\n{assistant_msg_2}")
    messages.append({"role": "assistant", "content": assistant_msg_2})

    # ============================================================
    # 第3轮：请求生成调研报告
    # ============================================================
    print_divider("第3轮：请求生成调研报告")

    user_msg_3 = """请生成完整调研报告，包含执行摘要、市场分析、财务测算、风险提示和结论。"""

    print(f"\n👤 用户: {user_msg_3}")
    messages.append({"role": "user", "content": user_msg_3})

    result = call_skill(messages, container_id)
    if not result:
        print("调用失败")
        return

    assistant_msg_3 = extract_response(result)
    print(f"\n🤖 助手:\n{assistant_msg_3}")

    # ============================================================
    # 打印使用统计
    # ============================================================
    print_divider("📊 调用统计")
    if result and "usage" in result:
        usage = result["usage"]
        print(f"Prompt Tokens: {usage.get('prompt_tokens', 'N/A')}")
        print(f"Completion Tokens: {usage.get('completion_tokens', 'N/A')}")
        print(f"Total Tokens: {usage.get('total_tokens', 'N/A')}")

    print_divider("✅ 调研完成")


if __name__ == "__main__":
    main()
