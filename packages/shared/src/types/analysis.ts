export interface ScoreBreakdown {
  skills: number
  experience: number
  education: number
  keywords: number
}

export interface SkillGap {
  skill: string
  required: boolean
  severity: 'low' | 'medium' | 'high'
}

export interface CompatibilityAnalysis {
  id: string
  userId: string
  cvId: string
  jobId: string
  score: number
  scoreBreakdown: ScoreBreakdown
  gaps: SkillGap[]
  strengths: string[]
  recommendations: string[]
  createdAt: Date
}

export interface CompatibilityResult {
  strengths: string[]
  recommendations: string[]
}

export interface TailoringConstraints {
  forbiddenAdditions: string[]
  emphasize: string[]
  deprioritize: string[]
}
