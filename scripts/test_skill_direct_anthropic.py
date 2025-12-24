"""
直接通过 Anthropic API 完整执行民宿调研 Skill 的多轮对话
"""

import json
import httpx
import os
from typing import List, Dict, Any

# 从 .env.local 读取 ANTHROPIC_API_KEY
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # 去除引号
                    value = value.strip().strip('"').strip("'")
                    os.environ[key] = value

load_env()

# 配置
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_BASE_URL = "https://api.anthropic.com"
MODEL = "claude-sonnet-4-5-20250929"
SKILL_ID = "skill_015FtmDcs3NUKhwqTgukAyWc"


def call_skill(messages: List[Dict[str, Any]], container_id: str = None) -> Dict[str, Any]:
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

    try:
        with httpx.Client(timeout=300.0) as client:
            response = client.post(url, headers=headers, json=payload)

            if response.status_code == 200:
                return response.json()
            else:
                print(f"错误: {response.status_code}")
                print(response.text)
                return None
    except Exception as e:
        print(f"请求异常: {e}")
        return None


def handle_pause_turn(response: Dict[str, Any], messages: List[Dict[str, Any]], container_id: str) -> Dict[str, Any]:
    """处理 pause_turn，继续执行直到完成"""
    max_iterations = 10

    for i in range(max_iterations):
        if response.get("stop_reason") != "pause_turn":
            break

        print(f"  [pause_turn 第 {i+1} 次继续...]")

        # 将助手回复添加到消息历史
        messages.append({"role": "assistant", "content": response.get("content", [])})

        # 继续调用
        response = call_skill(messages, container_id)
        if not response:
            break

        # 更新 container_id
        container_id = response.get("container", {}).get("id", container_id)

    return response


def extract_text_content(result: Dict[str, Any]) -> str:
    """提取响应中的文本内容"""
    if not result or "content" not in result:
        return ""

    texts = []
    for item in result.get("content", []):
        if item.get("type") == "text":
            texts.append(item.get("text", ""))

    return "\n".join(texts)


def print_divider(title: str = ""):
    """打印分隔线"""
    print("\n" + "=" * 70)
    if title:
        print(f"  {title}")
        print("=" * 70)


def main():
    if not ANTHROPIC_API_KEY:
        print("错误: 未找到 ANTHROPIC_API_KEY")
        print("请确保 .env.local 文件中设置了 ANTHROPIC_API_KEY")
        return

    print_divider("🏠 民宿市场调研 Skill 完整执行测试 (Direct Anthropic API)")
    print(f"\nSkill ID: {SKILL_ID}")
    print(f"API: {ANTHROPIC_BASE_URL}")
    print(f"Model: {MODEL}")
    print(f"API Key: {ANTHROPIC_API_KEY[:20]}...")

    # 保存对话历史
    messages = []
    container_id = None

    # ============================================================
    # 第1轮：发起调研请求
    # ============================================================
    print_divider("第1轮：发起调研请求")

    user_msg_1 = """请帮我做杭州西湖龙井村民宿市场调研。

基本信息：
- 龙井村3层老宅300平米，6间客房
- 年租15万，预算50万
- 目标2年回本
- 定位茶文化精品民宿
- 客群是年轻情侣和小家庭

请开始进行完整的市场调研分析，包括流量趋势、竞品分析、投资回报测算，最后给出Go或No-Go建议。"""

    print(f"\n👤 用户: {user_msg_1}")
    messages.append({"role": "user", "content": user_msg_1})

    print("\n🔄 调用 Skill 中...")
    result = call_skill(messages)

    if not result:
        print("调用失败")
        return

    # 获取 container_id
    container_id = result.get("container", {}).get("id")
    if container_id:
        print(f"\n📦 Container ID: {container_id}")

    # 处理 pause_turn
    if result.get("stop_reason") == "pause_turn":
        result = handle_pause_turn(result, messages, container_id)
        container_id = result.get("container", {}).get("id", container_id)

    assistant_msg_1 = extract_text_content(result)
    print(f"\n🤖 助手:\n{assistant_msg_1}")

    # 添加到消息历史
    messages.append({"role": "assistant", "content": result.get("content", [])})

    # ============================================================
    # 第2轮：请求生成完整报告
    # ============================================================
    print_divider("第2轮：请求生成完整报告")

    user_msg_2 = """请根据分析结果，生成一份完整的市场调研报告，包含：
1. 执行摘要
2. 市场分析（流量趋势、客群画像）
3. 竞品分析
4. 财务测算（投资回报率）
5. 风险提示
6. 最终结论和建议（Go/No-Go）"""

    print(f"\n👤 用户: {user_msg_2}")
    messages.append({"role": "user", "content": user_msg_2})

    print("\n🔄 调用 Skill 中...")
    result = call_skill(messages, container_id)

    if not result:
        print("调用失败")
        return

    # 处理 pause_turn
    if result.get("stop_reason") == "pause_turn":
        result = handle_pause_turn(result, messages, container_id)

    assistant_msg_2 = extract_text_content(result)
    print(f"\n🤖 助手:\n{assistant_msg_2}")

    # ============================================================
    # 打印使用统计
    # ============================================================
    print_divider("📊 调用统计")
    if result and "usage" in result:
        usage = result["usage"]
        print(f"Input Tokens: {usage.get('input_tokens', 'N/A')}")
        print(f"Output Tokens: {usage.get('output_tokens', 'N/A')}")

    print_divider("✅ 调研完成")


if __name__ == "__main__":
    main()
