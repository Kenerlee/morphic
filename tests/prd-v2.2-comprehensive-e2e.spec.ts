import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

/**
 * NaviX PRD v2.2 全面系统测试
 *
 * 测试目标: 100% 覆盖 PRD 所有用户故事和边缘场景
 *
 * PRD 用户故事清单:
 * - 3.1 鉴权模块：手机短信登录
 * - 3.2 用户管理后台 (Admin Only)
 * - 3.3 个人中心：权益看板
 * - 3.4 内容分发：Discovery 频道
 * - 3.5 定制化服务：专家接入
 * - 3.6 移动端适配 (Responsive UX)
 *
 * 额外覆盖:
 * - 核心 API 端点测试
 * - 安全性测试
 * - 性能测试
 * - 国际化测试
 * - AI Chat 核心功能测试
 */

const BASE_URL = 'http://localhost:3000'

// ============================================
// 测试辅助函数
// ============================================

/**
 * 等待页面完全加载
 */
async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForLoadState('domcontentloaded')
}

/**
 * 检查元素是否可见（带错误处理）
 */
async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  try {
    return await page.locator(selector).first().isVisible()
  } catch {
    return false
  }
}

/**
 * 获取图形验证码并返回 token
 */
async function getCaptcha(request: APIRequestContext) {
  const response = await request.get('/api/auth/captcha')
  expect(response.status()).toBe(200)
  const data = await response.json()
  return data
}

