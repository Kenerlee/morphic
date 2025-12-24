#!/usr/bin/env python3
"""
民宿投资 Skill 演示 - 自动运行所有测试
"""

import json
import time

import requests

BASE_URL = "http://localhost:8000"
HOMESTAY_SKILL_ID = "skill_015FtmDcs3NUKhwqTgukAyWc"

print("\n🏠 " + "=" * 66)
print("   民宿投资决策 Skill 完整演示")
print("=" * 70 + "\n")

# 测试 1: 介绍功能
print("=" * 70)
print("演示 1: 了解民宿投资决策工具")
print("=" * 70)

response = requests.post(
    f"{BASE_URL}/invoke",
    json={
        "skill_ids": [HOMESTAY_SKILL_ID],
        "message": "请简要介绍这个民宿投资决策工具的主要功能。",
        "max_tokens": 1024,
    },
)

if response.status_code == 200:
    data = response.json()
    print(f"\n✅ 成功调用")
    print(f"Token 使用: {data['usage']}\n")
    for item in data["response"]:
        if item["type"] == "text":
            print(item["text"])
            print()
else:
    print(f"❌ 错误: {response.text}")

time.sleep(2)

# 测试 2: 具体地区分析
print("\n" + "=" * 70)
print("演示 2: 分析北京三里屯民宿投资机会")
print("=" * 70)

response = requests.post(
    f"{BASE_URL}/invoke",
    json={
        "skill_ids": [HOMESTAY_SKILL_ID],
        "message": """我想在北京三里屯投资精品民宿，请帮我分析：
1. 需要收集哪些数据？
2. 主要竞争对手是谁？
3. 目标客群是什么？""",
        "max_tokens": 2048,
    },
)

if response.status_code == 200:
    data = response.json()
    print(f"\n✅ 成功调用")
    print(f"Token 使用: {data['usage']}\n")
    for item in data["response"]:
        if item["type"] == "text":
            print(item["text"])
            print()
else:
    print(f"❌ 错误: {response.text}")

time.sleep(2)

# 测试 3: ROI 计算
print("\n" + "=" * 70)
print("演示 3: 投资回报率计算")
print("=" * 70)

response = requests.post(
    f"{BASE_URL}/invoke",
    json={
        "skill_ids": [HOMESTAY_SKILL_ID],
        "message": """计算民宿投资回报：
- 租金：10000元/月
- 装修：30万
- 3个房间
- 房价：500元/晚
- 入住率：60%
- 运营成本：3000元/月

请计算投资回收期和年收益率。""",
        "max_tokens": 2048,
    },
)

if response.status_code == 200:
    data = response.json()
    print(f"\n✅ 成功调用")
    print(f"Token 使用: {data['usage']}\n")
    for item in data["response"]:
        if item["type"] == "text":
            print(item["text"])
            print()
else:
    print(f"❌ 错误: {response.text}")

print("\n" + "=" * 70)
print("✅ 民宿投资决策 Skill 演示完成！")
print("=" * 70)
print("\n💡 这个 Skill 可以帮助您:")
print("   ✅ 数据驱动的市场分析")
print("   ✅ 科学的投资决策评估")
print("   ✅ 详细的 ROI 计算")
print("   ✅ 专业的调研报告生成")
print()
