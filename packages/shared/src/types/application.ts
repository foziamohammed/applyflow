export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn'

export interface ApplicationAnswer {
  question: string
  answer: string
  source: 'ai-generated' | 'user-edited' | 'user-written'
}

export interface Application {
  id: string
  userId: string
  jobId: string
  cvId: string
  tailoredCvId: string | null
  analysisId: string | null
  status: ApplicationStatus
  answers: ApplicationAnswer[]
  submittedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