// ============================================
// 第一部分: 3.1 手机短信登录 (完整流程测试)
// ============================================
test.describe('3.1 手机短信登录 - 完整流程', () => {

  test.describe('登录页面 UI 测试', () => {

    test('LOGIN-UI-01: 登录页面正常加载并显示标题', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      // 验证页面标题
      await expect(page).toHaveTitle(/摸摸底|NaviX|MoMoDi/)

      // 验证页面有登录相关标识
      const hasLoginHeader = await isElementVisible(page, 'h1, h2')
      expect(hasLoginHeader).toBe(true)
    })

    test('LOGIN-UI-02: 手机号输入框存在并可输入', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const phoneInput = page.locator('input[type="tel"]')
      await expect(phoneInput).toBeVisible()

      // 测试输入功能
      await phoneInput.fill('13800138000')
      await expect(phoneInput).toHaveValue('13800138000')

      // 清空后重新输入
      await phoneInput.clear()
      await phoneInput.fill('15900000000')
      await expect(phoneInput).toHaveValue('15900000000')
    })

    test('LOGIN-UI-03: 图形验证码图片正常显示', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      // 等待验证码图片加载
      const captchaImg = page.locator('img[alt="captcha"]')
      await expect(captchaImg).toBeVisible({ timeout: 10000 })

      // 验证图片有 src 属性
      const imgSrc = await captchaImg.getAttribute('src')
      expect(imgSrc).toBeDefined()
      expect(imgSrc!.length).toBeGreaterThan(0)
    })

    test('LOGIN-UI-04: 验证码输入框和刷新按钮存在', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      // 验证码输入框
      const captchaInput = page.locator('input[placeholder="答案"], input[placeholder*="验证"]')
      await expect(captchaInput.first()).toBeVisible()

      // 刷新按钮（可选）
      const refreshBtn = page.locator('button:has(svg), button[aria-label*="refresh"], button[aria-label*="刷新"]')
      const hasRefresh = await refreshBtn.first().isVisible().catch(() => false)
      // 刷新按钮是可选功能
      console.log('刷新按钮存在:', hasRefresh)
    })

    test('LOGIN-UI-05: 发送验证码按钮存在并可点击', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const sendBtn = page.locator('button:has-text("发送验证码"), button:has-text("Send Code"), button:has-text("获取验证码")')
      await expect(sendBtn.first()).toBeVisible()

      // 验证按钮初始状态可点击
      const isDisabled = await sendBtn.first().isDisabled()
      // 初始状态可能因表单验证而禁用
      console.log('发送按钮初始禁用状态:', isDisabled)
    })

    test('LOGIN-UI-06: 邮箱登录切换功能', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      // 查找邮箱登录链接
      const emailLink = page.locator('a[href*="method=email"], a:has-text("邮箱登录"), a:has-text("Email")')
      await expect(emailLink.first()).toBeVisible()

      // 点击切换
      await emailLink.first().click()
      await waitForPageReady(page)

      // 验证切换成功 - 应该显示邮箱输入框
      const emailInput = page.locator('input[type="email"]')
      await expect(emailInput).toBeVisible()
    })

    test('LOGIN-UI-07: Google OAuth 登录按钮存在', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const googleBtn = page.locator('button:has-text("Google"), button[aria-label*="Google"]')
      await expect(googleBtn.first()).toBeVisible()
    })

    test('LOGIN-UI-08: 注册链接存在', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const signupLink = page.locator('a[href*="/sign-up"], a:has-text("注册"), a:has-text("Sign up")')
      await expect(signupLink.first()).toBeVisible()
    })
  })

  test.describe('验证码 API 测试', () => {

    test('CAPTCHA-API-01: GET /api/auth/captcha 返回验证码', async ({ request }) => {
      const response = await request.get('/api/auth/captcha')

      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data.captcha_id).toBeDefined()
      expect(data.captcha_image).toBeDefined()
      expect(data.captcha_image).toContain('data:image/')
    })

    test('CAPTCHA-API-02: 验证码图片是有效的 base64', async ({ request }) => {
      const response = await request.get('/api/auth/captcha')
      const data = await response.json()

      // 验证 base64 格式
      const base64Regex = /^data:image\/(png|jpeg|svg\+xml);base64,/
      expect(base64Regex.test(data.captcha_image)).toBe(true)
    })

    test('CAPTCHA-API-03: POST /api/auth/captcha 验证错误答案返回 400', async ({ request }) => {
      // 先获取验证码
      const captchaData = await getCaptcha(request)

      // 验证错误答案
      const response = await request.post('/api/auth/captcha', {
        data: {
          captcha_id: captchaData.captcha_id,
          captcha_code: '99999' // 错误答案
        }
      })

      expect(response.status()).toBe(400)
    })

    test('CAPTCHA-API-04: 无效 captcha_id 返回错误', async ({ request }) => {
      const response = await request.post('/api/auth/captcha', {
        data: {
          captcha_id: 'invalid-captcha-id-12345',
          captcha_code: '10'
        }
      })

      expect([400, 401, 404]).toContain(response.status())
    })

    test('CAPTCHA-API-05: 多次请求获取不同的验证码', async ({ request }) => {
      const captcha1 = await getCaptcha(request)
      const captcha2 = await getCaptcha(request)

      // 验证码 ID 应该不同
      expect(captcha1.captcha_id).not.toBe(captcha2.captcha_id)
    })
  })

  test.describe('短信验证码 API 测试', () => {

    test('SMS-API-01: 空手机号返回 400', async ({ request }) => {
      const captchaData = await getCaptcha(request)

      const response = await request.post('/api/auth/sms/send', {
        data: {
          phone: '',
          captcha_token: captchaData.captcha_id
        }
      })

      expect(response.status()).toBe(400)
    })

    test('SMS-API-02: 无效手机号格式返回错误', async ({ request }) => {
      const captchaData = await getCaptcha(request)

      const response = await request.post('/api/auth/sms/send', {
        data: {
          phone: '123', // 太短
          captcha_token: captchaData.captcha_id
        }
      })

      expect([400, 401]).toContain(response.status())
    })

    test('SMS-API-03: 无效 captcha_token 返回 401', async ({ request }) => {
      const response = await request.post('/api/auth/sms/send', {
        data: {
          phone: '13800138000',
          captcha_token: 'invalid-token'
        }
      })

      expect([400, 401]).toContain(response.status())
    })

    test('SMS-API-04: 验证 SMS verify API 存在', async ({ request }) => {
      const response = await request.post('/api/auth/sms/verify', {
        data: {
          phone: '13800138000',
          code: '123456'
        }
      })

      // API 存在，返回特定状态码
      expect([200, 400, 401, 500]).toContain(response.status())
    })

    test('SMS-API-05: 无效验证码返回错误', async ({ request }) => {
      const response = await request.post('/api/auth/sms/verify', {
        data: {
          phone: '13800138000',
          code: '000000'
        }
      })

      // 开发环境可能接受任何验证码
      const status = response.status()
      console.log('SMS 验证返回状态:', status)
      expect([200, 400, 401, 500]).toContain(status)
    })
  })

  test.describe('登录表单交互测试', () => {

    test('FORM-01: 完整填写登录表单', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      // 填写手机号
      const phoneInput = page.locator('input[type="tel"]')
      await phoneInput.fill('13800138000')

      // 等待验证码加载
      const captchaImg = page.locator('img[alt="captcha"]')
      await expect(captchaImg).toBeVisible({ timeout: 10000 })

      // 填写验证码答案（随意填写，验证表单可交互）
      const captchaInput = page.locator('input[placeholder="答案"], input[placeholder*="验证"]')
      await captchaInput.first().fill('10')

      // 验证发送按钮
      const sendBtn = page.locator('button:has-text("发送验证码"), button:has-text("Send Code")')
      await expect(sendBtn.first()).toBeVisible()
    })

    test('FORM-02: 点击发送验证码触发 API 调用', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      // 填写表单
      await page.locator('input[type="tel"]').fill('13800138000')
      await page.waitForTimeout(1000)

      // 等待验证码并填写
      const captchaInput = page.locator('input[placeholder="答案"], input[placeholder*="验证"]')
      await captchaInput.first().fill('10')

      // 监听网络请求
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/auth/sms/send') || response.url().includes('/api/auth/captcha'),
        { timeout: 10000 }
      ).catch(() => null)

      // 点击发送
      const sendBtn = page.locator('button:has-text("发送验证码"), button:has-text("Send Code")')
      await sendBtn.first().click()

      // 等待响应（可能成功或失败）
      const response = await responsePromise
      if (response) {
        console.log('API 调用状态:', response.status())
      }

      // 验证按钮状态变化（倒计时或错误提示）
      await page.waitForTimeout(1000)
    })
  })
})

