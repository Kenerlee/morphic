"""
自动执行民宿调研 Skill 完整测试
"""

import json
import httpx
import os

# 从 .env.local 读取 ANTHROPIC_API_KEY
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    value = value.strip().strip('"').strip("'")
                    os.environ[key] = value

load_env()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_BASE_URL = "https://api.anthropic.com"
MODEL = "claude-sonnet-4-5-20250929"
SKILL_ID = "skill_015FtmDcs3NUKhwqTgukAyWc"


def call_skill(messages, container_id=None):
    """调用 Skill"""
    url = f"{ANTHROPIC_BASE_URL}/v1/messages"

    headers = {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
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
        "max_tokens": 4096,
        "container": container,
        "tools": [
            {
                "type": "code_execution_20250825",
                "name": "code_execution"
            }
        ]
    }

    print(f"  正在调用 Anthropic API...")

    try:
        # 使用 http2=False 来避免 HTTP/2 问题
        with httpx.Client(timeout=300.0, http2=False) as client:
            response = client.post(url, headers=headers, json=payload)

            if response.status_code == 200:
                return response.json()
            else:
                print(f"  错误: {response.status_code}")
                print(f"  响应: {response.text[:500]}")
                return None
    except Exception as e:
        print(f"  请求异常: {e}")
        return None


def handle_pause_turn(response, messages, container_id):
    """处理 pause_turn"""
    max_iterations = 10

    for i in range(max_iterations):
        if response.get("stop_reason") != "pause_turn":
            break

        print(f"  [pause_turn 第 {i+1} 次继续...]")

        messages.append({"role": "assistant", "content": response.get("content", [])})

        response = call_skill(messages, container_id)
        if not response:
            break

        container_id = response.get("container", {}).get("id", container_id)

    return response


def extract_text(result):
    """提取文本内容"""
    if not result or "content" not in result:
        return ""

    texts = []
    for item in result.get("content", []):
        if item.get("type") == "text":
            texts.append(item.get("text", ""))

    return "\n".join(texts)


def main():
    if not ANTHROPIC_API_KEY:
        print("错误: 未找到 ANTHROPIC_API_KEY")
        return

    print("=" * 70)
    print("  🏠 民宿市场调研 Skill 完整执行测试")
    print("=" * 70)
    print(f"\nSkill ID: {SKILL_ID}")
    print(f"Model: {MODEL}")
    print(f"API Key: {ANTHROPIC_API_KEY[:25]}...")

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

    result = call_skill(messages)

    if not result:
        print("调用失败")
        return

    container_id = result.get("container", {}).get("id")
    print(f"\n📦 Container ID: {container_id}")

    if result.get("stop_reason") == "pause_turn":
        result = handle_pause_turn(result, messages, container_id)
        container_id = result.get("container", {}).get("id", container_id)

    assistant_msg = extract_text(result)
    print(f"\n🤖 助手:\n{assistant_msg[:2000]}...")

    print("\n" + "=" * 70)
    print("  📊 Token 使用")
    print("=" * 70)
    if result and "usage" in result:
        usage = result["usage"]
        print(f"Input Tokens: {usage.get('input_tokens', 'N/A')}")
        print(f"Output Tokens: {usage.get('output_tokens', 'N/A')}")

    print("\n" + "=" * 70)
    print("  ✅ 调研完成")
    print("=" * 70)


if __name__ == "__main__":
    main()
