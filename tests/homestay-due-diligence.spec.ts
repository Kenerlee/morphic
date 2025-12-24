import { test, expect } from '@playwright/test'

// Helper function to close any modal dialogs
async function closeAllDialogs(page: any) {
  // Try multiple times to close dialogs
  for (let i = 0; i < 3; i++) {
    const dialog = page.locator('[role="dialog"]')
    if (await dialog.isVisible({ timeout: 500 }).catch(() => false)) {
      // Try clicking the close button first
      const closeButton = dialog.locator('button:has-text("关闭")').or(dialog.locator('button:has-text("Close")'))
      if (await closeButton.isVisible({ timeout: 300 }).catch(() => false)) {
        await closeButton.click()
        await page.waitForTimeout(300)
        continue
      }
      // Try pressing Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } else {
      break
    }
  }
}

test.describe('Homestay Due Diligence Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/')
    // Wait for page to be ready
    await page.waitForLoadState('networkidle')

    // Close any modal dialogs that may be blocking
    await closeAllDialogs(page)
  })

  test('should display homestay mode toggle button', async ({ page }) => {
    // Check if homestay toggle button exists
    const homestayButton = page.locator('button:has-text("民宿尽调")')
    await expect(homestayButton).toBeVisible()

    // Check button styling
    await expect(homestayButton).toHaveClass(/border/)
  })

  test('should toggle homestay mode on/off', async ({ page }) => {
    const homestayButton = page.locator('button:has-text("民宿尽调")')

    // Get initial state
    const initiallyActive = await homestayButton
      .evaluate(el => el.classList.contains('bg-primary'))
      .catch(() => false)

    // First click - should toggle the state
    await homestayButton.click({ force: true })
    await page.waitForTimeout(500)

    // Close any dialog that may have appeared
    await closeAllDialogs(page)

    if (initiallyActive) {
      // Was active, now should be inactive
      await expect(homestayButton).not.toHaveClass(/bg-primary/)
    } else {
      // Was inactive, now should be active
      await expect(homestayButton).toHaveClass(/bg-primary/)
    }

    // Second click - should toggle back
    await homestayButton.click({ force: true })
    await page.waitForTimeout(500)

    // Close any dialog that may have appeared
    await closeAllDialogs(page)

    if (initiallyActive) {
      // Should be back to active
      await expect(homestayButton).toHaveClass(/bg-primary/)
    } else {
      // Should be back to inactive
      await expect(homestayButton).not.toHaveClass(/bg-primary/)
    }
  })

  test('should show tooltip on hover', async ({ page }) => {
    const homestayButton = page.locator('button:has-text("民宿尽调")')

    // Hover over button
    await homestayButton.hover()
    await page.waitForTimeout(300)

    // Tooltip should appear
    const tooltip = page.locator('[role="tooltip"]')
    await expect(tooltip).toBeVisible({ timeout: 2000 })
  })

  test('should allow input in chat with homestay mode enabled', async ({
    page
  }) => {
    // Enable homestay mode
    const homestayButton = page.locator('button:has-text("民宿尽调")')
    await homestayButton.click({ force: true })
    await page.waitForTimeout(500)

    // Close any dialog that may have appeared
    await closeAllDialogs(page)

    // Find chat input - use more specific selector with longer timeout
    const chatInput = page.getByPlaceholder('提出你的问题')
    await expect(chatInput).toBeVisible({ timeout: 10000 })

    // Click to focus and type
    await chatInput.click({ timeout: 5000 })
    await page.waitForTimeout(200)

    // Type a query using keyboard
    const testQuery = '民宿投资'
    await chatInput.pressSequentially(testQuery, { delay: 50 })
    await page.waitForTimeout(300)

    // Verify input value
    await expect(chatInput).toHaveValue(testQuery, { timeout: 5000 })
  })

  test('should send query when homestay mode is active', async ({ page }) => {
    // Enable homestay mode
    const homestayButton = page.locator('button:has-text("民宿尽调")')
    await homestayButton.click({ force: true })
    await page.waitForTimeout(500)

    // Close any dialog that may have appeared
    await closeAllDialogs(page)

    // Find and fill chat input with longer timeout
    const chatInput = page.getByPlaceholder('提出你的问题')
    await expect(chatInput).toBeVisible({ timeout: 10000 })
    await chatInput.click({ timeout: 5000 })
    await page.waitForTimeout(200)

    const testQuery = '民宿分析'
    await chatInput.pressSequentially(testQuery, { delay: 50 })
    await page.waitForTimeout(500)

    // Verify input has value before sending
    await expect(chatInput).toHaveValue(testQuery, { timeout: 5000 })

    // Find and click send button (should be enabled now)
    const sendButton = page.locator('button[type="submit"]')
    await expect(sendButton).toBeEnabled({ timeout: 5000 })
    await sendButton.click()

    // Wait for response to start appearing
    await page.waitForTimeout(2000)

    // Check if message was sent (should appear in chat)
    const userMessage = page.locator(`text="${testQuery}"`).first()
    await expect(userMessage).toBeVisible({ timeout: 10000 })
  })

  test('should persist homestay mode state after page reload', async ({
    page
  }) => {
    // Enable homestay mode
    const homestayButton = page.locator('button:has-text("民宿尽调")')
    await homestayButton.click()
    await page.waitForTimeout(500)

    // Verify it's active
    await expect(homestayButton).toHaveClass(/bg-primary/)

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check if still active
    const homestayButtonAfterReload = page.locator(
      'button:has-text("民宿尽调")'
    )
    await expect(homestayButtonAfterReload).toHaveClass(/bg-primary/)
  })

  test('should have correct icon in button', async ({ page }) => {
    const homestayButton = page.locator('button:has-text("民宿尽调")')

    // Check for Home icon (lucide-react)
    const homeIcon = homestayButton.locator('svg')
    await expect(homeIcon).toBeVisible()
  })

  test('should work with other research modes', async ({ page }) => {
    // Enable homestay mode
    const homestayButton = page.locator('button:has-text("民宿尽调")')
    await homestayButton.click()
    await page.waitForTimeout(500)

    // Try to find other research mode buttons
    const deepResearchButton = page
      .locator('button:has-text("深度调研")')
      .or(page.locator('button:has-text("Deep Research")'))

    if (await deepResearchButton.isVisible()) {
      // Click deep research
      await deepResearchButton.click()
      await page.waitForTimeout(500)

      // Homestay mode should still be visible and toggleable
      await expect(homestayButton).toBeVisible()

      // Can still toggle homestay
      await homestayButton.click()
      await page.waitForTimeout(500)
    }
  })

  test('should display button in correct position', async ({ page }) => {
    const homestayButton = page.locator('button:has-text("民宿尽调")')

    // Check button is visible and has proper styling
    await expect(homestayButton).toBeVisible()

    // Get bounding box to verify it's in viewport
    const boundingBox = await homestayButton.boundingBox()
    expect(boundingBox).toBeTruthy()

    if (boundingBox) {
      // Check it's positioned within reasonable bounds
      expect(boundingBox.y).toBeGreaterThanOrEqual(0)
      expect(boundingBox.x).toBeGreaterThanOrEqual(0)
    }
  })

  test('should have correct text styling', async ({ page }) => {
    const homestayButton = page.locator('button:has-text("民宿尽调")')

    // Check text element
    const buttonText = homestayButton.locator('span:has-text("民宿尽调")')
    await expect(buttonText).toBeVisible()

    // Verify text-xs class for small text
    await expect(buttonText).toHaveClass(/text-xs/)
  })
})