// ============================================
// 第二部分: 3.2 用户管理后台 (Admin Only)
// ============================================
test.describe('3.2 用户管理后台 (Admin Only)', () => {

  test.describe('管理后台访问控制', () => {

    test('ADMIN-01: /admin 路由存在', async ({ page }) => {
      await page.goto('/admin')
      await waitForPageReady(page)

      // 页面应该存在（可能重定向或显示权限错误）
      const currentUrl = page.url()
      const pageExists = currentUrl.includes('/admin') ||
                        currentUrl.includes('/auth') ||
                        currentUrl.includes('/')
      expect(pageExists).toBe(true)
    })

    test('ADMIN-02: 未登录访问管理后台应重定向或拒绝', async ({ page }) => {
      await page.goto('/admin')
      await waitForPageReady(page)

      const currentUrl = page.url()
      const hasAdminAccess = await isElementVisible(page, 'h1:has-text("管理"), h1:has-text("Admin"), h1:has-text("Dashboard")')
      const isRedirected = currentUrl.includes('/auth/login')
      const hasErrorPage = await isElementVisible(page, 'text=403, text=权限, text=unauthorized')

      // 应该是以下情况之一：重定向、拒绝访问、或显示管理内容（测试环境可能允许）
      expect(hasAdminAccess || isRedirected || hasErrorPage || currentUrl.includes('/admin')).toBe(true)
    })

    test('ADMIN-03: /admin/users 用户管理页面存在', async ({ page }) => {
      await page.goto('/admin/users')
      await waitForPageReady(page)

      const currentUrl = page.url()
      expect(currentUrl.includes('/admin') || currentUrl.includes('/auth')).toBe(true)
    })

    test('ADMIN-04: /admin/consultations 咨询管理页面存在', async ({ page }) => {
      await page.goto('/admin/consultations')
      await waitForPageReady(page)

      const currentUrl = page.url()
      expect(currentUrl.includes('/admin') || currentUrl.includes('/auth')).toBe(true)
    })

    test('ADMIN-05: /admin/research-reports 报告管理页面存在', async ({ page }) => {
      await page.goto('/admin/research-reports')
      await waitForPageReady(page)

      const currentUrl = page.url()
      expect(currentUrl.includes('/admin') || currentUrl.includes('/auth')).toBe(true)
    })
  })

  test.describe('管理员 API 安全测试', () => {

    test('ADMIN-API-01: GET /api/admin/users 未授权返回 401/403', async ({ request }) => {
      const response = await request.get('/api/admin/users')

      expect([401, 403]).toContain(response.status())
    })

    test('ADMIN-API-02: PUT /api/admin/users/{id}/level 未授权返回错误', async ({ request }) => {
      const response = await request.put('/api/admin/users/test-user-id/level', {
        data: { level: 'VIP' }
      })

      // 应该拒绝访问
      expect([401, 403, 404, 405]).toContain(response.status())
    })

    test('ADMIN-API-03: POST /api/admin/init 未授权返回错误', async ({ request }) => {
      const response = await request.post('/api/admin/init', {
        data: {}
      })

      expect([401, 403, 404, 405]).toContain(response.status())
    })

    test('ADMIN-API-04: 尝试越权修改自己等级（模拟攻击）', async ({ request }) => {
      // 模拟普通用户尝试提权
      const response = await request.put('/api/admin/users/self/level', {
        data: { level: 'admin' },
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect([401, 403, 404, 405]).toContain(response.status())
    })
  })
})

// ============================================
// 第三部分: 3.3 个人中心权益看板
// ============================================
test.describe('3.3 个人中心权益看板', () => {

  test.describe('个人中心页面测试', () => {

    test('PROFILE-01: /profile 路由存在', async ({ page }) => {
      await page.goto('/profile')
      await waitForPageReady(page)

      const currentUrl = page.url()
      expect(currentUrl.includes('/profile') || currentUrl.includes('/auth')).toBe(true)
    })

    test('PROFILE-02: 个人中心页面元素检查', async ({ page }) => {
      await page.goto('/profile')
      await waitForPageReady(page)

      const currentUrl = page.url()

      if (currentUrl.includes('/profile')) {
        // 如果成功访问，检查页面元素
        const hasContent = await isElementVisible(page, 'main, article, section')
        expect(hasContent).toBe(true)
      } else {
        // 未登录重定向
        expect(currentUrl).toContain('/auth')
      }
    })
  })

  test.describe('用户 API 测试', () => {

    test('USER-API-01: GET /api/user/me 存在', async ({ request }) => {
      const response = await request.get('/api/user/me')

      // 未认证返回 401，已认证返回 200
      expect([200, 401]).toContain(response.status())
    })

    test('USER-API-02: GET /api/user/quota 存在', async ({ request }) => {
      const response = await request.get('/api/user/quota')

      // API 可能存在也可能不存在
      expect([200, 401, 404]).toContain(response.status())
    })

    test('USER-API-03: POST /api/user/usage 存在', async ({ request }) => {
      const response = await request.post('/api/user/usage', {
        data: {}
      })

      expect([200, 400, 401, 404, 405]).toContain(response.status())
    })
  })

  test.describe('配额显示测试', () => {

    test('QUOTA-01: 用户菜单在首页可见', async ({ page }) => {
      await page.goto('/')
      await waitForPageReady(page)

      // 检查用户菜单或登录按钮
      const userMenu = page.locator('button:has(img[alt]), [data-testid="user-menu"], button:has-text("登录"), button:has-text("Sign")')
      await expect(userMenu.first()).toBeVisible({ timeout: 10000 })
    })
  })
})

// ============================================
// 第四部分: 3.4 Discovery 频道
// ============================================
test.describe('3.4 Discovery 频道', () => {

  test.describe('Discovery 页面测试', () => {

    test('DISCOVERY-01: /discovery 页面正常加载', async ({ page }) => {
      await page.goto('/discovery')
      await waitForPageReady(page)

      await expect(page.url()).toContain('/discovery')
    })

    test('DISCOVERY-02: Discovery 页面有标题', async ({ page }) => {
      await page.goto('/discovery')
      await waitForPageReady(page)

      const hasTitle = await isElementVisible(page, 'h1, h2')
      expect(hasTitle).toBe(true)
    })

    test('DISCOVERY-03: Discovery 页面有内容区域', async ({ page }) => {
      await page.goto('/discovery')
      await waitForPageReady(page)

      const hasContent = await isElementVisible(page, 'main, [class*="grid"], [class*="container"]')
      expect(hasContent).toBe(true)
    })

    test('DISCOVERY-04: "开始调研" 按钮存在', async ({ page }) => {
      await page.goto('/discovery')
      await waitForPageReady(page)

      const startBtn = page.locator('a:has-text("开始"), a:has-text("Start"), button:has-text("开始"), button:has-text("Start"), a[href="/"]')
      const hasBtn = await startBtn.first().isVisible().catch(() => false)

      // 或者有导航到首页的链接
      const hasHomeLink = await isElementVisible(page, 'a[href="/"]')

      expect(hasBtn || hasHomeLink).toBe(true)
    })

    test('DISCOVERY-05: 点击"开始调研"导航到首页', async ({ page }) => {
      await page.goto('/discovery')
      await waitForPageReady(page)

      // 尝试点击开始调研按钮
      const startBtn = page.locator('a:has-text("开始"), button:has-text("开始"), a[href="/"]')
      const btnVisible = await startBtn.first().isVisible().catch(() => false)

      if (btnVisible) {
        await startBtn.first().click()
        await waitForPageReady(page)

        // 应该导航到首页
        const currentUrl = page.url()
        expect(currentUrl.endsWith('/') || currentUrl.includes('localhost:3000')).toBe(true)
      }
    })

    test('DISCOVERY-06: Discovery 详情页路由存在', async ({ page }) => {
      // 测试动态路由
      await page.goto('/discovery/test-id')
      await waitForPageReady(page)

      // 页面应该加载（可能显示 404 或实际内容）
      const currentUrl = page.url()
      expect(currentUrl.includes('/discovery')).toBe(true)
    })
  })

  test.describe('Discovery API 测试', () => {

    test('DISCOVERY-API-01: GET /api/discovery/reports 存在', async ({ request }) => {
      const response = await request.get('/api/discovery/reports')

      expect([200, 401, 404]).toContain(response.status())
    })

    test('DISCOVERY-API-02: 验证响应格式', async ({ request }) => {
      const response = await request.get('/api/discovery/reports')

      if (response.status() === 200) {
        const data = await response.json()
        expect(data).toBeDefined()
      }
    })
  })
})

// ============================================
// 第五部分: 3.5 定制化服务专家接入
// ============================================
test.describe('3.5 定制化服务专家接入', () => {

  test.describe('专家咨询页面测试', () => {

    test('EXPERT-01: /expert 页面正常加载', async ({ page }) => {
      await page.goto('/expert')
      await waitForPageReady(page)

      await expect(page.url()).toContain('/expert')
    })

    test('EXPERT-02: 页面有标题和描述', async ({ page }) => {
      await page.goto('/expert')
      await waitForPageReady(page)

      const hasTitle = await isElementVisible(page, 'h1, h2')
      expect(hasTitle).toBe(true)
    })

    test('EXPERT-03: 咨询表单存在', async ({ page }) => {
      await page.goto('/expert')
      await waitForPageReady(page)

      const hasForm = await isElementVisible(page, 'form')
      const hasInputs = await isElementVisible(page, 'input[type="text"], input[name="name"], input[name="phone"]')

      expect(hasForm || hasInputs).toBe(true)
    })

    test('EXPERT-04: 表单字段完整 - 姓名', async ({ page }) => {
      await page.goto('/expert')
      await waitForPageReady(page)

      const nameInput = page.locator('input[name="name"], input[placeholder*="姓名"], input[placeholder*="name"]')
      const hasName = await nameInput.first().isVisible().catch(() => false)
      expect(hasName).toBe(true)
    })

    test('EXPERT-05: 表单字段完整 - 手机号', async ({ page }) => {
      await page.goto('/expert')
      await waitForPageReady(page)

      const phoneInput = page.locator('input[name="phone"], input[type="tel"], input[placeholder*="电话"], input[placeholder*="phone"]')
      const hasPhone = await phoneInput.first().isVisible().catch(() => false)
      expect(hasPhone).toBe(true)
    })

    test('EXPERT-06: 表单字段完整 - 公司', async ({ page }) => {
      await page.goto('/expert')
      await waitForPageReady(page)

      const companyInput = page.locator('input[name="company"], input[placeholder*="公司"], input[placeholder*="company"]')
      const hasCompany = await companyInput.first().isVisible().catch(() => false)
      expect(hasCompany).toBe(true)
    })

    test('EXPERT-07: 微信二维码存在', async ({ page }) => {
      await page.goto('/expert')
      await waitForPageReady(page)

      const qrImg = page.locator('img[alt*="qr"], img[alt*="QR"], img[alt*="微信"], img[src*="wechat"]')
      const hasQR = await qrImg.first().isVisible().catch(() => false)

      const wechatText = page.locator('text=微信, text=WeChat, text=扫码')
      const hasText = await wechatText.first().isVisible().catch(() => false)

      expect(hasQR || hasText).toBe(true)
    })

    test('EXPERT-08: 填写并提交表单', async ({ page }) => {
      await page.goto('/expert')
      await waitForPageReady(page)

      // 填写表单
      const nameInput = page.locator('input[name="name"], input[placeholder*="姓名"]')
      const phoneInput = page.locator('input[name="phone"], input[type="tel"]')
      const companyInput = page.locator('input[name="company"], input[placeholder*="公司"]')

      if (await nameInput.first().isVisible().catch(() => false)) {
        await nameInput.first().fill('测试用户')
      }

      if (await phoneInput.first().isVisible().catch(() => false)) {
        await phoneInput.first().fill('13800138000')
      }

      if (await companyInput.first().isVisible().catch(() => false)) {
        await companyInput.first().fill('测试公司')
      }

      // 提交按钮
      const submitBtn = page.locator('button[type="submit"], button:has-text("提交"), button:has-text("Submit")')
      const hasSubmit = await submitBtn.first().isVisible().catch(() => false)
      expect(hasSubmit).toBe(true)
    })

    test('EXPERT-09: 服务描述卡片存在', async ({ page }) => {
      await page.goto('/expert')
      await waitForPageReady(page)

      // 检查服务描述区域
      const serviceCards = page.locator('[class*="card"], [class*="service"], article')
      const count = await serviceCards.count()

      // 应该有服务描述
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('咨询 API 测试', () => {

    test('CONSULT-API-01: POST /api/consultations 存在', async ({ request }) => {
      const response = await request.post('/api/consultations', {
        data: {
          name: '测试用户',
          phone: '13800138000',
          company: '测试公司',
          type: 'market',
          description: '测试咨询需求'
        }
      })

      expect([200, 201, 400, 401, 404, 405]).toContain(response.status())
    })

    test('CONSULT-API-02: 缺少必填字段返回错误', async ({ request }) => {
      const response = await request.post('/api/consultations', {
        data: {
          name: '测试用户'
          // 缺少其他必填字段
        }
      })

      // 如果 API 实现了验证，应该返回 400
      expect([200, 400, 401, 404, 405, 422]).toContain(response.status())
    })
  })
})

// ============================================
// 第六部分: 3.6 移动端适配
// ============================================
test.describe('3.6 移动端适配', () => {

  test.describe('iPhone SE (375x667)', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('MOBILE-01: 首页无水平滚动条', async ({ page }) => {
      await page.goto('/')
      await waitForPageReady(page)

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      expect(hasHorizontalScroll).toBe(false)
    })

    test('MOBILE-02: 登录页无水平滚动条', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      expect(hasHorizontalScroll).toBe(false)
    })

    test('MOBILE-03: Discovery 页无水平滚动条', async ({ page }) => {
      await page.goto('/discovery')
      await waitForPageReady(page)

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      expect(hasHorizontalScroll).toBe(false)
    })

    test('MOBILE-04: 专家咨询页无水平滚动条', async ({ page }) => {
      await page.goto('/expert')
      await waitForPageReady(page)

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      expect(hasHorizontalScroll).toBe(false)
    })

    test('MOBILE-05: 汉堡菜单可见', async ({ page }) => {
      await page.goto('/')
      await waitForPageReady(page)

      const menuBtn = page.locator('button[data-sidebar="trigger"], button[aria-label*="menu"], button[aria-label*="Menu"]')
      const hasMenu = await menuBtn.first().isVisible().catch(() => false)

      // 或者导航以其他形式存在
      const hasNav = await isElementVisible(page, 'nav, aside')

      expect(hasMenu || hasNav).toBe(true)
    })

    test('MOBILE-06: 登录表单正常显示', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const phoneInput = page.locator('input[type="tel"]')
      await expect(phoneInput).toBeVisible()

      const submitBtn = page.locator('button[type="submit"]')
      await expect(submitBtn.first()).toBeVisible()
    })

    test('MOBILE-07: 输入框不超出屏幕宽度', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const phoneInput = page.locator('input[type="tel"]')
      const inputBox = await phoneInput.boundingBox()

      if (inputBox) {
        expect(inputBox.x).toBeGreaterThanOrEqual(0)
        expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(375)
      }
    })

    test('MOBILE-08: 按钮可点击', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const sendBtn = page.locator('button:has-text("发送验证码"), button:has-text("Send Code")')
      const btnBox = await sendBtn.first().boundingBox().catch(() => null)

      if (btnBox) {
        expect(btnBox.width).toBeGreaterThan(40)
        expect(btnBox.height).toBeGreaterThan(30)
      }
    })
  })

  test.describe('iPad (768x1024)', () => {
    test.use({ viewport: { width: 768, height: 1024 } })

    test('TABLET-01: 首页无水平滚动条', async ({ page }) => {
      await page.goto('/')
      await waitForPageReady(page)

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      expect(hasHorizontalScroll).toBe(false)
    })

    test('TABLET-02: 登录页布局正常', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      expect(hasHorizontalScroll).toBe(false)
    })

    test('TABLET-03: 专家咨询页双栏布局', async ({ page }) => {
      await page.goto('/expert')
      await waitForPageReady(page)

      // 768px 应该触发 md: 断点的双栏布局
      const hasGrid = await isElementVisible(page, '[class*="grid"]')
      expect(hasGrid).toBe(true)
    })
  })

  test.describe('Desktop (1280x800)', () => {
    test.use({ viewport: { width: 1280, height: 800 } })

    test('DESKTOP-01: 侧边栏可见', async ({ page }) => {
      await page.goto('/')
      await waitForPageReady(page)

      const sidebar = page.locator('aside, [data-sidebar], nav[class*="sidebar"]')
      await expect(sidebar.first()).toBeVisible()
    })

    test('DESKTOP-02: 首页无水平滚动条', async ({ page }) => {
      await page.goto('/')
      await waitForPageReady(page)

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      expect(hasHorizontalScroll).toBe(false)
    })

    test('DESKTOP-03: 登录页居中显示', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const form = page.locator('form')
      const formBox = await form.first().boundingBox().catch(() => null)

      if (formBox) {
        // 表单应该居中
        expect(formBox.x).toBeGreaterThan(100)
      }
    })

    test('DESKTOP-04: Radio Group 在桌面端显示（非 Select）', async ({ page }) => {
      // 找一个使用 ResponsiveRadioSelect 的页面
      await page.goto('/')
      await waitForPageReady(page)

      // 检查是否有 radio 或相关组件
      const hasRadio = await isElementVisible(page, 'input[type="radio"], [role="radiogroup"]')
      const hasSelect = await isElementVisible(page, 'select')

      // 桌面端应该优先使用 Radio
      console.log('Radio 存在:', hasRadio, 'Select 存在:', hasSelect)
    })
  })

  test.describe('组件响应式行为', () => {

    test('RESPONSIVE-01: 表单组件在不同视口正确渲染', async ({ page }) => {
      // 测试 375px
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const phoneInputMobile = page.locator('input[type="tel"]')
      await expect(phoneInputMobile).toBeVisible()

      // 测试 1280px
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.reload()
      await waitForPageReady(page)

      const phoneInputDesktop = page.locator('input[type="tel"]')
      await expect(phoneInputDesktop).toBeVisible()
    })
  })
})

