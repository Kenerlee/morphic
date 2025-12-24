#!/usr/bin/env python3
"""
快速测试 API 的所有功能
"""

import json

import requests

BASE_URL = "http://localhost:8000"


def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def test_health():
    """测试 1: 健康检查"""
    print_section("测试 1: 健康检查")
    response = requests.get(f"{BASE_URL}/health")
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")


def test_list_skills():
    """测试 2: 列出所有 Skills"""
    print_section("测试 2: 列出所有 Skills")
    response = requests.get(f"{BASE_URL}/skills")
    print(f"状态码: {response.status_code}")

    data = response.json()
    print(f"\n共有 {data['total']} 个 Skills:")
    for skill_id, info in data["skills"].items():
        print(f"\n  📦 {info['name']}")
        print(f"     ID: {skill_id}")
        print(f"     类型: {info['type']}")
        print(f"     描述: {info['description']}")


def test_pdf_skill():
    """测试 3: 使用 PDF Skill"""
    print_section("测试 3: 使用 PDF Skill")

    payload = {
        "skill_ids": ["pdf"],
        "message": "PDF skill 有哪些主要功能？请简要列举。",
        "max_tokens": 500,
    }

    print(f"发送请求...")
    response = requests.post(f"{BASE_URL}/invoke", json=payload)

    print(f"状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ 调用成功!")
        print(f"模型: {data['model']}")
        print(f"Token 使用: {data['usage']}")
        print(f"\n响应内容:")
        print("-" * 70)
        for item in data["response"]:
            if item["type"] == "text":
                print(item["text"])
        print("-" * 70)
    else:
        print(f"❌ 错误: {response.text}")


def test_customer_segmentation():
    """测试 4: 使用客户分群 Skill"""
    print_section("测试 4: 使用客户分群 Skill")

    payload = {
        "skill_ids": ["skill_014ko5Yg5TtsnS9mYBt5PtR2"],
        "message": "客户分群分析的核心方法是什么？",
        "max_tokens": 500,
    }

    print(f"发送请求...")
    response = requests.post(f"{BASE_URL}/invoke", json=payload)

    print(f"状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ 调用成功!")
        print(f"Token 使用: {data['usage']}")
        print(f"\n响应内容:")
        print("-" * 70)
        for item in data["response"]:
            if item["type"] == "text":
                print(item["text"][:600])  # 只显示前600字符
                if len(item["text"]) > 600:
                    print("\n... (内容已截断)")
        print("-" * 70)
    else:
        print(f"❌ 错误: {response.text}")


def test_homestay_skill():
    """测试 5: 使用民宿投资 Skill"""
    print_section("测试 5: 使用民宿投资分析 Skill")

    payload = {
        "skill_ids": ["skill_015FtmDcs3NUKhwqTgukAyWc"],
        "message": "民宿投资决策需要分析哪些关键要素？",
        "max_tokens": 500,
    }

    print(f"发送请求...")
    response = requests.post(f"{BASE_URL}/invoke", json=payload)

    print(f"状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ 调用成功!")
        print(f"Token 使用: {data['usage']}")
        print(f"\n响应内容:")
        print("-" * 70)
        for item in data["response"]:
            if item["type"] == "text":
                print(item["text"][:600])
                if len(item["text"]) > 600:
                    print("\n... (内容已截断)")
        print("-" * 70)
    else:
        print(f"❌ 错误: {response.text}")


def test_multiple_skills():
    """测试 6: 同时使用多个 Skills"""
    print_section("测试 6: 同时使用多个 Skills (Excel + PowerPoint)")

    payload = {
        "skill_ids": ["xlsx", "pptx"],
        "message": "如何结合使用 Excel 和 PowerPoint 创建数据报告？",
        "max_tokens": 500,
    }

    print(f"发送请求...")
    response = requests.post(f"{BASE_URL}/invoke", json=payload)

    print(f"状态码: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ 调用成功!")
        print(f"Token 使用: {data['usage']}")
        print(f"\n响应内容:")
        print("-" * 70)
        for item in data["response"]:
            if item["type"] == "text":
                print(item["text"][:600])
                if len(item["text"]) > 600:
                    print("\n... (内容已截断)")
        print("-" * 70)
    else:
        print(f"❌ 错误: {response.text}")


def main():
    print("\n")
    print("🚀 " + "=" * 66)
    print("   Anthropic Skills API 快速测试")
    print("=" * 70)

    try:
        # 运行所有测试
        test_health()
        test_list_skills()
        test_pdf_skill()
        test_customer_segmentation()
        test_homestay_skill()
        test_multiple_skills()

        print("\n" + "=" * 70)
        print("✅ 所有测试完成！")
        print("=" * 70)
        print("\n💡 提示:")
        print("   - 访问 http://localhost:8000/docs 查看完整 API 文档")
        print("   - 查看 README_API.md 了解更多使用示例")
        print("\n")

    except requests.exceptions.ConnectionError:
        print("\n❌ 错误: 无法连接到 API 服务器")
        print("请确保服务器正在运行: python skills_api.py")
        print("\n")


if __name__ == "__main__":
    main()
