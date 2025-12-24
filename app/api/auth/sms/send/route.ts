import { NextRequest, NextResponse } from 'next/server'

import { verifyCaptchaToken } from '@/lib/auth/captcha'
import {
  formatPhone,
  generateOTP,
  isValidChinesePhone,
  sendAliyunSMS
} from '@/lib/sms/aliyun'
import {
  memoryStore,
  OTP_EXPIRY,
  redis,
  RESEND_INTERVAL
} from '@/lib/sms/store'

export async function POST(request: NextRequest) {
  try {
    // 解析请求体，处理空请求体的情况
    let body: { phone?: string; captcha_token?: string } = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '请求体格式错误' }, { status: 400 })
    }

    const { phone, captcha_token } = body

    // 先验证手机号是否存在（在验证 captcha 之前）
    if (!phone) {
      return NextResponse.json({ error: '手机号不能为空' }, { status: 400 })
    }

    // 验证图形验证码 token
    if (!captcha_token) {
      return NextResponse.json(
        { error: '请先完成图形验证码验证', error_code: 40101 },
        { status: 401 }
      )
    }

    const captchaResult = verifyCaptchaToken(captcha_token)
    if (!captchaResult.valid) {
      return NextResponse.json(
        { error: '图形验证码已过期，请重新验证', error_code: 40101 },
        { status: 401 }
      )
    }

    // 验证手机号格式
    if (!isValidChinesePhone(phone)) {
      return NextResponse.json(
        { error: '请输入有效的中国大陆手机号' },
        { status: 400 }
      )
    }

    const cleanPhone = formatPhone(phone)
    const redisKey = `sms:otp:${cleanPhone}`

    // 检查是否在冷却期
    let lastSendTime: number | null = null

    if (redis) {
      const stored = await redis.get<{ code: string; sendAt: number }>(redisKey)
      if (stored) {
        lastSendTime = stored.sendAt
      }
    } else {
      const stored = memoryStore.get(cleanPhone)
      if (stored && stored.expiresAt > Date.now()) {
        lastSendTime = stored.sendAt
      }
    }

    if (lastSendTime) {
      const elapsed = Math.floor((Date.now() - lastSendTime) / 1000)
      if (elapsed < RESEND_INTERVAL) {
        return NextResponse.json(
          { error: `请等待 ${RESEND_INTERVAL - elapsed} 秒后再试` },
          { status: 429 }
        )
      }
    }

    // 生成验证码
    const code = generateOTP()

    // 发送短信
    const result = await sendAliyunSMS(cleanPhone, code)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    // 存储验证码
    const otpData = {
      code,
      sendAt: Date.now()
    }

    if (redis) {
      await redis.set(redisKey, otpData, { ex: OTP_EXPIRY })
    } else {
      memoryStore.set(cleanPhone, {
        ...otpData,
        expiresAt: Date.now() + OTP_EXPIRY * 1000
      })

      // 清理过期的验证码
      for (const [key, value] of memoryStore.entries()) {
        if (value.expiresAt < Date.now()) {
          memoryStore.delete(key)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送'
    })
  } catch (error) {
    console.error('发送验证码错误:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '发送失败，请稍后重试'
      },
      { status: 500 }
    )
  }
}