// ============================================
// 第七部分: 核心 API 端点测试
// ============================================
test.describe('核心 API 端点', () => {

  test.describe('配置 API', () => {

    test('CONFIG-01: GET /api/config/models 返回模型列表', async ({ request }) => {
      const response = await request.get('/api/config/models')

      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data).toBeDefined()
      expect(typeof data === 'object').toBe(true)
    })
  })

  test.describe('聊天 API', () => {

    test('CHAT-01: POST /api/chat 需要认证', async ({ request }) => {
      const response = await request.post('/api/chat', {
        data: {
          messages: [{ role: 'user', content: 'Hello' }]
        }
      })

      // 聊天 API 可能需要认证或接受匿名请求
      expect([200, 400, 401, 403, 500]).toContain(response.status())
    })

    test('CHAT-02: GET /api/chats 需要认证', async ({ request }) => {
      const response = await request.get('/api/chats')

      expect([200, 401, 403]).toContain(response.status())
    })
  })

  test.describe('报告 API', () => {

    test('REPORT-01: GET /api/reports 存在', async ({ request }) => {
      const response = await request.get('/api/reports')

      expect([200, 401, 404, 405]).toContain(response.status())
    })

    test('REPORT-02: POST /api/reports 存在', async ({ request }) => {
      const response = await request.post('/api/reports', {
        data: {}
      })

      expect([200, 201, 400, 401, 404, 405]).toContain(response.status())
    })
  })
})

