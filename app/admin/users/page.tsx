import { getAllUserProfiles } from '@/lib/actions/user-profile'

import { UserTable } from '@/components/admin/user-table'

export default async function AdminUsersPage() {
  const { profiles, total } = await getAllUserProfiles(1, 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">用户管理</h2>
        <p className="text-sm text-muted-foreground">共 {total} 个用户</p>
      </div>

      <UserTable initialUsers={profiles} />
    </div>
  )
}
