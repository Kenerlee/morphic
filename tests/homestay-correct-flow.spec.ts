import { test, expect } from '@playwright/test'

test('民宿尽调完整流程 - 正确顺序', async ({ page }) => {
  console.log('=== 开始民宿尽调完整测试（正确流程） ===\n')

  // 步骤1: 访问页面
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  console.log('✓ 步骤1: 页面加载完成')

  await page.screenshot({ path: 'test-results/flow-step1-loaded.png', fullPage: true })

  // 步骤2: 先输入查询（这是正确的顺序！）
  const input = page.locator('textarea').first()
  const testQuery = '我想在杭州西湖区投资民宿，预算200万，请给我做详细的市场分析和投资建议'
  await input.fill(testQuery)
  await page.waitForTimeout(500)
  console.log(`✓ 步骤2: 输入查询 - ${testQuery}`)

  await page.screenshot({ path: 'test-results/flow-step2-input.png', fullPage: true })

  // 步骤3: 点击民宿尽调按钮
  const homestayBtn = page.locator('button:has-text("民宿尽调")')
  await expect(homestayBtn).toBeVisible()
  await homestayBtn.click()
  await page.waitForTimeout(1000)
  console.log('✓ 步骤3: 点击民宿尽调按钮')

  await page.screenshot({ path: 'test-results/flow-step3-mode-selected.png', fullPage: true })

  // 步骤4: 检查Cookie是否设置
  const cookies = await page.context().cookies()
  const homestayModeCookie = cookies.find(c => c.name === 'homestayMode')
  console.log(`  Cookie状态: ${homestayModeCookie ? `${homestayModeCookie.name}=${homestayModeCookie.value}` : '未设置'}`)

  // 步骤5: 设置网络监听
  let apiRequestSent = false
  let apiResponseReceived = false
  let responseStatus = 0

  page.on('request', request => {
    if (request.url().includes('/api/chat')) {
      apiRequestSent = true
      console.log(`\n→ API请求发送: ${request.method()} ${request.url()}`)
    }
  })

  page.on('response', response => {
    if (response.url().includes('/api/chat')) {
      apiResponseReceived = true
      responseStatus = response.status()
      console.log(`← API响应收到: Status ${response.status()}`)
    }
  })

  // 步骤6: 点击发送按钮
  const sendBtn = page.locator('button[type="submit"]').first()

  // 验证按钮是启用的
  const isDisabled = await sendBtn.getAttribute('disabled')
  console.log(`\n✓ 步骤4: 发送按钮状态 - ${isDisabled === null ? '启用' : '禁用'}`)

  if (isDisabled !== null) {
    console.log('✗ 错误：发送按钮被禁用！')
    const inputValue = await input.inputValue()
    console.log(`  输入框内容: "${inputValue}" (长度: ${inputValue.length})`)
    await page.screenshot({ path: 'test-results/flow-error-disabled.png', fullPage: true })
    throw new Error('发送按钮被禁用，无法继续测试')
  }

  await sendBtn.click()
  console.log('✓ 步骤5: 点击发送按钮')
  console.log('⏳ 等待AI响应...\n')

  await page.screenshot({ path: 'test-results/flow-step5-sent.png', fullPage: true })

  // 步骤7: 等待并检测响应内容（最多2分钟）
  console.log('步骤6: 等待调研报告返回...')

  let reportDetected = false
  let reportContent = ''
  let attempts = 0
  const maxAttempts = 24 // 2分钟

  while (!reportDetected && attempts < maxAttempts) {
    attempts++
    await page.waitForTimeout(5000)

    // 获取页面文本
    const bodyText = await page.textContent('body')

    // 检查是否包含报告关键词
    const keywords = ['区位', '市场', '竞争', '投资', '风险', '建议', '分析', '收益']
    const foundKeywords = keywords.filter(kw => bodyText?.includes(kw))

    // 检查是否有长文本内容（超过500字）
    const hasLongContent = (bodyText?.length || 0) > 1000

    console.log(`  尝试 ${attempts}/${maxAttempts}: 关键词 ${foundKeywords.length}/${keywords.length}, 文本长度 ${bodyText?.length || 0}`)

    if (foundKeywords.length >= 4 && hasLongContent) {
      reportDetected = true
      reportContent = bodyText || ''
      console.log(`\n✓ 检测到调研报告！(${reportContent.length} 字符)`)
      break
    }

    // 每10秒截图一次
    if (attempts % 2 === 0) {
      await page.screenshot({
        path: `test-results/flow-step6-wait-${attempts}.png`,
        fullPage: true
      })
    }
  }

  // 最终截图
  await page.screenshot({ path: 'test-results/flow-final.png', fullPage: true })

  // 步骤8: 结果分析
  console.log('\n=== 测试结果 ===')
  console.log(`API请求发送: ${apiRequestSent ? '✓' : '✗'}`)
  console.log(`API响应收到: ${apiResponseReceived ? '✓' : '✗'} ${responseStatus ? `(Status: ${responseStatus})` : ''}`)
  console.log(`调研报告返回: ${reportDetected ? '✓' : '✗'}`)

  if (reportDetected) {
    console.log(`\n报告内容长度: ${reportContent.length} 字符`)
    console.log(`\n报告内容预览（前800字）:`)
    console.log('─'.repeat(80))
    console.log(reportContent.substring(0, 800))
    console.log('─'.repeat(80))

    // 检查报告结构
    const sections = ['区位分析', '市场分析', '竞争格局', '投资测算', '风险评估', '投资建议']
    const foundSections = sections.filter(s => reportContent.includes(s))

    console.log(`\n报告结构检查 (${foundSections.length}/${sections.length}):`)
    sections.forEach(section => {
      const found = reportContent.includes(section)
      console.log(`  ${found ? '✓' : '✗'} ${section}`)
    })
  } else {
    console.log('\n✗ 未检测到调研报告内容')
    console.log('可能的原因:')
    console.log('  1. API响应时间过长（超过2分钟）')
    console.log('  2. API调用失败')
    console.log('  3. 响应内容未正确显示在页面上')
  }

  console.log('\n=== 测试完成 ===')

  // 断言
  expect(apiRequestSent, 'API请求应该被发送').toBe(true)
  expect(apiResponseReceived, 'API响应应该被接收').toBe(true)
  expect(reportDetected, '应该检测到调研报告内容').toBe(true)
})
