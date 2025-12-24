import { redirect } from 'next/navigation'

import { getOrCreateUserProfile } from '@/lib/actions/user-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check role from Redis user profile (persistent storage)
  const profile = await getOrCreateUserProfile(user.id, user.email || undefined)

  if (profile.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">NaviX 管理后台</h1>
              <nav className="flex gap-4">
                <a
                  href="/admin"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  仪表盘
                </a>
                <a
                  href="/admin/users"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  用户管理
                </a>
                <a
                  href="/admin/consultations"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  咨询管理
                </a>
                <a
                  href="/admin/research-reports"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  调研报告
                </a>
                <a
                  href="/admin/invites"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  邀请码
                </a>
              </nav>
            </div>
            <a
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              返回首页
            </a>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
