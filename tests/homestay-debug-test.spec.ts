import { test } from '@playwright/test'

test('民宿尽调 - 调试发送按钮状态', async ({ page }) => {
  console.log('=== 调试测试开始 ===\n')

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  console.log('✓ 页面加载')

  // 检查初始状态
  const input = page.locator('textarea').first()
  const sendBtn = page.locator('button[type="submit"]').first()

  console.log('\n初始状态:')
  const initialDisabled = await sendBtn.getAttribute('disabled')
  console.log('发送按钮disabled:', initialDisabled !== null ? '是' : '否')

  // 输入内容
  await input.fill('测试查询')
  await page.waitForTimeout(500)

  console.log('\n输入内容后:')
  const afterInputDisabled = await sendBtn.getAttribute('disabled')
  console.log('发送按钮disabled:', afterInputDisabled !== null ? '是' : '否')
  const inputValue = await input.inputValue()
  console.log('输入框内容:', inputValue)
  console.log('输入框长度:', inputValue.length)

  await page.screenshot({ path: 'test-results/debug-after-input.png', fullPage: true })

  // 点击民宿尽调按钮
  const homestayBtn = page.locator('button:has-text("民宿尽调")')
  await homestayBtn.click()
  await page.waitForTimeout(1000)
  console.log('\n✓ 点击民宿尽调按钮')

  // 再次检查
  console.log('\n点击民宿尽调后:')
  const afterHomestayDisabled = await sendBtn.getAttribute('disabled')
  console.log('发送按钮disabled:', afterHomestayDisabled !== null ? '是' : '否')
  const currentValue = await input.inputValue()
  console.log('输入框内容:', currentValue)
  console.log('输入框长度:', currentValue.length)

  // 获取按钮的所有属性
  const buttonProps = await sendBtn.evaluate(btn => {
    return {
      disabled: btn.hasAttribute('disabled'),
      type: btn.getAttribute('type'),
      className: btn.className,
      innerText: btn.innerText
    }
  })
  console.log('\n发送按钮属性:', JSON.stringify(buttonProps, null, 2))

  await page.screenshot({ path: 'test-results/debug-after-homestay-click.png', fullPage: true })

  // 检查是否有错误信息
  const consoleMessages: string[] = []
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`))

  await page.waitForTimeout(2000)

  if (consoleMessages.length > 0) {
    console.log('\n控制台消息:')
    consoleMessages.forEach(msg => console.log(msg))
  }

  // 尝试检查React state
  const pageState = await page.evaluate(() => {
    // @ts-ignore
    return window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.size || 0
  })
  console.log('\nReact渲染器数量:', pageState)

  // 检查Cookie
  const cookies = await page.context().cookies()
  const homestayModeCookie = cookies.find(c => c.name === 'homestayMode')
  console.log('\nhomestayMode Cookie:', homestayModeCookie ? homestayModeCookie.value : '未设置')

  console.log('\n=== 调试测试结束 ===')
})
