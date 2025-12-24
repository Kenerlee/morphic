/**
 * PDF 调研报告类型定义
 * 用于 Admin 上传的 PDF 调研报告，在 Discovery 页面展示
 */

export interface ResearchReport {
  id: string
  title: string
  description: string // 报告简介
  pdfUrl: string // PDF 文件的存储路径或 URL
  pdfFileName: string // 原始文件名
  pdfFileSize: number // 文件大小 (bytes)
  coverImage?: string // 封面图片 URL
  category: ResearchReportCategory // 报告分类
  tags: string[] // 标签
  author?: string // 作者/来源
  publishDate?: Date // 发布日期
  isPublic: boolean // 是否公开
  viewCount: number // 浏览次数
  downloadCount: number // 下载次数
  createdAt: Date
  updatedAt: Date
  createdBy: string // 上传者 userId
}

export type ResearchReportCategory =
  | 'market_research' // 市场调研
  | 'industry_analysis' // 行业分析
  | 'competitor_analysis' // 竞争对手分析
  | 'consumer_insight' // 消费者洞察
  | 'trend_forecast' // 趋势预测
  | 'case_study' // 案例研究
  | 'other' // 其他

export const REPORT_CATEGORY_LABELS: Record<ResearchReportCategory, string> = {
  market_research: '市场调研',
  industry_analysis: '行业分析',
  competitor_analysis: '竞争对手分析',
  consumer_insight: '消费者洞察',
  trend_forecast: '趋势预测',
  case_study: '案例研究',
  other: '其他'
}

export interface CreateResearchReportInput {
  title: string
  description: string
  pdfUrl: string
  pdfFileName: string
  pdfFileSize: number
  coverImage?: string
  category: ResearchReportCategory
  tags?: string[]
  author?: string
  publishDate?: Date
  isPublic?: boolean
}

export interface UpdateResearchReportInput {
  title?: string
  description?: string
  coverImage?: string
  category?: ResearchReportCategory
  tags?: string[]
  author?: string
  publishDate?: Date
  isPublic?: boolean
}

export interface ResearchReportListResult {
  reports: ResearchReport[]
  total: number
  hasMore: boolean
}
