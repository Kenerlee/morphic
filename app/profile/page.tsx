import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import {
  getOrCreateUserProfile,
  getUserProfileWithQuotaStatus} from '@/lib/actions/user-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { InviteSection } from '@/components/profile/invite-section'
import { LevelBadge } from '@/components/profile/level-badge'
import { QuotaDashboard } from '@/components/profile/quota-dashboard'
import { UpgradeCta } from '@/components/profile/upgrade-cta'

import enMessages from '@/messages/en.json'
import zhMessages from '@/messages/zh.json'

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh'
  const messages = locale === 'zh' ? zhMessages : enMessages
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 获取或创建用户配置文件
  await getOrCreateUserProfile(user.id)
  // 获取配额状态（内部会自动检查并重置月度配额）
  const profile = await getUserProfileWithQuotaStatus(user.id)

  if (!profile) {
    redirect('/auth/login')
  }

  const phone = (user as any).phone || profile.mobile
  const isUnlimited = profile.quota_limit === -1

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">个人中心</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>账户信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground">用户 ID</label>
                <p className="font-mono text-sm">{user.id.slice(0, 16)}...</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">邮箱</label>
                <p className="text-sm">
                  {user.email?.includes('@phone.navix.local')
                    ? '手机号登录用户'
                    : user.email || '-'}
                </p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">手机号</label>
                <p className="text-sm">{phone || '-'}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">
                  注册时间
                </label>
                <p className="text-sm">{formatDate(profile.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>会员等级</span>
              <LevelBadge level={profile.level} size="lg" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.level !== 'free' &&
              profile.level !== 'admin' &&
              profile.level_expire_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">会员有效期至</span>
                  <span
                    className={
                      new Date(profile.level_expire_at) < new Date()
                        ? 'text-red-600'
                        : ''
                    }
                  >
                    {formatDate(profile.level_expire_at)}
                    {new Date(profile.level_expire_at) < new Date() && (
                      <span className="ml-2">（已过期）</span>
                    )}
                  </span>
                </div>
              )}

            <QuotaDashboard
              used={profile.quota_used}
              limit={profile.quota_limit}
              isUnlimited={isUnlimited}
              resetDate={profile.quota_reset_date}
            />
          </CardContent>
        </Card>

        <InviteSection messages={messages} locale={locale} />

        <UpgradeCta currentLevel={profile.level} />

        <div className="text-center">
          <a href="/" className="text-sm text-muted-foreground hover:underline">
            返回首页
          </a>
        </div>
      </div>
    </div>
  )
}
