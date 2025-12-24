#!/usr/bin/env python3
"""完整测试 SkillsApi 民宿市场调研 - 使用流式端点"""

import requests
import json
import time

SKILLS_API_URL = "https://skills-api-proxy-1.onrender.com"

def test_full_skill():
    print("=" * 70)
    print("  🏠 民宿市场调研 Skill 完整测试（流式端点）")
    print("=" * 70)
    print()

    # 完整的项目信息
    message = """帮我分析一下日本东京的民宿市场。项目信息如下：
1. 项目名称：东京浅草民宿项目
2. 目标区域：浅草地区（台东区）
3. 入局类型：0-1新开
4. 房源类型：公寓，2室1厅，约50平米
5. 预期月租金：15万日元（约7500人民币）
6. 总投资预算：50-80万人民币
7. 可接受回本周期：24-36个月
8. 风险承受能力：中等
9. 经营模式：托管
10. 目标客群：中国游客、亲子家庭
11. 差异化定位：传统日式体验+现代便利设施

请进行完整的市场调研并生成报告。"""

    payload = {
        "message": message,
        "skill_ids": ["skill_015FtmDcs3NUKhwqTgukAyWc"],
        "stream": True
    }

    # 使用流式端点 /stream/invoke
    endpoint = f"{SKILLS_API_URL}/stream/invoke"

    print(f"Skill ID: skill_015FtmDcs3NUKhwqTgukAyWc")
    print(f"Endpoint: {endpoint}")
    print()
    print("正在调用（预计需要 2-5 分钟）...")
    print("-" * 70)

    start_time = time.time()

    try:
        # 使用 stream=True 来处理 SSE
        response = requests.post(
            endpoint,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=600,  # 10 分钟超时
            stream=True
        )

        if response.status_code != 200:
            print(f"错误: {response.status_code}")
            print(response.text)
            return

        # 收集事件
        events = []
        keepalive_count = 0
        text_content = []
        final_result = None

        for line in response.iter_lines(decode_unicode=True):
            if not line:
                continue

            if line.startswith(": keepalive"):
                keepalive_count += 1
                elapsed = time.time() - start_time
                print(f"  [keepalive #{keepalive_count}] {elapsed:.0f}s", end="\r")
            elif line.startswith("data: "):
                try:
                    data = json.loads(line[6:])
                    events.append(data)

                    event_type = data.get("type", "")

                    if event_type == "text_delta":
                        # 收集文本增量（可能在 delta 或 text 字段）
                        text = data.get("delta", "") or data.get("text", "")
                        if text:
                            text_content.append(text)
                    elif event_type == "skill_result_complete":
                        # 收集技能执行结果
                        result = data.get("result", {})
                        if isinstance(result, dict) and result.get("content"):
                            text_content.append(f"\n[技能结果]\n{result.get('content')}\n")
                    elif event_type == "done":
                        final_result = data
                        print(f"\n[done] 完成")
                    elif event_type == "error":
                        print(f"\n[error] {data.get('error', 'Unknown error')}")
                    elif event_type in ("message_start", "message_stop"):
                        print(f"[{event_type}]")
                    # 其他事件不打印，减少输出

                except json.JSONDecodeError:
                    pass

        elapsed = time.time() - start_time
        print(f"\n\n[完成] 耗时: {elapsed:.1f}s, 收到 {keepalive_count} 个心跳, {len(events)} 个事件")
        print("-" * 70)

        if final_result:
            print(f"\n状态: {final_result.get('status', 'unknown')}")
            print(f"模型: {final_result.get('model', 'unknown')}")
            print(f"Container ID: {final_result.get('container_id', 'unknown')}")

            if 'usage' in final_result:
                usage = final_result['usage']
                print(f"Token 使用: input={usage.get('input_tokens', 0)}, output={usage.get('output_tokens', 0)}")

        if text_content:
            full_text = "".join(text_content)
            print("\n" + "=" * 70)
            print("  📄 完整文本响应")
            print("=" * 70)
            print(full_text)

            # 保存到文件
            output_file = "/tmp/skill_report_output.md"
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(full_text)
            print(f"\n\n报告已保存到: {output_file}")

        # 保存所有事件用于调试
        events_file = "/tmp/skill_events.json"
        with open(events_file, "w", encoding="utf-8") as f:
            json.dump(events, f, ensure_ascii=False, indent=2)
        print(f"事件已保存到: {events_file}")

    except requests.exceptions.Timeout:
        elapsed = time.time() - start_time
        print(f"\n请求超时 ({elapsed:.1f}s)")
    except requests.exceptions.RequestException as e:
        elapsed = time.time() - start_time
        print(f"\n请求失败 ({elapsed:.1f}s): {e}")

if __name__ == "__main__":
    test_full_skill()
