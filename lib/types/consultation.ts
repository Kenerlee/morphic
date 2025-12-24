export type ConsultationType =
  | 'market-research'
  | 'due-diligence'
  | 'overseas-expansion'
  | 'custom-report'
  | 'membership'
  | 'other'

export type ConsultationStatus = 'pending' | 'contacted' | 'completed' | 'cancelled'

export interface Consultation {
  id: string
  name: string
  company: string | null
  phone: string
  email: string | null
  consultation_type: ConsultationType
  description: string | null
  status: ConsultationStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateConsultationInput {
  name: string
  company?: string
  phone: string
  email?: string
  consultationType: ConsultationType
  description?: string
}

export interface UpdateConsultationInput {
  status?: ConsultationStatus
  admin_notes?: string
}

export const CONSULTATION_TYPE_LABELS: Record<ConsultationType, string> = {
  'market-research': '市场调研服务',
  'due-diligence': '尽职调查服务',
  'overseas-expansion': '出海战略咨询',
  'custom-report': '定制化报告',
  'membership': '会员升级咨询',
  'other': '其他'
}

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  'pending': '待处理',
  'contacted': '已联系',
  'completed': '已完成',
  'cancelled': '已取消'
}
