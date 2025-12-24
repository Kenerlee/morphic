# Better Auth + Redis 迁移方案

> NaviX 认证系统从 Supabase 迁移到 Better Auth + Redis 的详细技术方案

**文档版本**: 1.0
**创建日期**: 2025-12-24


---

## 目录

1. [项目概览](#1-项目概览)
2. [迁移文件清单](#2-迁移文件清单)
3. [依赖变更](#3-依赖变更)
4. [新增文件结构](#4-新增文件结构)
5. [核心代码实现](#5-核心代码实现)
6. [数据库 Schema](#6-数据库-schema)
7. [详细时间表](#7-详细时间表)
8. [用户数据迁移策略](#8-用户数据迁移策略)
9. [微信登录集成](#9-微信登录集成)
10. [风险与缓解措施](#10-风险与缓解措施)
11. [成功标准](#11-成功标准)

---

## 1. 项目概览

### 1.1 当前状态 vs 目标状态

| 项目 | 当前状态 | 目标状态 |
|------|---------|---------|
| **认证框架** | Supabase Auth | Better Auth |
| **Session 存储** | Supabase (海外 Cloudflare) | Redis (本地) |
| **登录方式** | 邮箱 + 手机短信 | 邮箱 + 手机短信 + 微信(可选) |
| **邀请码** | 无 | better-auth-invite 插件 |
| **认证延迟** | 330ms - 2.7s (不稳定) | <10ms |

### 1.2 迁移目标

- 彻底解决 Supabase 从中国访问的延迟和超时问题
- 实现邀请码注册功能
- 保持现有的邮箱和手机短信登录功能
- 可选：增加微信扫码登录

### 1.3 技术选型理由

| 对比项 | NextAuth | Better Auth | 选择 |
|--------|----------|-------------|------|
| 邀请码支持 | 需自建 | 插件支持 | Better Auth ✓ |
| TypeScript | 部分 | 原生 | Better Auth ✓ |
| 维护状态 | 仅安全补丁 | 活跃开发 | Better Auth ✓ |
| 手机号登录 | 需自建 | 内置插件 | Better Auth ✓ |
| RBAC 权限 | 需自建 | 内置 | Better Auth ✓ |

---

## 2. 迁移文件清单

### 2.1 高优先级 - 需完全重写 (8个文件)

| 文件 | 行数 | 迁移说明 |
|------|------|---------|
| `lib/supabase/client.ts` | 8 | → `lib/auth/client.ts` |
| `lib/supabase/server.ts` | 30 | → `lib/auth/server.ts` |
| `lib/supabase/middleware.ts` | 76 | → `lib/auth/middleware.ts` |
| `middleware.ts` | 70 | 重写 session 验证逻辑 |
| `components/login-form.tsx` | 189 | 重写邮箱登录 |
| `components/sign-up-form.tsx` | 154 | 重写邮箱注册 |
| `components/phone-login-form.tsx` | 375 | 适配 phoneNumber 插件 |
| `components/phone-sign-up-form.tsx` | 332 | 适配 phoneNumber 插件 |

### 2.2 中优先级 - 需修改 API 调用 (9个文件)

| 文件 | 修改内容 |
|------|---------|
| `components/user-menu.tsx` | signOut, getUser |
| `components/forgot-password-form.tsx` | resetPassword |
| `components/update-password-form.tsx` | updatePassword |
| `app/auth/confirm/route.ts` | 邮箱确认逻辑 |
| `app/auth/oauth/route.ts` | OAuth 回调 |
| `app/api/auth/sms/verify/route.ts` | SMS 验证 |
| `app/api/user/me/route.ts` | getCurrentUser |
| `app/api/user/quota/route.ts` | getCurrentUser |
| `app/api/user/usage/route.ts` | getCurrentUser |

### 2.3 低优先级 - 仅改 import (18个文件)

所有使用 `getCurrentUser()` 或 `getCurrentUserId()` 的页面和组件，包括：

- `app/page.tsx`
- `app/profile/page.tsx`
- `app/expert/page.tsx`
- `app/admin/layout.tsx`
- `components/header.tsx`
- `components/app-sidebar.tsx`
- 等其他页面组件

---

## 3. 依赖变更

### 3.1 新增依赖

```json
{
  "dependencies": {
    "better-auth": "^1.3.7",
    "better-auth-invite": "^0.1.0",
    "ioredis": "^5.4.1"
  }
}
```

安装命令：
```bash
bun add better-auth better-auth-invite ioredis
```

### 3.2 移除依赖

```json
{
  "@supabase/auth-helpers-nextjs": "移除",
  "@supabase/auth-ui-react": "移除",
  "@supabase/auth-ui-shared": "移除",
  "@supabase/ssr": "移除"
}
```

> 注意：`@supabase/supabase-js` 暂时保留，如果其他功能还需要 Supabase 数据库

移除命令：
```bash
bun remove @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared @supabase/ssr
```

### 3.3 环境变量

新增到 `.env.local`：

```bash
# Better Auth 配置
BETTER_AUTH_SECRET=your-32-character-secret-key-here
BETTER_AUTH_URL=https://m.moments.top

# Redis 配置 (生产环境使用本地 Redis)
REDIS_URL=redis://localhost:6379

# 微信登录 (可选)
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
```

---

## 4. 新增文件结构

```
lib/
├── auth/
│   ├── index.ts              # Better Auth 实例 (服务端)
│   ├── client.ts             # Better Auth 客户端
│   ├── redis.ts              # Redis 连接配置
│   └── get-current-user.ts   # 用户获取 helper (兼容层)
├── sms/
│   ├── aliyun.ts             # 现有 (保持不变)
│   └── store.ts              # 现有 (保持不变)

app/
├── api/
│   └── auth/
│       └── [...all]/
│           └── route.ts      # Better Auth API 路由
```

---

## 5. 核心代码实现

### 5.1 Redis 连接配置

**文件**: `lib/auth/redis.ts`

```typescript
import Redis from 'ioredis'

// 生产环境使用本地 Redis，开发环境可用 Upstash
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
})

// 连接事件监听
redis.on('connect', () => {
  console.log('Redis connected')
})

redis.on('error', (err) => {
  console.error('Redis error:', err)
})

// Better Auth SecondaryStorage 接口实现
export const redisStorage = {
  get: async (key: string) => {
    const value = await redis.get(key)
    return value ? JSON.parse(value) : null
  },
  set: async (key: string, value: unknown, ttl?: number) => {
    const stringValue = JSON.stringify(value)
    if (ttl) {
      await redis.set(key, stringValue, 'EX', ttl)
    } else {
      await redis.set(key, stringValue)
    }
  },
  delete: async (key: string) => {
    await redis.del(key)
  },
}
```

### 5.2 Better Auth 服务端配置

**文件**: `lib/auth/index.ts`

```typescript
import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins'
import { phoneNumber } from 'better-auth/plugins/phone-number'
import { invite } from 'better-auth-invite'

import { sendAliyunSMS } from '@/lib/sms/aliyun'
import { redisStorage } from './redis'

export const auth = betterAuth({
  // 使用 Redis 作为 session 存储
  secondaryStorage: redisStorage,

  // 基础配置
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,

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
    requireEmailVerification: false, // 可根据需要开启
    minPasswordLength: 8,
  },

  // 插件配置
  plugins: [
    // 手机号登录插件
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }, ctx) => {
        // 使用现有的阿里云短信服务
        // 注意：不要 await，防止时序攻击
        sendAliyunSMS(phone.replace('+86', ''), code).catch(err => {
          console.error('SMS send error:', err)
        })
      },
      otpLength: 6,
      expiresIn: 300, // 5 分钟
      signUpOnVerification: {
        // 验证成功后自动注册
        getTempEmail: (phoneNumber) => {
          const cleanPhone = phoneNumber.replace('+86', '')
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
    }),
  ],
})

// 类型导出
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.User
```

### 5.3 Better Auth 客户端配置

**文件**: `lib/auth/client.ts`

```typescript
'use client'

import { createAuthClient } from 'better-auth/react'
import { phoneNumberClient } from 'better-auth/client/plugins'
import { inviteClient } from 'better-auth-invite/client'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || '',
  plugins: [
    phoneNumberClient(),
    inviteClient(),
  ],
})

// 导出便捷方法
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
```

### 5.4 用户获取 Helper (兼容层)

**文件**: `lib/auth/get-current-user.ts`

```typescript
import { headers } from 'next/headers'
import { auth } from './index'

/**
 * 获取当前登录用户 (服务端)
 * 用于替代原来的 Supabase getCurrentUser
 */
export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    return session?.user ?? null
  } catch (error) {
    console.error('getCurrentUser error:', error)
    return null
  }
}

/**
 * 获取当前用户 ID
 * 未登录返回 'anonymous'
 */
export async function getCurrentUserId() {
  const user = await getCurrentUser()
  return user?.id ?? 'anonymous'
}

/**
 * 获取完整 session
 */
export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
  })
}
```

### 5.5 API 路由处理

**文件**: `app/api/auth/[...all]/route.ts`

```typescript
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

### 5.6 中间件重写

**文件**: `middleware.ts`

```typescript
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const baseUrl = `${protocol}://${host}`

  // Better Auth session 检查 (通过 cookie)
  // 注意：这里只检查 cookie 是否存在，详细验证在 API 层
  const sessionCookie = request.cookies.get('better-auth.session_token')
  const hasSession = !!sessionCookie?.value

  // 需要认证的路径
  const protectedPaths = ['/profile', '/expert', '/admin']
  const pathname = request.nextUrl.pathname

  // 检查是否需要认证
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(url)
  }

  const response = NextResponse.next({ request })

  // 添加请求信息到 headers
  response.headers.set('x-url', request.url)
  response.headers.set('x-host', host)
  response.headers.set('x-protocol', protocol)
  response.headers.set('x-base-url', baseUrl)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
```

### 5.7 邮箱登录表单重写

**文件**: `components/login-form.tsx` (核心部分)

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
// ... 其他 imports 保持不变

export function LoginForm({ className, messages, ...props }: LoginFormProps) {
  const t = (key: string) => { /* 保持不变 */ }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // 使用 Better Auth 登录
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      })

      if (error) {
        throw new Error(error.message || '登录失败')
      }

      // 登录成功，重定向
      const returnUrl = sessionStorage.getItem('returnUrl')
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl')
        router.push(returnUrl)
      } else {
        router.push('/')
      }
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '登录失败')
    } finally {
      setIsLoading(false)
    }
  }

  // JSX 部分保持不变，只需删除 Google OAuth 相关代码
  // 或者保留但使用 Better Auth 的 OAuth 方法
  return (
    // ... 现有 JSX
  )
}
```

### 5.8 手机登录表单重写

**文件**: `components/phone-login-form.tsx` (核心部分)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
// ... 其他 imports 保持不变

export function PhoneLoginForm({ className, messages, ...props }: PhoneLoginFormProps) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()

  // 图形验证码加载 (保持现有逻辑)
  const loadCaptcha = async () => { /* 保持不变 */ }

  useEffect(() => { loadCaptcha() }, [])
  useEffect(() => { /* countdown 逻辑保持不变 */ }, [countdown])

  // 发送短信验证码
  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      setError('请输入正确的手机号')
      return
    }

    if (!captchaAnswer) {
      setError('请输入图形验证码答案')
      return
    }

    setIsSendingCode(true)
    setError(null)

    try {
      // 先验证图形验证码 (保持现有 API)
      const captchaResponse = await fetch('/api/auth/captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captcha_id: captchaToken,
          captcha_code: captchaAnswer
        })
      })

      if (!captchaResponse.ok) {
        setError('图形验证码错误')
        loadCaptcha()
        return
      }

      // 使用 Better Auth phoneNumber 插件发送 OTP
      const { error } = await authClient.phoneNumber.sendOtp({
        phoneNumber: `+86${phone}`,
      })

      if (error) {
        throw new Error(error.message || '发送失败')
      }

      setCountdown(60)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '发送失败')
      loadCaptcha()
    } finally {
      setIsSendingCode(false)
    }
  }

  // 验证并登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otp || otp.length !== 6) {
      setError('请输入6位短信验证码')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 使用 Better Auth 验证 OTP 并登录
      const { data, error } = await authClient.phoneNumber.verify({
        phoneNumber: `+86${phone}`,
        code: otp,
      })

      if (error) {
        throw new Error(error.message || '验证失败')
      }

      // 登录成功
      const returnUrl = sessionStorage.getItem('returnUrl')
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl')
        window.location.href = returnUrl
      } else {
        window.location.href = '/'
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '验证失败')
    } finally {
      setIsLoading(false)
    }
  }

  // JSX 部分基本保持不变
  return (
    // ... 现有 JSX
  )
}
```

### 5.9 邀请码功能实现

**文件**: `components/invite-code-input.tsx` (新增)

```typescript
'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InviteCodeInputProps {
  onActivated?: () => void
}

