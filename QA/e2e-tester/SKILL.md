---
name: e2e-tester
description: "End-to-end browser testing skill using Playwright to simulate real user behavior. Use this skill when users need to: (1) Test web applications like an end user, (2) Run automated UI tests based on PRD requirements, (3) Execute test scripts against web pages, (4) Generate test reports with screenshots and results. Triggers include requests like 'test this feature', 'run e2e tests', 'verify this functionality works', 'test like a user would', 'run Playwright tests', or when users provide PRD documents and test scenarios."
---

# E2E Browser Testing Skill

Automated end-to-end testing using Playwright to simulate real user interactions with web applications.

---

## CRITICAL RULES - 必须遵守

### 1. 禁止使用 Mock API

**绝对禁止** 在 E2E 测试中使用以下模式：

```typescript
// ❌ 禁止 - Mock API 路由
await page.route('**/api/**', async route => {
  await route.fulfill({ status: 200, body: JSON.stringify({...}) })
})

// ❌ 禁止 - 伪造响应
await page.route('**/api/user/me', async route => {
  await route.fulfill({ body: JSON.stringify({ role: 'admin' }) })
})
```

**原因**: Mock 测试只是"过家家"，无法发现真实 Bug。功能未实现时 Mock 测试也会通过，完全失去测试意义。

### 2. 必须调用真实 API

```typescript
// ✅ 正确 - 直接调用真实 API
const response = await request.post('/api/auth/sms/send', {
  data: { phone: '13800138000' }
})
expect(response.status()).toBe(400) // 验证真实响应

// ✅ 正确 - 真实 UI 交互
await page.goto('/auth/login')
await page.fill('input[type="tel"]', '13800138000')
await page.click('button[type="submit"]')
// 验证真实结果，不管成功还是失败
```

### 3. 测试覆盖率要求：100%

每个 PRD 用户故事必须有对应的测试用例：

| PRD 章节 | 用户故事 | 测试覆盖 |
|----------|----------|----------|
| 3.1 | 手机短信登录 | 必须覆盖 |
| 3.2 | 用户管理后台 | 必须覆盖 |
| 3.3 | 个人中心权益看板 | 必须覆盖 |
| 3.4 | Discovery 频道 | 必须覆盖 |
| 3.5 | 定制化服务 | 必须覆盖 |
| 3.6 | 移动端适配 | 必须覆盖 |

**计算公式**: `覆盖率 = 已测试用户故事数 / PRD 总用户故事数 × 100%`

### 4. 功能未实现 = 测试失败

如果功能未实现，测试结果应该是 **失败**，而不是通过：

```typescript
// ✅ 正确 - 功能未实现时应该失败
test('管理后台页面存在', async ({ page }) => {
  await page.goto('/admin')
  // 如果页面不存在或返回404，这个测试就会失败
  // 这是正确的行为！
  await expect(page.locator('h1')).toContainText('用户管理')
})
```

---

## Quick Start

1. User provides PRD (Product Requirements Document) or feature description
2. **分析 PRD 所有用户故事**，确保 100% 覆盖
3. 编写真实 E2E 测试（无 Mock）
4. Run tests using Playwright
5. Generate test report to `testresults/` folder

## Workflow

### Step 1: PRD 用户故事分析

**必须先完成**：统计 PRD 中所有用户故事

```markdown
## PRD 用户故事清单

| 编号 | 用户故事 | 优先级 | 测试状态 |
|------|----------|--------|----------|
| US-01 | 用户可以通过手机号登录 | P0 | 待测试 |
| US-02 | 用户可以查看配额余量 | P1 | 待测试 |
| ... | ... | ... | ... |
```

### Step 2: Environment Setup

```bash
# 使用 Playwright Test (推荐)
npm install -D @playwright/test
npx playwright install chromium

# 或使用 Python
pip install playwright --break-system-packages
playwright install chromium
```

### Step 3: 编写真实 E2E 测试

**测试文件命名规范**: `{feature}-e2e.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

/**
 * PRD 3.1 手机短信登录 - 真实 E2E 测试
 *
 * 用户故事覆盖:
 * - US-01: 用户可以输入手机号
 * - US-02: 用户可以接收验证码
 * - US-03: 用户可以完成登录
 */

test.describe('手机登录 - 真实测试', () => {

  test('登录页面可以正常加载', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    // 验证真实元素存在
    const phoneInput = page.locator('input[type="tel"]')
    await expect(phoneInput).toBeVisible()
  })

  test('发送验证码 API 返回正确响应', async ({ request }) => {
    // 直接调用真实 API
    const response = await request.post('/api/auth/sms/send', {
      data: { phone: '12345' } // 无效号码
    })

    // 验证真实响应
    expect(response.status()).toBe(400)
    const data = await response.json()
    expect(data.error).toBeDefined()
  })
})
```

### Step 4: Execute Tests

```bash
# 运行所有测试
npx playwright test

# 运行特定测试文件
npx playwright test tests/real-e2e-test.spec.ts

# 带 UI 运行（调试用）
npx playwright test --ui

# 生成 HTML 报告
npx playwright test --reporter=html
```

### Step 5: Generate Report

输出测试结果到 `testresults/` 文件夹：

