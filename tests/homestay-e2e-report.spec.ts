import { test, expect } from '@playwright/test'

/**
 * 民宿尽调端到端测试 - 重点测试调研报告返回
 *
 * 核心验证点：
 * 1. 用户能否点击"民宿尽调"按钮
 * 2. 用户能否输入查询并发送
 * 3. 系统是否返回调研报告
 * 4. 报告内容是否完整
 */

test.describe('民宿尽调调研报告返回测试', () => {
  test('完整流程：提交查询并验证返回调研报告', async ({ page }) => {
    console.log('=== 开始民宿尽调端到端测试 ===\n')

    // 步骤1: 访问首页
    console.log('步骤1: 访问首页...')
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('✓ 页面加载完成\n')

    await page.screenshot({
      path: 'test-results/e2e-step1-homepage.png',
      fullPage: true
    })

    // 步骤2: 查找并点击"民宿尽调"按钮
    console.log('步骤2: 查找"民宿尽调"按钮...')
    const homestayButton = page.locator('button:has-text("民宿尽调")')

    await expect(homestayButton).toBeVisible({ timeout: 10000 })
    console.log('✓ 找到"民宿尽调"按钮')

    const buttonText = await homestayButton.textContent()
    console.log(`  按钮文本: ${buttonText}`)

    // 点击按钮
    await homestayButton.click()
    await page.waitForTimeout(1000)
    console.log('✓ 已点击"民宿尽调"按钮\n')

    await page.screenshot({
      path: 'test-results/e2e-step2-clicked-button.png',
      fullPage: true
    })

    // 步骤3: 输入查询
    console.log('步骤3: 输入民宿投资查询...')
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible({ timeout: 5000 })

    const testQuery = '我想在杭州西湖区投资民宿，预算200万，请帮我做市场分析'
    await textarea.fill(testQuery)
    console.log(`✓ 输入查询: ${testQuery}\n`)

    await page.screenshot({
      path: 'test-results/e2e-step3-query-entered.png',
      fullPage: true
    })

    // 步骤4: 设置网络监听
    console.log('步骤4: 设置网络监听...')
    const apiRequests: any[] = []
    const apiResponses: any[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/')) {
        apiRequests.push({
          method: request.method(),
          url: url,
          timestamp: new Date().toISOString()
        })
        console.log(`  → 请求: ${request.method()} ${url}`)
      }
    })

    page.on('response', async response => {
      const url = response.url()
      if (url.includes('/api/')) {
        apiResponses.push({
          status: response.status(),
          url: url,
          timestamp: new Date().toISOString()
        })
        console.log(`  ← 响应: ${response.status()} ${url}`)
      }
    })

    console.log('✓ 网络监听已设置\n')

    // 步骤5: 点击发送按钮
    console.log('步骤5: 点击发送按钮...')
    const submitButton = page.locator('button[type="submit"]').first()
    await expect(submitButton).toBeVisible({ timeout: 5000 })

    await submitButton.click()
    console.log('✓ 已点击发送按钮')
    console.log('⏳ 等待AI响应...\n')

    await page.screenshot({
      path: 'test-results/e2e-step5-query-sent.png',
      fullPage: true
    })

    // 步骤6: 等待并检测响应
    console.log('步骤6: 等待调研报告返回...')

    // 等待消息出现（最多2分钟）
    let reportFound = false
    let attemptCount = 0
    const maxAttempts = 24 // 2分钟 (每次5秒)

    while (!reportFound && attemptCount < maxAttempts) {
      attemptCount++
      await page.waitForTimeout(5000)

      // 检查是否有用户消息
      const userMessages = await page.locator('[class*="user"]').count()

      // 检查是否有助手响应
      const assistantMessages = await page.locator('[class*="assistant"], [class*="ai"], [role="assistant"]').count()

      // 检查是否有任何文本内容出现
      const pageText = await page.textContent('body')
      const hasReportContent = pageText?.includes('分析') ||
                              pageText?.includes('市场') ||
                              pageText?.includes('投资') ||
                              pageText?.includes('建议')

      console.log(`  尝试 ${attemptCount}/${maxAttempts}: 用户消息=${userMessages}, 助手消息=${assistantMessages}, 内容检测=${hasReportContent}`)

      if (assistantMessages > 0 || hasReportContent) {
        reportFound = true
        console.log('✓ 检测到响应内容！\n')
        break
      }

      // 每隔10秒截图一次
      if (attemptCount % 2 === 0) {
        await page.screenshot({
          path: `test-results/e2e-step6-waiting-${attemptCount}.png`,
          fullPage: true
        })
      }
    }

    // 最终截图
    await page.screenshot({
      path: 'test-results/e2e-step6-final-state.png',
      fullPage: true
    })

    // 步骤7: 分析结果
    console.log('\n步骤7: 分析结果...')

    console.log(`\nAPI请求统计: ${apiRequests.length} 个`)
    apiRequests.forEach((req, idx) => {
      console.log(`  ${idx + 1}. ${req.method} ${req.url}`)
    })

    console.log(`\nAPI响应统计: ${apiResponses.length} 个`)
    apiResponses.forEach((res, idx) => {
      console.log(`  ${idx + 1}. [${res.status}] ${res.url}`)
    })

    // 获取页面所有文本内容
    const fullPageText = await page.textContent('body')
    console.log(`\n页面文本长度: ${fullPageText?.length || 0} 字符`)

    // 检查是否包含关键词
    const keywords = ['民宿', '投资', '分析', '市场', '建议', '风险', '收益', '竞争']
    const foundKeywords = keywords.filter(kw => fullPageText?.includes(kw))
    console.log(`\n关键词检测 (${foundKeywords.length}/${keywords.length}):`)
    foundKeywords.forEach(kw => console.log(`  ✓ ${kw}`))

    const missingKeywords = keywords.filter(kw => !fullPageText?.includes(kw))
    if (missingKeywords.length > 0) {
      console.log(`  ✗ 缺失: ${missingKeywords.join(', ')}`)
    }

    // 提取可能的报告内容片段
    console.log('\n尝试提取报告内容...')

    // 查找所有可能包含报告的元素
    const reportElements = await page.locator('div, p, article, section').all()
    let longestText = ''

    for (const element of reportElements) {
      const text = await element.textContent().catch(() => '')
      if (text && text.length > longestText.length && text.includes('民宿')) {
        longestText = text
      }
    }

    if (longestText.length > 100) {
      console.log(`\n找到疑似报告内容 (${longestText.length} 字符):`)
      console.log(longestText.substring(0, 500) + '...\n')
    } else {
      console.log('\n✗ 未找到明显的报告内容\n')
    }

    // 步骤8: 验证结果
    console.log('步骤8: 验证结果...\n')

    const validations = {
      '页面加载成功': true,
      '民宿尽调按钮可见': true,
      '成功输入查询': true,
      '成功发送请求': apiRequests.length > 0,
      '收到API响应': apiResponses.length > 0,
      '检测到报告内容': reportFound,
      '包含关键分析词汇': foundKeywords.length >= 4,
      '报告内容充足': longestText.length > 200
    }

    console.log('=== 验证结果 ===')
    Object.entries(validations).forEach(([key, value]) => {
      console.log(`${value ? '✓' : '✗'} ${key}`)
    })

    // 最终判断
    const allPassed = Object.values(validations).every(v => v)
    console.log(`\n=== 最终结论 ===`)
    if (allPassed) {
      console.log('✓✓✓ 民宿尽调功能完全正常，成功返回调研报告！')
    } else {
      console.log('✗✗✗ 民宿尽调功能存在问题：')
      Object.entries(validations).forEach(([key, value]) => {
        if (!value) {
          console.log(`  - ${key}: 失败`)
        }
      })
    }

    console.log('\n=== 测试结束 ===')

    // 使用expect断言关键验证点
    expect(validations['成功发送请求'], 'API请求应该被发送').toBe(true)
    expect(validations['收到API响应'], '应该收到API响应').toBe(true)

    // 核心验证：是否返回了报告
    expect(validations['检测到报告内容'], '应该检测到调研报告内容').toBe(true)
  })

  test('验证报告结构和内容质量', async ({ page }) => {
    console.log('\n=== 开始报告质量测试 ===\n')

    // 复用上面的流程
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const homestayButton = page.locator('button:has-text("民宿尽调")')
    await homestayButton.click()
    await page.waitForTimeout(1000)

    const textarea = page.locator('textarea').first()
    await textarea.fill('北京朝阳区三里屯附近民宿投资可行性分析')

    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    // 等待响应（最多2分钟）
    await page.waitForTimeout(120000)

    await page.screenshot({
      path: 'test-results/e2e-quality-check.png',
      fullPage: true
    })

    // 检查报告应包含的章节
    const requiredSections = [
      '区位分析',
      '市场分析',
      '竞争',
      '投资',
      '风险',
      '建议'
    ]

    const pageText = await page.textContent('body')
    const foundSections: string[] = []

    for (const section of requiredSections) {
      if (pageText?.includes(section)) {
        foundSections.push(section)
        console.log(`✓ 找到章节: ${section}`)
      } else {
        console.log(`✗ 缺失章节: ${section}`)
      }
    }

    const sectionCoverage = (foundSections.length / requiredSections.length) * 100
    console.log(`\n章节覆盖率: ${sectionCoverage.toFixed(0)}%`)

    // 期望至少覆盖50%的必要章节
    expect(sectionCoverage).toBeGreaterThanOrEqual(50)
  })
})
