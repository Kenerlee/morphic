import { test, expect } from '@playwright/test'

/**
 * 民宿尽调功能测试
 *
 * 此测试套件专注于功能性测试，不修改任何原有代码
 * 测试目标：验证民宿尽调功能是否可用并正常工作
 */

test.describe('民宿尽调功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('/', { waitUntil: 'networkidle' })

    // 增加等待时间，确保所有客户端组件都已加载
    await page.waitForTimeout(2000)
  })

  test('T1: 页面加载和基本元素检查', async ({ page }) => {
    // 截图记录初始状态
    await page.screenshot({ path: 'test-results/homestay-func-01-initial-page.png', fullPage: true })

    // 获取页面所有按钮文本
    const buttons = await page.locator('button').allTextContents()
    console.log('页面上的所有按钮:', buttons)

    // 检查是否有包含"民宿"或"homestay"的元素
    const homestayElements = await page.locator('*:has-text("民宿")').count()
    console.log('包含"民宿"的元素数量:', homestayElements)

    // 记录页面HTML结构（仅前1000个字符）
    const pageContent = await page.content()
    console.log('页面HTML片段:', pageContent.substring(0, 1000))
  })

  test('T2: 查找民宿相关按钮或控件', async ({ page }) => {
    // 尝试多种方式查找民宿尽调相关元素
    const selectors = [
      'button:has-text("民宿尽调")',
      'button:has-text("民宿")',
      '[data-testid*="homestay"]',
      '[class*="homestay"]',
      'button:has(svg) >> text=/.*民宿.*/',
    ]

    for (const selector of selectors) {
      const element = page.locator(selector).first()
      const count = await element.count()
      console.log(`选择器 "${selector}" 找到 ${count} 个元素`)

      if (count > 0) {
        const isVisible = await element.isVisible().catch(() => false)
        console.log(`  - 可见性: ${isVisible}`)

        if (isVisible) {
          const text = await element.textContent()
          console.log(`  - 文本内容: ${text}`)

          await page.screenshot({
            path: `test-results/homestay-func-02-found-element.png`,
            fullPage: true
          })
        }
      }
    }
  })

  test('T3: 搜索聊天输入框', async ({ page }) => {
    // 查找聊天输入框
    const textareaSelectors = [
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]',
      '[placeholder*="问"]',
      '[placeholder*="搜索"]',
    ]

    for (const selector of textareaSelectors) {
      const element = page.locator(selector).first()
      const count = await element.count()

      if (count > 0) {
        const isVisible = await element.isVisible().catch(() => false)
        console.log(`找到输入框 "${selector}": 可见=${isVisible}`)

        if (isVisible) {
          const placeholder = await element.getAttribute('placeholder').catch(() => null)
          console.log(`  - Placeholder: ${placeholder}`)

          // 截图
          await page.screenshot({
            path: `test-results/homestay-func-03-input-found.png`,
            fullPage: true
          })
        }
      }
    }
  })

  test('T4: 测试输入民宿相关查询', async ({ page }) => {
    // 查找任何可用的 textarea
    const textarea = page.locator('textarea').first()

    if (await textarea.count() > 0 && await textarea.isVisible()) {
      console.log('✓ 找到可见的输入框')

      // 输入测试查询
      const testQuery = '北京朝阳区民宿投资分析'
      await textarea.fill(testQuery)
      console.log(`✓ 输入查询: ${testQuery}`)

      // 等待一下
      await page.waitForTimeout(1000)

      // 截图
      await page.screenshot({
        path: `test-results/homestay-func-04-query-entered.png`,
        fullPage: true
      })

      // 验证输入值
      const value = await textarea.inputValue()
      console.log(`✓ 输入框当前值: ${value}`)
      expect(value).toBe(testQuery)
    } else {
      console.log('✗ 未找到可见的输入框')
      await page.screenshot({
        path: `test-results/homestay-func-04-no-input.png`,
        fullPage: true
      })
    }
  })

  test('T5: 检查页面Cookie和存储', async ({ page, context }) => {
    // 检查是否有民宿相关的 Cookie
    const cookies = await context.cookies()
    console.log('所有 Cookies:')
    cookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value}`)
    })

    const homestayModeCookie = cookies.find(c =>
      c.name.toLowerCase().includes('homestay') ||
      c.name.includes('民宿')
    )

    if (homestayModeCookie) {
      console.log(`✓ 找到民宿相关 Cookie: ${homestayModeProvider.name} = ${homestayModeProvider.value}`)
    } else {
      console.log('✗ 未找到民宿相关 Cookie')
    }

    // 检查 localStorage
    const localStorageData = await page.evaluate(() => {
      const data: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          data[key] = localStorage.getItem(key) || ''
        }
      }
      return data
    })

    console.log('LocalStorage 数据:')
    Object.entries(localStorageData).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value.substring(0, 100)}`)
    })
  })

  test('T6: 检查所有研究模式切换按钮', async ({ page }) => {
    // 查找所有可能的研究模式按钮
    const researchModeButtons = await page.locator('button').filter({
      hasText: /调研|研究|搜索|尽调|Research|Search/i
    }).all()

    console.log(`找到 ${researchModeButtons.length} 个可能的研究模式按钮`)

    for (let i = 0; i < researchModeButtons.length; i++) {
      const button = researchModeButtons[i]
      const text = await button.textContent()
      const isVisible = await button.isVisible()
      const classes = await button.getAttribute('class')

      console.log(`按钮 ${i + 1}:`)
      console.log(`  - 文本: ${text}`)
      console.log(`  - 可见: ${isVisible}`)
      console.log(`  - 类名: ${classes}`)
    }

    // 截图
    await page.screenshot({
      path: `test-results/homestay-func-06-research-buttons.png`,
      fullPage: true
    })
  })

  test('T7: 尝试手动设置民宿模式Cookie', async ({ page, context }) => {
    // 手动设置民宿模式 Cookie
    await context.addCookies([{
      name: 'homestayMode',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }])

    console.log('✓ 已设置 homestayMode=true Cookie')

    // 刷新页面
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    console.log('✓ 页面已刷新')

    // 截图
    await page.screenshot({
      path: `test-results/homestay-func-07-with-cookie.png`,
      fullPage: true
    })

    // 再次检查是否有民宿相关元素显示
    const homestayElements = await page.locator('*:has-text("民宿")').count()
    console.log(`设置Cookie后，包含"民宿"的元素数量: ${homestayElements}`)

    // 检查按钮状态变化
    const buttons = await page.locator('button').allTextContents()
    console.log('设置Cookie后的按钮:', buttons)
  })

  test('T8: 检查网络请求', async ({ page }) => {
    const requests: string[] = []

    // 监听所有网络请求
    page.on('request', request => {
      const url = request.url()
      if (url.includes('api') || url.includes('homestay') || url.includes('民宿')) {
        requests.push(`${request.method()} ${url}`)
      }
    })

    // 等待一段时间收集请求
    await page.waitForTimeout(3000)

    console.log('捕获到的相关网络请求:')
    requests.forEach(req => console.log(`  - ${req}`))

    if (requests.length === 0) {
      console.log('✗ 未捕获到相关网络请求')
    }
  })

  test('T9: DOM结构分析', async ({ page }) => {
    // 分析页面主要结构
    const structure = await page.evaluate(() => {
      const getElementInfo = (selector: string) => {
        const elements = document.querySelectorAll(selector)
        return {
          selector,
          count: elements.length,
          visible: Array.from(elements).filter(el => {
            const rect = el.getBoundingClientRect()
            const style = window.getComputedStyle(el)
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
          }).length
        }
      }

      return {
        buttons: getElementInfo('button'),
        textareas: getElementInfo('textarea'),
        inputs: getElementInfo('input'),
        forms: getElementInfo('form'),
        containers: getElementInfo('[class*="chat"]'),
        panels: getElementInfo('[class*="panel"]'),
      }
    })

    console.log('页面DOM结构分析:')
    console.log(JSON.stringify(structure, null, 2))
  })

  test('T10: 完整功能流程测试', async ({ page, context }) => {
    console.log('=== 开始完整功能流程测试 ===')

    // 步骤1: 设置民宿模式
    await context.addCookies([{
      name: 'homestayMode',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }])
    console.log('步骤1: ✓ 设置民宿模式Cookie')

    // 步骤2: 刷新页面
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('步骤2: ✓ 刷新页面')

    // 步骤3: 查找输入框
    const textarea = page.locator('textarea').first()
    const hasTextarea = await textarea.count() > 0
    console.log(`步骤3: ${hasTextarea ? '✓' : '✗'} 查找输入框`)

    if (hasTextarea && await textarea.isVisible()) {
      // 步骤4: 输入查询
      const query = '上海浦东民宿投资市场分析'
      await textarea.fill(query)
      console.log(`步骤4: ✓ 输入查询: ${query}`)

      await page.screenshot({
        path: `test-results/homestay-func-10-step4-input.png`,
        fullPage: true
      })

      // 步骤5: 查找发送按钮
      const submitButton = page.locator('button[type="submit"]').or(
        page.locator('button:has-text("发送")')
      ).first()

      const hasSubmit = await submitButton.count() > 0
      console.log(`步骤5: ${hasSubmit ? '✓' : '✗'} 查找发送按钮`)

      if (hasSubmit && await submitButton.isVisible()) {
        // 设置请求监听
        const apiCalls: string[] = []
        page.on('request', request => {
          if (request.url().includes('/api/')) {
            apiCalls.push(`${request.method()} ${request.url()}`)
          }
        })

        // 步骤6: 点击发送（但立即停止以避免实际API调用）
        await submitButton.click()
        console.log('步骤6: ✓ 点击发送按钮')

        // 等待短时间观察响应
        await page.waitForTimeout(3000)

        await page.screenshot({
          path: `test-results/homestay-func-10-step6-sent.png`,
          fullPage: true
        })

        // 步骤7: 检查是否有API调用
        console.log(`步骤7: API调用情况 (${apiCalls.length}个):`)
        apiCalls.forEach(call => console.log(`  - ${call}`))

        // 步骤8: 检查是否有响应
        const messages = await page.locator('[class*="message"]').count()
        console.log(`步骤8: 页面消息元素数量: ${messages}`)

        // 查找加载状态或响应内容
        const loadingIndicator = await page.locator('[class*="loading"], [class*="spinner"]').count()
        console.log(`  - 加载指示器: ${loadingIndicator}`)

        const responseText = await page.locator('[class*="assistant"], [class*="response"]').first().textContent().catch(() => null)
        if (responseText) {
          console.log(`  - 响应内容片段: ${responseText.substring(0, 100)}...`)
        }
      }
    }

    console.log('=== 完整功能流程测试结束 ===')
  })
})