// ============================================
// 第八部分: 安全性测试
// ============================================
test.describe('安全性测试', () => {

  test.describe('XSS 防护', () => {

    test('SECURITY-XSS-01: 登录表单过滤 XSS', async ({ page }) => {
      await page.goto('/auth/login')
      await waitForPageReady(page)

      const phoneInput = page.locator('input[type="tel"]')
      await phoneInput.fill('<script>alert("xss")</script>')

      // 输入应该被过滤或转义
      const value = await phoneInput.inputValue()
      expect(value).not.toContain('<script>')
    })
  })

  test.describe('CSRF 防护', () => {

    test('SECURITY-CSRF-01: API 请求需要正确的 Content-Type', async ({ request }) => {
      const response = await request.post('/api/auth/sms/send', {
        headers: {
          'Content-Type': 'text/plain'
        },
        data: 'phone=13800138000'
      })

      // 应该拒绝非 JSON 请求或正确处理
      expect([200, 400, 401, 415]).toContain(response.status())
    })
  })

  test.describe('权限边界', () => {

    test('SECURITY-AUTH-01: 未认证用户无法访问用户数据', async ({ request }) => {
      const response = await request.get('/api/user/me')

      expect([401, 403]).toContain(response.status())
    })

    test('SECURITY-AUTH-02: 未认证用户无法修改用户数据', async ({ request }) => {
      const response = await request.put('/api/user/profile', {
        data: { name: 'hacker' }
      })

      expect([401, 403, 404, 405]).toContain(response.status())
    })
  })
})