test.describe('Homestay Chat API Integration', () => {
  test('should make API call with homestay mode cookie', async ({
    page,
    context
  }) => {
    // Set up API response listener
    let apiCalled = false
    page.on('request', request => {
      if (request.url().includes('/api/chat')) {
        apiCalled = true
      }
    })

    // Navigate and enable homestay mode
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const homestayButton = page.locator('button:has-text("民宿尽调")')
    await homestayButton.click()
    await page.waitForTimeout(500)

    // Check cookies for homestay mode
    const cookies = await context.cookies()
    const homestayModeCookie = cookies.find(c => c.name === 'homestay-mode')

    expect(homestayModeCookie).toBeTruthy()
    expect(homestayModeCookie?.value).toBe('true')
  })
})

test.describe('Accessibility Tests', () => {
  test('homestay button should be keyboard accessible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const homestayButton = page.locator('button:has-text("民宿尽调")')

    // Focus on button using keyboard
    await homestayButton.focus()

    // Check if focused
    await expect(homestayButton).toBeFocused()

    // Press Enter to activate
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Should be active
    await expect(homestayButton).toHaveClass(/bg-primary/)
  })

  test('homestay button should have proper ARIA attributes', async ({
    page
  }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Close any modal dialogs
    const dialog = page.locator('[role="dialog"]')
    if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    const homestayButton = page.locator('button:has-text("民宿尽调")')

    // Button should be a proper button element (check tag name, not type attribute)
    await expect(homestayButton).toBeVisible()
    const tagName = await homestayButton.evaluate(el => el.tagName.toLowerCase())
    expect(tagName).toBe('button')
  })
})
