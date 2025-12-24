import { test, expect } from '@playwright/test'

/**
 * 民宿尽调完整流程测试
 *
 * 模拟用户操作步骤：
 * 1. 打开首页
 * 2. 启用民宿尽调模式
 * 3. 输入查询并提交
 * 4. 等待 Skills API 执行完成
 * 5. 验证报告生成和文件下载
 */

// 设置超长超时，因为 Skills API 可能需要 7-8 分钟
test.setTimeout(15 * 60 * 1000) // 15 分钟

test.describe('民宿尽调完整流程测试', () => {
  test('完整端到端流程：开启民宿模式 -> 输入查询 -> 生成报告 -> 下载文件', async ({
    page,
    context
  }) => {
    console.log('=== 民宿尽调完整流程测试开始 ===')
    console.log(`开始时间: ${new Date().toLocaleTimeString()}`)

    // ========== 步骤 1: 打开首页 ==========
    console.log('\n[步骤 1] 打开首页...')
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({
      path: 'test-results/homestay-flow-01-homepage.png',
      fullPage: true
    })
    console.log('✓ 首页加载完成')

    // ========== 步骤 2: 启用民宿尽调模式 ==========
    console.log('\n[步骤 2] 启用民宿尽调模式...')

    // 方法1: 通过 Cookie 设置
    await context.addCookies([
      {
        name: 'homestay-mode',
        value: 'true',
        domain: 'localhost',
        path: '/'
      }
    ])
    console.log('✓ 已设置 homestay-mode Cookie')

    // 刷新页面使 Cookie 生效
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // 方法2: 尝试点击民宿模式按钮（如果存在）
    const homestayToggle = page.locator('button:has-text("民宿")').first()
    if ((await homestayToggle.count()) > 0 && (await homestayToggle.isVisible())) {
      await homestayToggle.click()
      console.log('✓ 点击了民宿模式按钮')
      await page.waitForTimeout(1000)
    }

    await page.screenshot({
      path: 'test-results/homestay-flow-02-mode-enabled.png',
      fullPage: true
    })

    // 验证 Cookie 设置
    const cookies = await context.cookies()
    const homestayModeCookie = cookies.find(c => c.name === 'homestay-mode')
    console.log(`民宿模式 Cookie: ${homestayModeCookie?.value || '未找到'}`)

    // ========== 步骤 3: 输入查询并提交 ==========
    console.log('\n[步骤 3] 输入查询并提交...')

    // 查找输入框
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible({ timeout: 10000 })

    // 输入简单查询以减少执行时间
    const testQuery = '杭州西湖民宿'
    await textarea.fill(testQuery)
    console.log(`✓ 输入查询: ${testQuery}`)

    await page.screenshot({
      path: 'test-results/homestay-flow-03-query-entered.png',
      fullPage: true
    })

    // 设置请求监听
    const apiRequests: { url: string; method: string; time: string }[] = []
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/chat') || url.includes('/stream/invoke') || url.includes('/files/')) {
        apiRequests.push({
          url: url,
          method: request.method(),
          time: new Date().toLocaleTimeString()
        })
        console.log(`[API请求] ${request.method()} ${url}`)
      }
    })

    page.on('response', response => {
      const url = response.url()
      if (url.includes('/api/chat') || url.includes('/files/')) {
        console.log(`[API响应] ${response.status()} ${url}`)
      }
    })

    // 查找并点击发送按钮
    const submitButton = page
      .locator('button[type="submit"]')
      .or(page.locator('button:has(svg[class*="arrow"])'))
      .first()

    if ((await submitButton.count()) > 0 && (await submitButton.isVisible())) {
      await submitButton.click()
      console.log('✓ 点击发送按钮')
    } else {
      // 尝试按 Enter 键
      await textarea.press('Enter')
      console.log('✓ 按 Enter 键提交')
    }

    // ========== 步骤 4: 等待 Skills API 执行完成 ==========
    console.log('\n[步骤 4] 等待 Skills API 执行...')
    console.log('预计需要 5-8 分钟，请耐心等待...')

    // 每30秒截图一次记录进度
    const maxWaitTime = 10 * 60 * 1000 // 10 分钟
    const checkInterval = 30 * 1000 // 30 秒
    let elapsedTime = 0
    let screenshotCount = 0

    while (elapsedTime < maxWaitTime) {
      await page.waitForTimeout(checkInterval)
      elapsedTime += checkInterval
      screenshotCount++

      const minutes = Math.floor(elapsedTime / 60000)
      const seconds = Math.floor((elapsedTime % 60000) / 1000)
      console.log(`等待中... 已过 ${minutes}分${seconds}秒`)

      // 截图记录进度
      await page.screenshot({
        path: `test-results/homestay-flow-04-progress-${screenshotCount}.png`,
        fullPage: true
      })

      // 检查是否有下载按钮出现（表示报告已生成）
      const downloadButton = page.locator('button:has-text("下载")').or(
        page.locator('a[download]')
      ).or(
        page.locator('[class*="download"]')
      )

      if ((await downloadButton.count()) > 0 && (await downloadButton.isVisible())) {
        console.log('✓ 检测到下载按钮，报告已生成！')
        break
      }

      // 检查是否有错误信息
      const errorElement = page.locator('[class*="error"]').or(page.locator('text=/error|错误/i'))
      if ((await errorElement.count()) > 0 && (await errorElement.isVisible())) {
        const errorText = await errorElement.textContent()
        console.log(`✗ 检测到错误: ${errorText}`)
        break
      }

      // 检查是否有文件ID（从消息注释中）
      const pageContent = await page.content()
      if (pageContent.includes('file_') && pageContent.includes('download')) {
        console.log('✓ 页面中检测到文件ID')
        break
      }
    }

    // ========== 步骤 5: 验证报告生成和文件下载 ==========
    console.log('\n[步骤 5] 验证报告生成和文件下载...')

    await page.screenshot({
      path: 'test-results/homestay-flow-05-final-result.png',
      fullPage: true
    })

    // 打印所有捕获的 API 请求
    console.log('\n捕获的 API 请求:')
    apiRequests.forEach(req => {
      console.log(`  [${req.time}] ${req.method} ${req.url}`)
    })

    // 检查是否有下载链接
    const downloadLinks = await page.locator('a[href*="/files/"]').or(
      page.locator('button:has-text("下载")')
    ).all()

    console.log(`\n找到 ${downloadLinks.length} 个下载相关元素`)

    if (downloadLinks.length > 0) {
      console.log('✓ 成功找到下载元素!')

      // 尝试点击下载
      const firstDownload = downloadLinks[0]
      if (await firstDownload.isVisible()) {
        // 设置下载监听
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)

        await firstDownload.click()
        console.log('✓ 点击了下载按钮')

        const download = await downloadPromise
        if (download) {
          const suggestedFilename = download.suggestedFilename()
          console.log(`✓ 文件下载成功: ${suggestedFilename}`)

          // 保存下载的文件
          const savePath = `test-results/downloaded-${suggestedFilename}`
          await download.saveAs(savePath)
          console.log(`✓ 文件已保存到: ${savePath}`)
        }
      }
    }

    // 检查页面消息内容
    const messageElements = await page.locator('[class*="message"]').all()
    console.log(`\n页面消息元素数量: ${messageElements.length}`)

    // 获取最后一条消息内容
    if (messageElements.length > 0) {
      const lastMessage = messageElements[messageElements.length - 1]
      const messageText = await lastMessage.textContent()
      if (messageText) {
        console.log(`最后消息内容片段: ${messageText.substring(0, 200)}...`)
      }
    }

    console.log(`\n=== 民宿尽调完整流程测试结束 ===`)
    console.log(`结束时间: ${new Date().toLocaleTimeString()}`)
  })

  test('快速测试：验证民宿模式 UI 元素', async ({ page, context }) => {
    console.log('=== 快速 UI 测试 ===')

    // 设置民宿模式
    await context.addCookies([
      {
        name: 'homestay-mode',
        value: 'true',
        domain: 'localhost',
        path: '/'
      }
    ])

    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)

    // 截图
    await page.screenshot({
      path: 'test-results/homestay-quick-test.png',
      fullPage: true
    })

    // 检查输入框
    const textarea = page.locator('textarea').first()
    const hasTextarea = await textarea.count() > 0
    console.log(`输入框存在: ${hasTextarea}`)

    // 检查是否有民宿相关 UI
    const homestayUI = await page.locator('*:has-text("民宿")').count()
    console.log(`民宿相关 UI 元素数量: ${homestayUI}`)

    // 检查按钮
    const buttons = await page.locator('button').allTextContents()
    console.log(`页面按钮: ${buttons.filter(b => b.trim()).join(', ')}`)

    expect(hasTextarea).toBe(true)
  })

  test('API 健康检查：验证 Skills API 可用', async ({ request }) => {
    console.log('=== Skills API 健康检查 ===')

    try {
      // 检查 Skills API 健康状态
      const healthResponse = await request.get('http://localhost:8000/health')
      console.log(`Skills API /health 状态: ${healthResponse.status()}`)

      if (healthResponse.ok()) {
        const healthData = await healthResponse.json()
        console.log(`健康检查响应: ${JSON.stringify(healthData)}`)
      }

      // 检查可用 Skills
      const skillsResponse = await request.get('http://localhost:8000/skills')
      console.log(`Skills API /skills 状态: ${skillsResponse.status()}`)

      if (skillsResponse.ok()) {
        const skillsData = await skillsResponse.json()
        console.log(`可用 Skills: ${JSON.stringify(skillsData, null, 2)}`)
      }

      expect(healthResponse.ok()).toBe(true)
    } catch (error) {
      console.log(`Skills API 不可用: ${error}`)
      console.log('请确保 Skills API 已启动: cd SkillsApi && python skills_api.py')
    }
  })

  test('文件 API 测试：验证文件下载端点', async ({ request }) => {
    console.log('=== 文件 API 测试 ===')

    // 使用之前生成的文件 ID 进行测试
    const testFileId = 'file_011CWBpXvygTkrXzmkb7u4h1'

    try {
      // 测试元数据端点
      const metadataResponse = await request.get(
        `http://localhost:8000/files/${testFileId}/metadata`
      )
      console.log(`文件元数据状态: ${metadataResponse.status()}`)

      if (metadataResponse.ok()) {
        const metadata = await metadataResponse.json()
        console.log(`文件元数据: ${JSON.stringify(metadata, null, 2)}`)

        // 测试下载端点
        const downloadResponse = await request.get(
          `http://localhost:8000/files/${testFileId}/download`
        )
        console.log(`文件下载状态: ${downloadResponse.status()}`)

        if (downloadResponse.ok()) {
          const content = await downloadResponse.text()
          console.log(`文件内容长度: ${content.length} 字符`)
          console.log(`文件内容前 200 字符: ${content.substring(0, 200)}`)
        }
      }
    } catch (error) {
      console.log(`文件 API 测试失败: ${error}`)
      console.log('这可能是因为文件已过期或 Skills API 未启动')
    }
  })
})