- 文件名格式: `{PRD版本}_TestReport_{YYYYMMDD}.md`
- 必须包含: 用户故事覆盖率、通过率、失败原因、Bug清单

---

## 测试报告格式

```markdown
# E2E 测试报告: {PRD 版本}

**日期**: {YYYY-MM-DD}
**测试框架**: Playwright
**测试环境**: {URL}

---

## 1. 覆盖率统计

### 1.1 用户故事覆盖率

| PRD 章节 | 用户故事数 | 已覆盖 | 覆盖率 |
|----------|-----------|--------|--------|
| 3.1 登录 | 5 | 5 | 100% |
| 3.2 后台 | 4 | 0 | 0% |
| ... | ... | ... | ... |
| **总计** | **20** | **15** | **75%** |

### 1.2 测试执行结果

| 状态 | 数量 | 百分比 |
|------|------|--------|
| 通过 | 14 | 87.5% |
| 失败 | 2 | 12.5% |
| 跳过 | 0 | 0% |

---

## 2. 发现的 Bug

| 编号 | 严重程度 | 描述 | PRD 章节 |
|------|---------|------|----------|
| BUG-001 | P0 | 移动端有水平滚动条 | 3.6 |
| BUG-002 | P1 | API 响应格式错误 | 3.1 |

---

## 3. 未实现功能

| PRD 章节 | 功能 | 状态 |
|----------|------|------|
| 3.2 | 管理后台 | 未实现 |
| 3.3 | 权益看板 | 未实现 |
```

---

## 真实 E2E 测试模式

### 页面加载测试

```typescript
test('页面正常加载', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 验证真实元素
  await expect(page).toHaveURL('/')
  await expect(page.locator('textarea')).toBeVisible()
})
```

### API 端点测试

```typescript
test('API 返回正确响应', async ({ request }) => {
  const response = await request.get('/api/config/models')

  expect(response.status()).toBe(200)

  const data = await response.json()
  expect(Array.isArray(data)).toBe(true)
})
```

### 表单提交测试

```typescript
test('表单提交触发真实 API', async ({ page }) => {
  await page.goto('/auth/login')

  await page.fill('input[type="tel"]', '13800138000')
  await page.click('button[type="submit"]')

  // 等待真实响应
  await page.waitForTimeout(3000)

  // 验证结果 - 成功或失败都是有效结果
  const otpInput = page.locator('input[inputmode="numeric"]')
  const errorMsg = page.locator('.text-red-500')

  const hasOtp = await otpInput.isVisible().catch(() => false)
  const hasError = await errorMsg.isVisible().catch(() => false)

  // 必须有一个真实结果
  expect(hasOtp || hasError).toBe(true)
})
```

### 移动端响应式测试

```typescript
test.describe('移动端测试', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('无水平滚动条', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    expect(hasHorizontalScroll).toBe(false)
  })
})
```

### 权限验证测试

```typescript
test('未授权访问返回 401/403', async ({ request }) => {
  // 直接访问需要权限的 API（不带 token）
  const response = await request.get('/api/admin/users')

  // 应该被拒绝
  expect([401, 403]).toContain(response.status())
})
```

---

## 测试项目结构

```
tests/
├── auth-e2e.spec.ts        # 登录认证真实测试
├── admin-e2e.spec.ts       # 管理后台真实测试
├── mobile-e2e.spec.ts      # 移动端真实测试
├── api-e2e.spec.ts         # API 端点真实测试
└── real-e2e-test.spec.ts   # 综合真实测试

testresults/
├── {PRD}_TestReport_{date}.md   # 测试报告
├── screenshots/                  # 截图
└── videos/                       # 录像
```

---

## 质量检查清单

在提交测试报告前，必须确认：

- [ ] **无 Mock API** - 没有使用 `page.route()` 伪造响应
- [ ] **100% 用户故事覆盖** - 每个 PRD 用户故事都有测试
- [ ] **真实环境执行** - 在真实 dev server 上运行
- [ ] **Bug 清单完整** - 记录所有发现的真实问题
- [ ] **未实现功能标记** - 明确标注哪些功能未实现

---

## 常见错误 - 绝对禁止

### ❌ 错误示例 1: Mock 登录状态

```typescript
// 绝对禁止！
await page.route('**/api/user/me', async route => {
  await route.fulfill({
    body: JSON.stringify({ id: '123', role: 'admin' })
  })
})
```

### ❌ 错误示例 2: Mock API 响应

```typescript
// 绝对禁止！
await page.route('**/api/admin/users', async route => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ users: [...] })
  })
})
```

### ❌ 错误示例 3: 跳过真实验证

```typescript
// 绝对禁止！
test('功能正常', async ({ page }) => {
  // 没有真实验证就通过
  expect(true).toBe(true)
})
```

---

## 正确做法总结

1. **启动真实 dev server**: `npm run dev`
2. **调用真实 API**: 不使用任何 Mock
3. **验证真实响应**: 检查实际返回的状态码和数据
4. **记录真实 Bug**: 功能不存在 = 测试失败
5. **100% 覆盖 PRD**: 每个用户故事都要测试
6. **生成完整报告**: 包含覆盖率、通过率、Bug 清单