export function InviteCodeInput({ onActivated }: InviteCodeInputProps) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleActivate = async () => {
    if (!code || code.length < 6) {
      setMessage('请输入有效的邀请码')
      setStatus('error')
      return
    }

    setStatus('loading')

    try {
      const { error } = await authClient.invite.activate({ code })

      if (error) {
        throw new Error(error.message || '邀请码无效')
      }

      setStatus('success')
      setMessage('邀请码激活成功！注册后将获得完整权限')
      onActivated?.()
    } catch (error: unknown) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '激活失败')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="输入邀请码 (可选)"
          maxLength={8}
          className="font-mono"
        />
        <Button
          onClick={handleActivate}
          disabled={status === 'loading' || !code}
          variant="outline"
        >
          {status === 'loading' ? '验证中...' : '激活'}
        </Button>
      </div>
      {message && (
        <p className={`text-sm ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
```

**在注册表单中使用**:

```typescript
// components/sign-up-form.tsx 中添加
import { InviteCodeInput } from './invite-code-input'

// 在表单中添加
<InviteCodeInput onActivated={() => setHasInvite(true)} />
```

### 5.10 User Menu 登出

**文件**: `components/user-menu.tsx` (修改部分)

```typescript
import { authClient } from '@/lib/auth/client'

// 在组件中
const handleSignOut = async () => {
  await authClient.signOut()
  router.push('/')
  router.refresh()
}
```

---

## 6. 数据库 Schema

### 6.1 用户表 (如需持久化)

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT UNIQUE,
  "emailVerified" BOOLEAN DEFAULT FALSE,
  "phone" TEXT,
  "phoneVerified" BOOLEAN DEFAULT FALSE,
  "image" TEXT,
  "role" TEXT DEFAULT 'guest',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user"("email");
CREATE INDEX IF NOT EXISTS "user_phone_idx" ON "user"("phone");
```

### 6.2 邀请码表 (better-auth-invite)

```sql
-- 邀请码表
CREATE TABLE IF NOT EXISTS "invite" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "createdByUserId" TEXT REFERENCES "user"("id"),
  "maxUses" INTEGER DEFAULT 1,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "expiresAt" TIMESTAMP NOT NULL
);

-- 邀请使用记录
CREATE TABLE IF NOT EXISTS "invite_use" (
  "id" TEXT PRIMARY KEY,
  "inviteId" TEXT REFERENCES "invite"("id"),
  "usedByUserId" TEXT REFERENCES "user"("id"),
  "usedAt" TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "invite_code_idx" ON "invite"("code");
CREATE INDEX IF NOT EXISTS "invite_use_invite_idx" ON "invite_use"("inviteId");
```

### 6.3 Session 表 (如不使用纯 Redis)

```sql
-- Session 表 (可选，如果 storeSessionInDatabase=true)
CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES "user"("id"),
  "token" TEXT UNIQUE NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT
);

CREATE INDEX IF NOT EXISTS "session_token_idx" ON "session"("token");
CREATE INDEX IF NOT EXISTS "session_user_idx" ON "session"("userId");
```

---

## 7. 详细时间表

### Step1: 环境准备 

| 任务 | 时间 | 详情 |
|------|------|------|
| 安装依赖 | 30min | better-auth, better-auth-invite, ioredis |
| 环境变量配置 | 30min | BETTER_AUTH_SECRET, REDIS_URL 等 |
| Redis 配置 | 1h | lib/auth/redis.ts + 连接测试 |
| Better Auth 实例 | 2h | lib/auth/index.ts 完整配置 |
| API 路由 | 30min | app/api/auth/[...all]/route.ts |

**产出物**:
- `lib/auth/redis.ts`
- `lib/auth/index.ts`
- `app/api/auth/[...all]/route.ts`

### step2: 核心认证 

| 任务 | 时间 | 详情 |
|------|------|------|
| 客户端配置 | 1h | lib/auth/client.ts |
| getCurrentUser helper | 1h | lib/auth/get-current-user.ts |
| 中间件重写 | 2h | middleware.ts |
| 邮箱登录表单 | 2h | components/login-form.tsx |
| 邮箱注册表单 | 2h | components/sign-up-form.tsx |

**产出物**:
- `lib/auth/client.ts`
- `lib/auth/get-current-user.ts`
- `middleware.ts` (更新)
- `components/login-form.tsx` (更新)
- `components/sign-up-form.tsx` (更新)

### step3: 手机登录 

| 任务 | 时间 | 详情 |
|------|------|------|
| phoneNumber 插件测试 | 2h | 验证与阿里云 SMS 集成 |
| phone-login-form 重写 | 3h | 适配 Better Auth API |
| phone-sign-up-form 重写 | 3h | 适配 Better Auth API |

**产出物**:
- `components/phone-login-form.tsx` (更新)
- `components/phone-sign-up-form.tsx` (更新)

### step4: 辅助功能 

| 任务 | 时间 | 详情 |
|------|------|------|
| 邀请码插件配置 | 2h | better-auth-invite 集成 |
| 邀请码 UI 组件 | 1h | 注册页添加邀请码输入 |
| 密码重置功能 | 2h | forgot/update password forms |
| user-menu 更新 | 1h | signOut 逻辑 |

**产出物**:
- `components/invite-code-input.tsx` (新增)
- `components/forgot-password-form.tsx` (更新)
- `components/update-password-form.tsx` (更新)
- `components/user-menu.tsx` (更新)

### step5: 组件更新 

| 任务 | 时间 | 详情 |
|------|------|------|
| API 路由更新 | 2h | user/me, quota, usage |
| 页面组件更新 | 2h | profile, expert, admin |
| 其他组件 import 修复 | 2h | 18 个低优先级文件 |

**产出物**:
- 所有 API 路由更新
- 所有页面组件更新

### step6: 测试调试 

| 任务 | 时间 | 详情 |
|------|------|------|
| 邮箱登录测试 | 1h | 注册、登录、登出 |
| 手机登录测试 | 2h | OTP 发送、验证、登录 |
| 邀请码测试 | 1h | 创建、激活、角色升级 |
| 中间件测试 | 1h | 保护路由、重定向 |
| Session 持久化测试 | 1h | 刷新、过期、Redis 存储 |
| Bug 修复 | 2h | 预留缓冲时间 |

### step7: 数据迁移 + 上线 

| 任务 | 时间 | 详情 |
|------|------|------|
| 用户数据迁移脚本 | 2h | Supabase → Better Auth |
| 生产环境配置 | 1h | Redis、环境变量 |
| 部署测试 | 2h | 生产环境验证 |
| 文档更新 | 1h | CLAUDE.md、README |

---

## 8. 用户数据迁移策略

### 8.1 迁移脚本

**文件**: `scripts/migrate-to-better-auth.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'

async function migrateUsers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('Starting user migration...')

  // 获取所有 Supabase 用户
  const { data: { users }, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Failed to list users:', error)
    return
  }

  console.log(`Found ${users?.length || 0} users to migrate`)

  for (const user of users || []) {
    try {
      // 检查是否是手机号用户
      const isPhoneUser = user.email?.endsWith('@phone.navix.local')

      // 在 Better Auth 中创建用户
      await auth.api.createUser({
        body: {
          email: user.email!,
          name: user.user_metadata?.name || user.email?.split('@')[0],
          phone: user.phone || (isPhoneUser ? user.email?.split('@')[0] : undefined),
          emailVerified: !!user.email_confirmed_at,
          phoneVerified: !!user.phone_confirmed_at,
          role: 'user', // 迁移的用户默认为 user 角色
        },
      })

      console.log(`✓ Migrated: ${user.email}`)
    } catch (err) {
      console.error(`✗ Failed to migrate ${user.email}:`, err)
    }
  }

  console.log('Migration complete!')
}

// 运行
migrateUsers().catch(console.error)
```

### 8.2 迁移策略选择

| 策略 | 说明 | 用户体验 | 推荐 |
|------|------|---------|------|
| **完全迁移** | 导出用户，发送密码重置邮件 | 需要用户重置密码 | 用户少时 |
| **渐进迁移** | 新用户走 Better Auth，老用户保持 | 双系统并行 | ❌ 复杂 |
| **静默迁移** | 用户下次登录时自动迁移 | 最佳体验 | ✓ 推荐 |

### 8.3 推荐：静默迁移方案

1. 部署新系统，但保留 Supabase 读取能力
2. 用户登录时，先尝试 Better Auth
3. 如果 Better Auth 无此用户，从 Supabase 验证
4. 验证成功后，在 Better Auth 创建用户
5. 下次登录直接走 Better Auth

---

## 9. 微信登录集成

### 9.1 Generic OAuth 配置

如果需要微信登录，在 `lib/auth/index.ts` 中添加：

```typescript
import { genericOAuth } from 'better-auth/plugins'

// 在 plugins 数组中添加
genericOAuth({
  config: [
    {
      providerId: "wechat",
      name: "微信",

      // 微信 PC 扫码登录端点
      authorizationUrl: "https://open.weixin.qq.com/connect/qrconnect",
      tokenUrl: "https://api.weixin.qq.com/sns/oauth2/access_token",
      userInfoUrl: "https://api.weixin.qq.com/sns/userinfo",

      clientId: process.env.WECHAT_APP_ID!,
      clientSecret: process.env.WECHAT_APP_SECRET!,

      scopes: ["snsapi_login"],

      // 微信使用 appid 而非 client_id
      authorizationUrlParams: {
        appid: process.env.WECHAT_APP_ID!,
        response_type: "code",
        scope: "snsapi_login",
      },

      // 自定义 token 请求
      async exchangeCodeForToken(code) {
        const url = new URL("https://api.weixin.qq.com/sns/oauth2/access_token")
        url.searchParams.set("appid", process.env.WECHAT_APP_ID!)
        url.searchParams.set("secret", process.env.WECHAT_APP_SECRET!)
        url.searchParams.set("code", code)
        url.searchParams.set("grant_type", "authorization_code")

        const res = await fetch(url.toString())
        const data = await res.json()

        if (data.errcode) {
          throw new Error(data.errmsg)
        }

        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          openid: data.openid,
          unionid: data.unionid,
        }
      },

      // 自定义用户信息获取
      async getUserInfo(accessToken, providerData) {
        const url = new URL("https://api.weixin.qq.com/sns/userinfo")
        url.searchParams.set("access_token", accessToken)
        url.searchParams.set("openid", providerData.openid)

        const res = await fetch(url.toString())
        const data = await res.json()

        if (data.errcode) {
          throw new Error(data.errmsg)
        }

        return {
          id: data.unionid || data.openid,
          name: data.nickname,
          image: data.headimgurl,
          email: null, // 微信不返回邮箱
        }
      },
    },
  ]
}),
```

### 9.2 客户端调用

```typescript
// 微信登录按钮
const handleWeChatLogin = async () => {
  const { error } = await authClient.signIn.oauth2({
    providerId: "wechat",
    callbackURL: "/",
  })

  if (error) {
    console.error('WeChat login error:', error)
  }
}
```

### 9.3 微信登录前置条件

| 要求 | 说明 |
|------|------|
| 微信开放平台账号 | 企业/个体工商户 |
| 开发者资质认证 | ¥300/年 |
| 网站应用审核 | 提交应用信息 |
| 域名备案 | 服务器在中国需要 |
| 回调域名配置 | 白名单设置 |

---

## 10. 风险与缓解措施

| 风险 | 影响程度 | 缓解措施 |
|------|---------|---------|
| Better Auth 生产稳定性 | 中 | 锁定版本 1.3.7，避免 1.3.25+ |
| 跨域 Cookie 问题 | 中 | 确保 sameSite: 'lax' 配置 |
| 手机号插件兼容性 | 低 | 已验证 phoneNumber 插件完善 |
| 用户迁移数据丢失 | 低 | 完整备份 + 测试环境验证 |
| 邀请码插件 Alpha | 低 | 功能简单，必要时可自行修复 |
| Redis 连接问题 | 低 | 添加重试机制 + 健康检查 |

### 回滚方案

如果迁移出现严重问题：

1. 保留 Supabase 相关代码在 `lib/supabase-backup/`
2. 环境变量切换回 Supabase
3. 恢复 middleware.ts 的 Supabase 版本

---

## 11. 成功标准

### 功能验收

- [ ] 邮箱注册/登录正常
- [ ] 手机短信登录正常
- [ ] Session 存储在本地 Redis
- [ ] 中间件保护路由正常工作
- [ ] 邀请码创建/激活正常
- [ ] 角色升级 (guest → user) 正常
- [ ] 登出清除 session
- [ ] 页面刷新保持登录状态

### 性能指标

- [ ] 认证延迟 < 50ms (当前 330ms-2.7s)
- [ ] 页面加载不因认证阻塞
- [ ] Redis 内存占用 < 100MB

### 兼容性

- [ ] 现有用户可正常迁移
- [ ] 手机号用户虚拟邮箱兼容
- [ ] 图形验证码功能保持

---

## 附录

### A. 相关文档链接

- [Better Auth 官方文档](https://www.better-auth.com/docs)
- [Better Auth Phone Number 插件](https://www.better-auth.com/docs/plugins/phone-number)
- [better-auth-invite 插件](https://github.com/bard/better-auth-invite)
- [Better Auth Generic OAuth](https://www.better-auth.com/docs/plugins/generic-oauth)

### B. 命令速查

```bash
# 安装依赖
bun add better-auth better-auth-invite ioredis

# 移除旧依赖
bun remove @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared @supabase/ssr

# 生成 secret
openssl rand -base64 32

# 运行迁移脚本
bun run scripts/migrate-to-better-auth.ts

# 测试 Redis 连接
redis-cli ping
```

### C. 环境变量模板

```bash
# .env.local 新增
BETTER_AUTH_SECRET=your-32-character-secret-key-here
BETTER_AUTH_URL=https://m.moments.top
REDIS_URL=redis://localhost:6379

# 微信登录 (可选)
WECHAT_APP_ID=
WECHAT_APP_SECRET=
```

---

**文档结束**

> 如有问题，请联系开发团队
