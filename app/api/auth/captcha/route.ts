import { NextRequest, NextResponse } from 'next/server'

import crypto from 'crypto'

// In-memory store for captchas (use Redis in production)
const captchaStore: Map<string, { code: string; expiresAt: number }> = new Map()

// Secret for signing captcha tokens
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'navix-captcha-secret-key'

// Generate a random captcha ID
function generateCaptchaId(): string {
  return crypto.randomBytes(16).toString('hex')
}

// Sign captcha token
function signCaptchaToken(captchaId: string): string {
  const payload = {
    id: captchaId,
    exp: Date.now() + 5 * 60 * 1000 // 5 minutes
  }
  const data = JSON.stringify(payload)
  const signature = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(data)
    .digest('hex')
  return Buffer.from(`${data}.${signature}`).toString('base64')
}

// Clean up expired captchas
function cleanupExpiredCaptchas(): void {
  const now = Date.now()
  for (const [id, captcha] of captchaStore.entries()) {
    if (captcha.expiresAt < now) {
      captchaStore.delete(id)
    }
  }
}

// Generate SVG captcha image
function generateCaptchaSvg(text: string): string {
  const width = 150
  const height = 50

  // Random colors for variety
  const colors = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706']
  const textColor = colors[Math.floor(Math.random() * colors.length)]

  // Generate noise lines
  let noiseLines = ''
  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * width
    const y1 = Math.random() * height
    const x2 = Math.random() * width
    const y2 = Math.random() * height
    const lineColor = colors[Math.floor(Math.random() * colors.length)]
    noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lineColor}" stroke-width="1" opacity="0.3"/>`
  }

  // Generate noise dots
  let noiseDots = ''
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * width
    const cy = Math.random() * height
    const r = Math.random() * 2 + 1
    const dotColor = colors[Math.floor(Math.random() * colors.length)]
    noiseDots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dotColor}" opacity="0.2"/>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f0f0f0"/>
    ${noiseLines}
    ${noiseDots}
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${textColor}"
          transform="rotate(${Math.random() * 6 - 3}, 75, 25)">
      ${text}
    </text>
  </svg>`
}

/**
 * GET /api/auth/captcha
 * Generate a new captcha
 */
export async function GET(): Promise<NextResponse> {
  // Cleanup expired captchas periodically
  cleanupExpiredCaptchas()

  // Generate a simple math captcha without external dependencies
  const num1 = Math.floor(Math.random() * 10) + 1
  const num2 = Math.floor(Math.random() * 10) + 1
  const operators = ['+', '-']
  const operator = operators[Math.floor(Math.random() * operators.length)]

  let answer: number
  let expression: string

  if (operator === '+') {
    answer = num1 + num2
    expression = `${num1} + ${num2} = ?`
  } else {
    // Ensure positive result
    const larger = Math.max(num1, num2)
    const smaller = Math.min(num1, num2)
    answer = larger - smaller
    expression = `${larger} - ${smaller} = ?`
  }

  const captchaId = generateCaptchaId()
  const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

  // Store captcha
  captchaStore.set(captchaId, {
    code: answer.toString(),
    expiresAt
  })

  // Generate simple SVG with the math expression
  const svgContent = generateCaptchaSvg(expression)
  const svgBase64 = Buffer.from(svgContent).toString('base64')

  return NextResponse.json({
    captcha_id: captchaId,
    captcha_image: `data:image/svg+xml;base64,${svgBase64}`,
    expires_at: new Date(expiresAt).toISOString()
  })
}

/**
 * POST /api/auth/captcha
 * Verify captcha code
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { captcha_id, captcha_code } = body

    if (!captcha_id || !captcha_code) {
      return NextResponse.json(
        { success: false, error: '验证码ID和验证码不能为空', error_code: 40101 },
        { status: 400 }
      )
    }

    // Get stored captcha
    const storedCaptcha = captchaStore.get(captcha_id)

    if (!storedCaptcha) {
      return NextResponse.json(
        { success: false, error: '验证码已过期，请刷新', error_code: 40101 },
        { status: 400 }
      )
    }

    // Check if expired
    if (storedCaptcha.expiresAt < Date.now()) {
      captchaStore.delete(captcha_id)
      return NextResponse.json(
        { success: false, error: '验证码已过期，请刷新', error_code: 40101 },
        { status: 400 }
      )
    }

    // Verify code (trim whitespace and compare)
    if (storedCaptcha.code !== captcha_code.toString().trim()) {
      return NextResponse.json(
        { success: false, error: '验证码错误', error_code: 40101 },
        { status: 400 }
      )
    }

    // Delete used captcha
    captchaStore.delete(captcha_id)

    // Generate token for SMS API
    const captchaToken = signCaptchaToken(captcha_id)

    return NextResponse.json({
      success: true,
      captcha_token: captchaToken,
      message: '验证码验证成功'
    })
  } catch (error) {
    console.error('Captcha verification error:', error)
    return NextResponse.json(
      { success: false, error: '验证码验证失败', error_code: 40101 },
      { status: 500 }
    )
  }
}
