#!/usr/bin/env python3
"""
E2E Test Runner using Playwright
Executes browser-based tests and generates reports.
"""

import argparse
import json
import os
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("Playwright not installed. Run: pip install playwright --break-system-packages && playwright install chromium")
    sys.exit(1)


class E2ETestRunner:
    """Runs E2E tests using Playwright and generates reports."""
    
    def __init__(self, output_dir: str = "testresults"):
        self.output_dir = Path(output_dir)
        self.screenshots_dir = self.output_dir / "screenshots"
        self.videos_dir = self.output_dir / "videos"
        self._ensure_dirs()
        
    def _ensure_dirs(self):
        """Create output directories if they don't exist."""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.screenshots_dir.mkdir(parents=True, exist_ok=True)
        self.videos_dir.mkdir(parents=True, exist_ok=True)
    
    def run_test(self, url: str, feature_name: str, test_cases: list = None) -> dict:
        """
        Run E2E tests against a URL.
        
        Args:
            url: Target URL to test
            feature_name: Name of the feature being tested
            test_cases: List of test case dicts with 'name', 'action', 'expected'
        
        Returns:
            dict: Test results including pass/fail counts and details
        """
        date_str = datetime.now().strftime("%Y%m%d")
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        results = {
            "feature": feature_name,
            "date": date_str,
            "timestamp": timestamp,
            "url": url,
            "tests": [],
            "passed": 0,
            "failed": 0,
            "total_duration": 0
        }
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1280, "height": 720},
                record_video_dir=str(self.videos_dir)
            )
            page = context.new_page()
            
            start_time = time.time()
            
            try:
                # Navigate to URL
                page.goto(url, wait_until="networkidle", timeout=30000)
                
                # Default test: Page load
                if not test_cases:
                    test_cases = [{"name": "Page Load", "type": "load"}]
                
                for i, test in enumerate(test_cases):
                    test_start = time.time()
                    test_result = self._execute_test(page, test, feature_name, date_str, i)
                    test_result["duration_ms"] = int((time.time() - test_start) * 1000)
                    
                    results["tests"].append(test_result)
                    if test_result["status"] == "pass":
                        results["passed"] += 1
                    else:
                        results["failed"] += 1
                        
            except Exception as e:
                results["tests"].append({
                    "name": "Test Initialization",
                    "status": "fail",
                    "error": str(e),
                    "traceback": traceback.format_exc()
                })
                results["failed"] += 1
            finally:
                results["total_duration"] = round(time.time() - start_time, 2)
                context.close()
                browser.close()
        
        # Generate report
        report_path = self._generate_report(results)
        results["report_path"] = str(report_path)
        
        return results
    
    def _execute_test(self, page, test: dict, feature: str, date: str, index: int) -> dict:
        """Execute a single test case."""
        result = {
            "name": test.get("name", f"Test {index + 1}"),
            "status": "pass",
            "screenshot": None,
            "error": None
        }
        
        try:
            test_type = test.get("type", "custom")
            
            if test_type == "load":
                # Verify page loaded
                assert page.title(), "Page title is empty"
                
            elif test_type == "click":
                selector = test.get("selector")
                page.click(selector, timeout=10000)
                
            elif test_type == "fill":
                selector = test.get("selector")
                value = test.get("value", "")
                page.fill(selector, value)
                
            elif test_type == "visible":
                selector = test.get("selector")
                assert page.locator(selector).is_visible(), f"Element {selector} not visible"
                
            elif test_type == "text":
                selector = test.get("selector")
                expected = test.get("expected")
                actual = page.locator(selector).text_content()
                assert expected in actual, f"Expected '{expected}' in '{actual}'"
                
            elif test_type == "url":
                expected = test.get("expected")
                assert expected in page.url, f"Expected URL to contain '{expected}'"
                
            elif test_type == "custom":
                # Execute custom code if provided
                code = test.get("code")
                if code:
                    exec(code, {"page": page, "assert": assert_})
            
            # Capture screenshot on success
            screenshot_name = f"{feature}_{date}_{index}.png"
            screenshot_path = self.screenshots_dir / screenshot_name
            page.screenshot(path=str(screenshot_path))
            result["screenshot"] = str(screenshot_path)
            
        except AssertionError as e:
            result["status"] = "fail"
            result["error"] = str(e)
            self._capture_failure_screenshot(page, feature, date, index, result)
            
        except PlaywrightTimeout as e:
            result["status"] = "fail"
            result["error"] = f"Timeout: {str(e)}"
            self._capture_failure_screenshot(page, feature, date, index, result)
            
        except Exception as e:
            result["status"] = "fail"
            result["error"] = str(e)
            result["traceback"] = traceback.format_exc()
            self._capture_failure_screenshot(page, feature, date, index, result)
        
        return result
    
    def _capture_failure_screenshot(self, page, feature: str, date: str, index: int, result: dict):
        """Capture screenshot on test failure."""
        try:
            screenshot_name = f"{feature}_{date}_{index}_FAIL.png"
            screenshot_path = self.screenshots_dir / screenshot_name
            page.screenshot(path=str(screenshot_path))
            result["screenshot"] = str(screenshot_path)
        except:
            pass
    
    def _generate_report(self, results: dict) -> Path:
        """Generate markdown test report."""
        feature = results["feature"]
        date = results["date"]
        
        report_name = f"{feature}_{date}.md"
        report_path = self.output_dir / report_name
        
        status = "✅ PASSED" if results["failed"] == 0 else "❌ FAILED"
        
        report = f"""# E2E Test Report: {feature}

**Date**: {results["timestamp"]}  
**URL**: {results["url"]}  
**Status**: {status}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | {results["passed"] + results["failed"]} |
| Passed | {results["passed"]} |
| Failed | {results["failed"]} |
| Duration | {results["total_duration"]}s |

## Test Results

"""
        for test in results["tests"]:
            icon = "✅" if test["status"] == "pass" else "❌"
            report += f"""### {icon} {test["name"]}

- **Status**: {test["status"].upper()}
"""
            if test.get("duration_ms"):
                report += f"- **Duration**: {test['duration_ms']}ms\n"
            
            if test.get("error"):
                report += f"- **Error**: `{test['error']}`\n"
            
            if test.get("screenshot"):
                rel_path = os.path.relpath(test["screenshot"], self.output_dir)
                report += f"- **Screenshot**: [{rel_path}]({rel_path})\n"
            
            report += "\n"
        
        report += """## Notes

- Screenshots are saved in the `screenshots/` subdirectory
- Videos (if recorded) are saved in the `videos/` subdirectory
- Failed tests have `_FAIL` suffix in screenshot names
"""
        
        report_path.write_text(report)
        
        # Also save JSON results
        json_path = self.output_dir / f"{feature}_{date}.json"
        json_path.write_text(json.dumps(results, indent=2))
        
        return report_path


def main():
    parser = argparse.ArgumentParser(description="Run E2E tests using Playwright")
    parser.add_argument("--url", required=True, help="Target URL to test")
    parser.add_argument("--feature", required=True, help="Feature name for the report")
    parser.add_argument("--output", default="testresults", help="Output directory")
    parser.add_argument("--test-file", help="JSON file with test cases")
    
    args = parser.parse_args()
    
    runner = E2ETestRunner(output_dir=args.output)
    
    test_cases = None
    if args.test_file and os.path.exists(args.test_file):
        with open(args.test_file) as f:
            test_cases = json.load(f)
    
    results = runner.run_test(args.url, args.feature, test_cases)
    
    print(f"\n{'='*50}")
    print(f"Test Results: {results['feature']}")
    print(f"{'='*50}")
    print(f"Status: {'PASSED' if results['failed'] == 0 else 'FAILED'}")
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    print(f"Duration: {results['total_duration']}s")
    print(f"Report: {results['report_path']}")
    print(f"{'='*50}\n")
    
    sys.exit(0 if results["failed"] == 0 else 1)


if __name__ == "__main__":
    main()
