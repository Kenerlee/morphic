#!/usr/bin/env python3
"""
民宿尽调生产环境 E2E 测试脚本 - HARDER MODE

测试目标: Skills API 生产环境 https://skills-api-proxy-1.onrender.com
测试范围: 完整的民宿尽调功能测试
"""

import json
import time
import requests
from datetime import datetime

PRODUCTION_API_URL = "https://skills-api-proxy-1.onrender.com"
HOMESTAY_SKILL_ID = "skill_015FtmDcs3NUKhwqTgukAyWc"

# 测试结果收集
test_results = []

def log_test(name, status, duration=0, details=""):
    """记录测试结果"""
    result = {
        "name": name,
        "status": status,
        "duration": duration,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    test_results.append(result)
    icon = "✅" if status == "PASS" else "❌"
    print(f"{icon} {name} - {status} ({duration:.2f}s)")
    if details and status == "FAIL":
        print(f"   详情: {details[:200]}")

def test_health_check():
    """测试 1: 健康检查"""
    start = time.time()
    try:
        resp = requests.get(f"{PRODUCTION_API_URL}/health", timeout=10)
        duration = time.time() - start

        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "healthy" and data.get("api_key_configured"):
                log_test("健康检查", "PASS", duration)
                return True
        log_test("健康检查", "FAIL", duration, f"Status: {resp.status_code}")
        return False
    except Exception as e:
        log_test("健康检查", "FAIL", time.time() - start, str(e))
        return False

def test_skills_list():
    """测试 2: Skills 列表"""
    start = time.time()
    try:
        resp = requests.get(f"{PRODUCTION_API_URL}/skills", timeout=10)
        duration = time.time() - start

        if resp.status_code == 200:
            data = resp.json()
            if data.get("total", 0) >= 6 and HOMESTAY_SKILL_ID in data.get("skills", {}):
                log_test("Skills 列表", "PASS", duration, f"共 {data['total']} 个 skills")
                return True
        log_test("Skills 列表", "FAIL", duration)
        return False
    except Exception as e:
        log_test("Skills 列表", "FAIL", time.time() - start, str(e))
        return False

def test_homestay_skill_info():
    """测试 3: 民宿尽调 Skill 信息"""
    start = time.time()
    try:
        resp = requests.get(f"{PRODUCTION_API_URL}/skills", timeout=10)
        duration = time.time() - start

        if resp.status_code == 200:
            data = resp.json()
            skill = data.get("skills", {}).get(HOMESTAY_SKILL_ID)
            if skill:
                if skill.get("name") == "Homestay Market Entry" and skill.get("type") == "custom":
                    log_test("民宿 Skill 信息验证", "PASS", duration)
                    return True
        log_test("民宿 Skill 信息验证", "FAIL", duration)
        return False
    except Exception as e:
        log_test("民宿 Skill 信息验证", "FAIL", time.time() - start, str(e))
        return False

def test_invalid_skill_id():
    """测试 4: 无效 Skill ID 处理"""
    start = time.time()
    try:
        resp = requests.post(
            f"{PRODUCTION_API_URL}/invoke",
            json={"skill_ids": ["invalid_skill"], "message": "test"},
            timeout=30
        )
        duration = time.time() - start

        if resp.status_code in [400, 404, 422]:
            log_test("无效 Skill ID 处理", "PASS", duration, f"正确返回 {resp.status_code}")
            return True
        log_test("无效 Skill ID 处理", "FAIL", duration, f"返回 {resp.status_code}")
        return False
    except Exception as e:
        log_test("无效 Skill ID 处理", "FAIL", time.time() - start, str(e))
        return False

def test_empty_message():
    """测试 5: 空消息处理"""
    start = time.time()
    try:
        resp = requests.post(
            f"{PRODUCTION_API_URL}/invoke",
            json={"skill_ids": [HOMESTAY_SKILL_ID], "message": ""},
            timeout=30
        )
        duration = time.time() - start

        # 空消息应该返回错误
        if resp.status_code in [400, 422]:
            log_test("空消息处理", "PASS", duration, "正确拒绝空消息")
            return True
        else:
            log_test("空消息处理", "FAIL", duration, f"返回 {resp.status_code}")
            return False
    except Exception as e:
        log_test("空消息处理", "FAIL", time.time() - start, str(e))
        return False

def test_homestay_basic():
    """测试 6: 民宿尽调基础调用"""
    start = time.time()
    try:
        resp = requests.post(
            f"{PRODUCTION_API_URL}/invoke",
            json={
                "skill_ids": [HOMESTAY_SKILL_ID],
                "message": "你好，请简单介绍一下民宿投资的关键要素。"
            },
            timeout=120
        )
        duration = time.time() - start

        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "success" and data.get("response"):
                text = data["response"][0].get("text", "")
                log_test("民宿基础调用", "PASS", duration, f"响应 {len(text)} 字符")
                return True
        log_test("民宿基础调用", "FAIL", duration, f"Status: {resp.status_code}")
        return False
    except Exception as e:
        log_test("民宿基础调用", "FAIL", time.time() - start, str(e))
        return False

def test_homestay_market_analysis():
    """测试 7: 民宿市场分析 - 核心功能"""
    print("\n🔄 执行核心测试: 民宿市场分析 (预计 2-8 分钟)...")
    start = time.time()
    try:
        message = """请对【北京三里屯】的民宿投资市场进行全面分析。
投资预算范围：100-200万
民宿类型：精品公寓
目标客群：商旅人士、年轻游客

请提供以下分析：
1. 区位分析：地理位置、交通便利性、周边配套
2. 市场规模：民宿市场容量、增长趋势
3. 竞争格局：主要竞争对手、定价策略
4. 目标客群：客源结构、消费特征
5. 投资建议：投资回报预测、风险评估、运营建议"""

        resp = requests.post(
            f"{PRODUCTION_API_URL}/invoke",
            json={
                "skill_ids": [HOMESTAY_SKILL_ID],
                "message": message
            },
            timeout=600  # 10 分钟超时
        )
        duration = time.time() - start

        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "success":
                response_list = data.get("response", [])
                if response_list:
                    text = response_list[0].get("text", "")
                    usage = data.get("usage", {})
                    model = data.get("model", "unknown")
                    file_ids = data.get("file_ids", [])

                    details = f"模型: {model}, 响应: {len(text)} 字符, 输入tokens: {usage.get('input_tokens', 0)}, 输出tokens: {usage.get('output_tokens', 0)}, 文件: {len(file_ids)}"
                    log_test("民宿市场分析", "PASS", duration, details)

                    # 保存完整报告
                    print(f"\n📊 报告摘要 (前 1500 字符):\n{'='*60}")
                    print(text[:1500])
                    print(f"{'='*60}\n")

                    return True, text

        log_test("民宿市场分析", "FAIL", duration, f"Status: {resp.status_code}")
        return False, ""
    except Exception as e:
        log_test("民宿市场分析", "FAIL", time.time() - start, str(e))
        return False, ""

def test_stream_endpoint():
    """测试 8: 流式端点"""
    start = time.time()
    try:
        resp = requests.post(
            f"{PRODUCTION_API_URL}/stream/invoke",
            json={
                "skill_ids": [HOMESTAY_SKILL_ID],
                "message": "简单介绍民宿投资。",
                "max_tokens": 1024
            },
            timeout=120,
            stream=True
        )
        duration = time.time() - start

        if resp.status_code == 200:
            content = resp.text
            if "data:" in content:
                log_test("流式端点", "PASS", duration, f"SSE 响应 {len(content)} 字节")
                return True
        log_test("流式端点", "FAIL", duration, f"Status: {resp.status_code}")
        return False
    except Exception as e:
        log_test("流式端点", "FAIL", time.time() - start, str(e))
        return False

def test_pdf_skill():
    """测试 9: PDF Skill 可用性"""
    start = time.time()
    try:
        resp = requests.post(
            f"{PRODUCTION_API_URL}/invoke",
            json={
                "skill_ids": ["pdf"],
                "message": "创建一个简单的 PDF，标题为'测试'。"
            },
            timeout=120
        )
        duration = time.time() - start

        if resp.status_code == 200:
            log_test("PDF Skill", "PASS", duration)
            return True
        log_test("PDF Skill", "FAIL", duration, f"Status: {resp.status_code}")
        return False
    except Exception as e:
        log_test("PDF Skill", "FAIL", time.time() - start, str(e))
        return False

def test_concurrent_requests():
    """测试 10: 并发请求"""
    import concurrent.futures

    start = time.time()

    def make_request():
        return requests.get(f"{PRODUCTION_API_URL}/health", timeout=10)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(make_request) for _ in range(3)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        duration = time.time() - start
        all_success = all(r.status_code == 200 for r in results)

        if all_success:
            log_test("并发请求 (3 个)", "PASS", duration)
            return True
        log_test("并发请求 (3 个)", "FAIL", duration)
        return False
    except Exception as e:
        log_test("并发请求 (3 个)", "FAIL", time.time() - start, str(e))
        return False

def generate_report(report_text=""):
    """生成测试报告"""
    passed = sum(1 for r in test_results if r["status"] == "PASS")
    failed = sum(1 for r in test_results if r["status"] == "FAIL")
    total = len(test_results)

    print("\n" + "="*60)
    print("📋 民宿尽调生产环境 E2E 测试报告")
    print("="*60)
    print(f"\n测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"测试环境: {PRODUCTION_API_URL}")
    print(f"民宿 Skill ID: {HOMESTAY_SKILL_ID}")
    print(f"\n总测试数: {total}")
    print(f"通过: {passed} ✅")
    print(f"失败: {failed} ❌")
    print(f"通过率: {passed/total*100:.1f}%")

    print("\n" + "-"*60)
    print("详细结果:")
    print("-"*60)

    for r in test_results:
        icon = "✅" if r["status"] == "PASS" else "❌"
        print(f"{icon} {r['name']}: {r['status']} ({r['duration']:.2f}s)")
        if r["details"]:
            print(f"   {r['details'][:100]}")

    print("\n" + "="*60)

    # 保存报告到文件
    report = {
        "title": "民宿尽调生产环境 E2E 测试报告",
        "timestamp": datetime.now().isoformat(),
        "environment": PRODUCTION_API_URL,
        "skill_id": HOMESTAY_SKILL_ID,
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": f"{passed/total*100:.1f}%"
        },
        "results": test_results,
        "sample_report": report_text[:3000] if report_text else ""
    }

    return report

def main():
    print("="*60)
    print("🏠 民宿尽调生产环境 E2E 测试 - HARDER MODE")
    print("="*60)
    print(f"API: {PRODUCTION_API_URL}")
    print(f"Skill: {HOMESTAY_SKILL_ID}")
    print("="*60 + "\n")

    # 执行测试
    print("🧪 开始执行测试...\n")

    test_health_check()
    test_skills_list()
    test_homestay_skill_info()
    test_invalid_skill_id()
    test_empty_message()
    test_homestay_basic()

    # 核心测试
    success, report_text = test_homestay_market_analysis()

    test_stream_endpoint()
    test_pdf_skill()
    test_concurrent_requests()

    # 生成报告
    report = generate_report(report_text)

    # 保存 JSON 报告
    report_file = f"/Users/kadenliu/Documents/GitHub/navix202501/testresults/homestay_production_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n📁 报告已保存: {report_file}")

if __name__ == "__main__":
    main()
