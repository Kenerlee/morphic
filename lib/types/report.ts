export interface Report {
  id: string
  userId: string
  title: string
  content: string // HTML format from rich text editor
  coverImage?: string
  metadata: ReportMetadata
  createdAt: Date
  updatedAt: Date
}

export interface ReportMetadata {
  company?: string
  product?: string
  destination?: string
  industry?: string
  wordCount?: number
  tags?: string[]
}

export interface CreateReportInput {
  title: string
  content: string
  coverImage?: string
  metadata?: Partial<ReportMetadata>
}

export interface UpdateReportInput {
  title?: string
  content?: string
  coverImage?: string
  metadata?: Partial<ReportMetadata>
}

// Deep Research types
export interface DeepResearchSession {
  id: string
  userId: string
  query: string
  status: 'pending' | 'researching' | 'completed' | 'error'
  steps: ResearchStep[]
  finalReport?: string
  createdAt: Date
  updatedAt: Date
}

export interface ResearchStep {
  id: string
  type: 'question' | 'search' | 'analysis' | 'synthesis'
  title: string
  content: string
  results?: any
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  startedAt?: Date
  completedAt?: Date
}

export interface DeepResearchProgress {
  sessionId: string
  currentStep: number
  totalSteps: number
  status: DeepResearchSession['status']
  steps: ResearchStep[]
}
