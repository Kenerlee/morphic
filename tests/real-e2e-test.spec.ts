import { test, expect } from '@playwright/test'

/**
 * AINavix v2.2 - 真实 E2E 测试
 * 无 Mock，测试真实功能
 */

test.describe('登录页面 - 真实测试', () => {
  test('手机登录页面可以正常加载', async ({ page }) => {
    await page.goto('/auth/login')

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')

    // 验证手机号输入框存在
    const phoneInput = page.locator('input[type="tel"], input#phone')
    await expect(phoneInput).toBeVisible()
  })

  test('可以输入手机号', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    const phoneInput = page.locator('input[type="tel"], input#phone')
    await phoneInput.fill('13800138000')

    await expect(phoneInput).toHaveValue('13800138000')
  })

  test('点击发送验证码按钮', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    const phoneInput = page.locator('input[type="tel"], input#phone')
    await phoneInput.fill('13800138000')

    const sendButton = page.locator('button[type="submit"]')
    await expect(sendButton).toBeEnabled()

    // 点击发送 - 真实调用 API
    await sendButton.click()

    // 等待响应 - 可能成功进入 OTP 页面，或者显示错误
    await page.waitForTimeout(3000)

    // 检查是否进入验证码输入阶段 或 显示错误信息
    const otpInput = page.locator('input#otp, input[inputmode="numeric"]')
    const errorMsg = page.locator('.text-red-500, [class*="error"]')

    const hasOtpInput = await otpInput.isVisible().catch(() => false)
    const hasError = await errorMsg.isVisible().catch(() => false)

    // 必须有一个结果
    expect(hasOtpInput || hasError).toBe(true)
  })

  test('邮箱登录页面可以加载', async ({ page }) => {
    await page.goto('/auth/login?method=email')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input#email')
    await expect(emailInput).toBeVisible()
  })

  test('注册页面可以加载', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await page.waitForLoadState('networkidle')

    // 验证注册表单存在
    await expect(page.locator('form')).toBeVisible()
  })
})

test.describe('首页 - 真实测试', () => {
  test('首页可以正常加载', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 页面加载成功
    await expect(page).toHaveURL('/')
  })

  test('聊天输入框存在', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 查找聊天输入框
    const chatInput = page.locator('textarea').first()
    const isVisible = await chatInput.isVisible().catch(() => false)

    expect(isVisible).toBe(true)
  })

  test('可以输入查询内容', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const chatInput = page.locator('textarea').first()

    if (await chatInput.isVisible()) {
      await chatInput.fill('东南亚电商市场分析')
      await expect(chatInput).toHaveValue('东南亚电商市场分析')
    }
  })
})

test.describe('移动端响应式 - 真实测试', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('移动端首页无水平滚动条', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    expect(hasHorizontalScroll).toBe(false)
  })

  test('移动端登录页无水平滚动条', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    expect(hasHorizontalScroll).toBe(false)
  })
})

test.describe('API 端点 - 真实测试', () => {
  test('GET /api/config/models 返回模型列表', async ({ request }) => {
    const response = await request.get('/api/config/models')

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('POST /api/auth/sms/send 需要手机号', async ({ request }) => {
    const response = await request.post('/api/auth/sms/send', {
      data: {}
    })

    // 没有手机号应该返回 400
    expect(response.status()).toBe(400)
  })

  test('POST /api/auth/sms/send 验证手机号格式', async ({ request }) => {
    const response = await request.post('/api/auth/sms/send', {
      data: { phone: '12345' }
    })

    // 无效手机号应该返回 400
    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.error).toContain('手机号')
  })

  test('POST /api/auth/sms/verify 需要验证码', async ({ request }) => {
    const response = await request.post('/api/auth/sms/verify', {
      data: { phone: '13800138000' }
    })

    // 没有验证码应该返回 400
    expect(response.status()).toBe(400)
  })
})

test.describe('页面导航 - 真实测试', () => {
  test('从登录页跳转到注册页', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    const signUpLink = page.locator('a[href="/auth/sign-up"]')
    await signUpLink.click()

    await page.waitForURL('**/auth/sign-up')
    expect(page.url()).toContain('/auth/sign-up')
  })

  test('从注册页跳转到登录页', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await page.waitForLoadState('networkidle')

    const loginLink = page.locator('a[href="/auth/login"]')
    await loginLink.click()

    await page.waitForURL('**/auth/login')
    expect(page.url()).toContain('/auth/login')
  })
})
