import { getAllConsultations } from '@/lib/actions/consultation'

import { ConsultationTable } from '@/components/admin/consultation-table'

export default async function AdminConsultationsPage() {
  const { consultations, total } = await getAllConsultations(1, 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">咨询管理</h2>
        <p className="text-sm text-muted-foreground">共 {total} 条咨询记录</p>
      </div>

      <ConsultationTable initialConsultations={consultations} />
    </div>
  )
}
