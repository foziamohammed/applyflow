export type Platform = 'linkedin' | 'indeed' | 'greenhouse' | 'manual' | 'unknown'

export interface JobRequirements {
  requiredSkills: string[]
  preferredSkills: string[]
  requiredYearsExperience: number | null
  requiredEducation: string | null
  responsibilities: string[]
  niceToHave: string[]
  keywords: string[]
  inferredTitle?: string
  inferredCompany?: string
}

export interface Job {
  id: string
  userId: string
  sourceUrl: string
  platform: Platform
  title: string
  company: string
  location: string | null
  remote: boolean
  rawDescription: string
  requirements: JobRequirements | null
  createdAt: Date
}
