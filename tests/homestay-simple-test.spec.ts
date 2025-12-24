import { test, expect } from '@playwright/test'

test('民宿尽调功能 - 简单验证', async ({ page }) => {
  console.log('开始测试...\n')

  // 1. 访问页面
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  console.log('✓ 页面加载完成')

  // 2. 点击民宿尽调按钮
  const homestayBtn = page.locator('button:has-text("民宿尽调")')
  await expect(homestayBtn).toBeVisible()
  await homestayBtn.click()
  await page.waitForTimeout(1000)
  console.log('✓ 点击民宿尽调按钮')

  // 3. 输入查询
  const input = page.locator('textarea').first()
  await input.fill('杭州民宿投资分析')
  console.log('✓ 输入查询')

  // 截图
  await page.screenshot({ path: 'test-results/simple-before-send.png', fullPage: true })

  // 4. 监听API调用
  let apiCalled = false
  let requestBody = ''

  page.on('request', async request => {
    if (request.url().includes('/api/chat')) {
      apiCalled = true
      try {
        requestBody = request.postData() || ''
        console.log('\n→ API请求已发送')
        console.log('URL:', request.url())
        console.log('Method:', request.method())
        console.log('Body 长度:', requestBody.length)
      } catch (e) {
        console.log('无法获取请求体')
      }
    }
  })

  page.on('response', async response => {
    if (response.url().includes('/api/chat')) {
      console.log('\n← API响应收到')
      console.log('Status:', response.status())
      console.log('Content-Type:', response.headers()['content-type'])
    }
  })

  // 5. 点击发送
  const sendBtn = page.locator('button[type="submit"]').first()
  await sendBtn.click()
  console.log('✓ 点击发送按钮')

  // 6. 等待一段时间
  console.log('\n等待响应（15秒）...')
  await page.waitForTimeout(15000)

  // 截图
  await page.screenshot({ path: 'test-results/simple-after-send.png', fullPage: true })

  // 7. 检查页面内容
  const bodyText = await page.textContent('body')
  const hasContent = bodyText?.includes('分析') || bodyText?.includes('投资')

  console.log('\n=== 结果 ===')
  console.log('API 是否调用:', apiCalled ? '✓' : '✗')
  console.log('页面是否有内容:', hasContent ? '✓' : '✗')
  console.log('页面文本长度:', bodyText?.length || 0)

  // 查找所有包含"民宿"的元素
  const elements = await page.locator('*:has-text("民宿")').all()
  console.log('包含"民宿"的元素数量:', elements.length)

  // 输出页面上可见的主要文本（前500字）
  console.log('\n页面主要内容（前500字）:')
  console.log(bodyText?.substring(0, 500))

  // 断言
  expect(apiCalled, 'API应该被调用').toBe(true)
})