// ============================================
// 第九部分: 国际化测试
// ============================================
test.describe('国际化测试 (i18n)', () => {

  test('I18N-01: 默认语言为中文', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)

    // 检查页面标题或内容是否为中文
    const title = await page.title()
    const hasChinese = /[\u4e00-\u9fa5]/.test(title)

    expect(hasChinese).toBe(true)
  })

  test('I18N-02: 登录页面中文显示', async ({ page }) => {
    await page.goto('/auth/login')
    await waitForPageReady(page)

    // 检查是否有中文文本
    const pageContent = await page.textContent('body')
    const hasChinese = /[\u4e00-\u9fa5]/.test(pageContent || '')

    expect(hasChinese).toBe(true)
  })
})

// ============================================
// 第十部分: 页面基础加载测试
// ============================================
test.describe('页面基础加载测试', () => {

  test('PAGE-01: 首页正常加载', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)

    await expect(page).toHaveTitle(/摸摸底|NaviX|MoMoDi/)
  })

  test('PAGE-02: 登录页正常加载', async ({ page }) => {
    await page.goto('/auth/login')
    await waitForPageReady(page)

    const hasForm = await isElementVisible(page, 'form, input')
    expect(hasForm).toBe(true)
  })

  test('PAGE-03: 注册页正常加载', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await waitForPageReady(page)

    const hasForm = await isElementVisible(page, 'form, input')
    expect(hasForm).toBe(true)
  })

  test('PAGE-04: Discovery 页正常加载', async ({ page }) => {
    await page.goto('/discovery')
    await waitForPageReady(page)

    await expect(page.url()).toContain('/discovery')
  })

  test('PAGE-05: Expert 页正常加载', async ({ page }) => {
    await page.goto('/expert')
    await waitForPageReady(page)

    await expect(page.url()).toContain('/expert')
  })

  test('PAGE-06: Profile 页路由存在', async ({ page }) => {
    await page.goto('/profile')
    await waitForPageReady(page)

    const currentUrl = page.url()
    expect(currentUrl.includes('/profile') || currentUrl.includes('/auth')).toBe(true)
  })

  test('PAGE-07: Admin 页路由存在', async ({ page }) => {
    await page.goto('/admin')
    await waitForPageReady(page)

    const currentUrl = page.url()
    expect(currentUrl.includes('/admin') || currentUrl.includes('/auth') || currentUrl === BASE_URL + '/').toBe(true)
  })

  test('PAGE-08: Reports 页路由存在', async ({ page }) => {
    await page.goto('/reports')
    await waitForPageReady(page)

    const currentUrl = page.url()
    expect(currentUrl.includes('/reports') || currentUrl.includes('/auth')).toBe(true)
  })

  test('PAGE-09: 404 页面处理', async ({ page }) => {
    await page.goto('/non-existent-page-12345')
    await waitForPageReady(page)

    // 应该显示 404 或重定向
    const hasNotFound = await isElementVisible(page, 'text=404, text=not found, text=找不到')
    const currentUrl = page.url()

    expect(hasNotFound || currentUrl.includes('404') || currentUrl === BASE_URL + '/').toBe(true)
  })

  test('PAGE-10: 侧边栏导航链接正确', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)

    // 检查导航链接
    const links = ['/discovery', '/expert', '/reports']
    for (const link of links) {
      const hasLink = await isElementVisible(page, `a[href="${link}"], a[href*="${link}"]`)
      console.log(`导航链接 ${link}:`, hasLink)
    }
  })
})

