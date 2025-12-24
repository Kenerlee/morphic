import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins/admin'
import { phoneNumber } from 'better-auth/plugins/phone-number'
import { invite } from 'better-auth-invite'

import { sendPasswordResetEmail } from '@/lib/email/smtp'
import { generateOTP,sendAliyunSMS } from '@/lib/sms/aliyun'

import { redisStorage } from './redis'

// 创建 Better Auth 实例
export const auth = betterAuth({
  // 使用 Redis 作为 session 存储
  secondaryStorage: redisStorage,

  // 基础配置
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // 应用名称
  appName: 'NaviX',

  // Session 配置
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 天
    updateAge: 60 * 60 * 24,     // 每天更新
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 分钟 cookie 缓存
    },
  },

  // 邮箱密码登录
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // 暂不强制邮箱验证
    minPasswordLength: 8,
    autoSignIn: true,
    // 密码重置功能 - 使用飞书 SMTP 发送邮件
    sendResetPassword: async ({ user, url, token }) => {
      console.log('[Better Auth] Password reset requested:', {
        email: user.email,
        tokenPrefix: token.substring(0, 8) + '...',
      })
      // 发送密码重置邮件
      if (user.email) {
        await sendPasswordResetEmail(user.email, url)
      }
    },
    resetPasswordTokenExpiresIn: 3600, // 1小时有效期
  },

  // 用户额外字段
  user: {
    additionalFields: {
      phone: {
        type: 'string',
        required: false,
      },
      phoneVerified: {
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
    },
  },

  // 插件配置
  plugins: [
    // 手机号登录插件
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }) => {
        // 使用现有的阿里云短信服务
        // 注意：不要 await，防止时序攻击
        const cleanPhone = phone.replace(/^\+86/, '')
        sendAliyunSMS(cleanPhone, code).catch((err: Error) => {
          console.error('[Better Auth] SMS send error:', err)
        })
      },
      otpLength: 6,
      expiresIn: 300, // 5 分钟
      signUpOnVerification: {
        // 验证成功后自动注册
        getTempEmail: (phoneNumber: string) => {
          const cleanPhone = phoneNumber.replace(/^\+86/, '')
          return `${cleanPhone}@phone.navix.local`
        },
      },
    }),

    // 邀请码插件
    invite({
      inviteDurationSeconds: 7 * 24 * 60 * 60, // 7 天有效期
      roleForSignupWithoutInvite: 'guest',
      roleForSignupWithInvite: 'user',
      generateCode: () => {
        // 生成 8 位邀请码 (排除易混淆字符)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let code = ''
        for (let i = 0; i < 8; i++) {
          code += chars[Math.floor(Math.random() * chars.length)]
        }
        return code
      },
    }),

    // 管理员插件 (RBAC)
    admin({
      defaultRole: 'guest',
      // 初始管理员邮箱列表 - 这些邮箱自动获得管理员权限
      adminRoles: ['admin'],
    }),
  ],

  // 数据库钩子 - 用于设置初始管理员
  databaseHooks: {
    user: {
      create: {
        // before hook 可以修改用户数据
        before: async (user) => {
          // 初始管理员邮箱列表
          const adminEmails = (process.env.ADMIN_EMAILS || 'kenerlee@gmail.com').split(',').map(e => e.trim().toLowerCase())

          if (user.email && adminEmails.includes(user.email.toLowerCase())) {
            console.log(`[Better Auth] Setting admin role for: ${user.email}`)
            // 在创建前修改用户角色
            return {
              data: {
                ...user,
                role: 'admin',
              },
            }
          }
          // 不是管理员，不修改用户数据，让其他插件（如邀请码）设置角色
          return undefined
        },
      },
    },
  },

  // 开发模式下的额外配置
  advanced: {
    // 开发环境使用内存存储，生产环境需要配置数据库
    // 这里使用默认的内存存储用于开发测试
    // 生产环境应该配置 PostgreSQL 或其他数据库
  },
})

// 类型导出
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
