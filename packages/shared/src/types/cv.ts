export interface EducationEntry {
  institution: string
  degree: string
  field: string | null
  startYear: number | null
  endYear: number | null
  gpa: string | null
}

export interface ExperienceEntry {
  company: string
  title: string
  location: string | null
  startDate: string
  endDate: string | null
  current: boolean
  bullets: string[]
}

export interface ProjectEntry {
  name: string
  description: string
  technologies: string[]
  url: string | null
}

export interface ParsedCVProfile {
  fullName: string
  email: string | null
  phone: string | null
  location: string | null
  summary: string | null
  skills: string[]
  languages: string[]
  education: EducationEntry[]
  experience: ExperienceEntry[]
  projects: ProjectEntry[]
  certifications: string[]
}

export interface CV {
  id: string
  userId: string
  filename: string
  storageKey: string
  mimeType: string
  parsedText: string | null
  parsedProfile: ParsedCVProfile | null
  isActive: boolean
  createdAt: Date
}

export interface CVChange {
  section: 'summary' | 'skills' | 'experience' | 'projects'
  changeType: 'reorder' | 'rewrite' | 'omit' | 'emphasize'
  rationale: string
}

export interface TailoredCVContent {
  summary: string
  skills: string[]
  experience: ExperienceEntry[]
  projects: ProjectEntry[]
  education: EducationEntry[]
  changeLog: CVChange[]
}

export interface TailoredCV {
  id: string
  userId: string
  baseCvId: string
  jobId: string
  analysisId: string
  content: TailoredCVContent
  storageKey: string | null
  createdAt: Date
}
