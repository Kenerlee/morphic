import crypto from 'crypto'

// Secret for signing captcha tokens
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'navix-captcha-secret-key'

// Verify captcha token
export function verifyCaptchaToken(token: string): { valid: boolean; id?: string } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [data, signature] = decoded.split('.')

    if (!data || !signature) {
      return { valid: false }
    }

    const expectedSignature = crypto
      .createHmac('sha256', CAPTCHA_SECRET)
      .update(data)
      .digest('hex')

    if (signature !== expectedSignature) {
      return { valid: false }
    }

    const payload = JSON.parse(data)
    if (payload.exp < Date.now()) {
      return { valid: false }
    }

    return { valid: true, id: payload.id }
  } catch {
    return { valid: false }
  }
}
