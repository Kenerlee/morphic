"""
直接调用 Anthropic API 测试 Skill (不经过任何代理)
"""

import json
import os
import httpx
from dotenv import load_dotenv

load_dotenv("/Users/kadenliu/Documents/GitHub/navix202501/.env.local")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
SKILL_ID = "skill_015FtmDcs3NUKhwqTgukAyWc"


def test_direct_skill():
    """直接调用 Anthropic API"""

    url = "https://api.anthropic.com/v1/messages"

    headers = {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02"
    }

    payload = {
        "model": "claude-sonnet-4-5-20250929",
        "max_tokens": 8192,
        "stream": True,
        "messages": [
            {
                "role": "user",
                "content": """请帮我做杭州西湖龙井村民宿市场调研。
基本信息：龙井村3层老宅300平米，6间客房，年租15万，预算50万，目标2年回本，定位茶文化精品民宿。
请进行完整分析并给出Go/No-Go建议。"""
            }
        ],
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

    print("=" * 70)
    print("  🏠 民宿市场调研 Skill 测试 (直接 Anthropic API)")
    print("=" * 70)
    print(f"\nSkill ID: {SKILL_ID}")
    print(f"Endpoint: {url}")
    print("\n正在调用...")
    print("-" * 70)

    try:
        transport = httpx.HTTPTransport(retries=3, http2=False)
        with httpx.Client(timeout=httpx.Timeout(900.0, connect=60.0), transport=transport) as client:
            with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    print(f"错误: {response.status_code}")
                    error_text = response.read().decode()
                    print(f"响应: {error_text[:1000]}")
                    return

                full_content = ""
                for line in response.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break

                        try:
                            data = json.loads(data_str)

                            # Anthropic 格式的 delta
                            if data.get("type") == "content_block_delta":
                                delta = data.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    text = delta.get("text", "")
                                    full_content += text
                                    print(text, end="", flush=True)

                            # 检查 message_stop
                            if data.get("type") == "message_stop":
                                print("\n\n[消息完成]")

                        except json.JSONDecodeError:
                            pass

                print("\n" + "-" * 70)
                print(f"\n✅ 测试完成，共 {len(full_content)} 字符")

    except httpx.ReadTimeout:
        print("\n请求超时 (读取超时)")
    except httpx.ConnectTimeout:
        print("\n请求超时 (连接超时)")
    except Exception as e:
        print(f"\n请求异常: {type(e).__name__}: {e}")


if __name__ == "__main__":
    test_direct_skill()