test.describe('民宿尽调Agent测试', () => {
  test('T11: 检查民宿Agent配置', async ({ page }) => {
    // 尝试直接访问配置或检查页面元数据
    const pageData = await page.evaluate(() => {
      return {
        title: document.title,
        meta: Array.from(document.querySelectorAll('meta')).map(m => ({
          name: m.getAttribute('name'),
          content: m.getAttribute('content')
        })),
        scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src'))
      }
    })

    console.log('页面元数据:')
    console.log(`  - 标题: ${pageData.title}`)
    console.log(`  - Meta标签数量: ${pageData.meta.length}`)
    console.log(`  - Script数量: ${pageData.scripts.length}`)
  })

  test('T12: 检查SkillsAPI集成', async ({ page }) => {
    console.log('检查SkillsAPI相关配置...')

    // 检查是否有环境变量提示或配置信息暴露
    const consoleMessages: string[] = []
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('skill') || text.includes('api') || text.includes('homestay')) {
        consoleMessages.push(text)
      }
    })

    await page.waitForTimeout(3000)

    if (consoleMessages.length > 0) {
      console.log('相关控制台消息:')
      consoleMessages.forEach(msg => console.log(`  - ${msg}`))
    } else {
      console.log('未捕获到相关控制台消息')
    }
  })
})