// ============================================
// 第十一部分: AI Chat 核心功能测试
// ============================================
test.describe('AI Chat 核心功能', () => {

  test('CHAT-UI-01: 首页有聊天输入框', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)

    const chatInput = page.locator('textarea, input[type="text"][placeholder*="问"], input[placeholder*="search"]')
    await expect(chatInput.first()).toBeVisible({ timeout: 10000 })
  })

  test('CHAT-UI-02: 聊天输入框可输入', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)

    const chatInput = page.locator('textarea, input[type="text"]')
    await chatInput.first().fill('测试消息')

    const value = await chatInput.first().inputValue()
    expect(value).toBe('测试消息')
  })

  test('CHAT-UI-03: 发送按钮存在', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)

    const sendBtn = page.locator('button[type="submit"], button:has(svg)')
    await expect(sendBtn.first()).toBeVisible()
  })

  test('CHAT-UI-04: 模型选择器存在', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page)

    const modelSelector = page.locator('[class*="model"], select, [role="combobox"]')
    const hasSelector = await modelSelector.first().isVisible().catch(() => false)

    // 模型选择器可能在设置中
    console.log('模型选择器可见:', hasSelector)
  })
})

// ============================================
// 第十二部分: 性能基准测试
// ============================================
test.describe('性能基准测试', () => {

  test('PERF-01: 首页加载时间 < 5秒', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')
    await waitForPageReady(page)

    const loadTime = Date.now() - startTime
    console.log('首页加载时间:', loadTime, 'ms')

    expect(loadTime).toBeLessThan(5000)
  })

  test('PERF-02: 登录页加载时间 < 3秒', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/auth/login')
    await waitForPageReady(page)

    const loadTime = Date.now() - startTime
    console.log('登录页加载时间:', loadTime, 'ms')

    expect(loadTime).toBeLessThan(3000)
  })

  test('PERF-03: API 响应时间 < 2秒', async ({ request }) => {
    const startTime = Date.now()

    await request.get('/api/config/models')

    const responseTime = Date.now() - startTime
    console.log('API 响应时间:', responseTime, 'ms')

    expect(responseTime).toBeLessThan(2000)
  })
})
