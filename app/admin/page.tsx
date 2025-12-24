import { getAllUserProfiles } from '@/lib/actions/user-profile'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboard() {
  const { profiles: users, total } = await getAllUserProfiles(1, 1000)

  // 统计数据
  const stats = {
    total,
    free: users.filter(u => u.level === 'free').length,
    pro: users.filter(u => u.level === 'pro').length,
    vip: users.filter(u => u.level === 'vip').length,
    admin: users.filter(u => u.level === 'admin').length
  }

  // 今日活跃用户（有配额使用的）
  const activeToday = users.filter(u => u.quota_used > 0).length

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">仪表盘</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free 用户</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.free}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro 用户</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pro}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP 用户</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vip}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>用户等级分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Free</span>
                <span className="font-medium">{stats.free}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400"
                  style={{
                    width: `${stats.total > 0 ? (stats.free / stats.total) * 100 : 0}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span>Pro</span>
                <span className="font-medium">{stats.pro}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${stats.total > 0 ? (stats.pro / stats.total) * 100 : 0}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span>VIP</span>
                <span className="font-medium">{stats.vip}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${stats.total > 0 ? (stats.vip / stats.total) * 100 : 0}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span>Admin</span>
                <span className="font-medium">{stats.admin}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${stats.total > 0 ? (stats.admin / stats.total) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>活跃度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-bold">{activeToday}</div>
                <p className="text-sm text-muted-foreground">
                  本月有配额使用的用户
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
