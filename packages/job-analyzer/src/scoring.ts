import type {
  EducationEntry,
  ExperienceEntry,
  JobRequirements,
  ParsedCVProfile,
  ScoreBreakdown,
} from '@applyflow/shared'
import { normalizedMatch } from './levenshtein.js'

const EDUCATION_LEVEL_MAP: Record<string, number> = {
  phd: 4,
  doctorate: 4,
  doctoral: 4,
  master: 3,
  masters: 3,
  ms: 3,
  msc: 3,
  ma: 3,
  mba: 3,
  meng: 3,
  bachelor: 2,
  bachelors: 2,
  bs: 2,
  bsc: 2,
  ba: 2,
  beng: 2,
  undergraduate: 2,
  associate: 1,
  diploma: 1,
  certificate: 1,
}

function parseYearMonth(dateStr: string): { year: number; month: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  const trimmed = dateStr.trim()
  if (!trimmed) return null

  // Format: YYYY-MM or YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})/)
  if (isoMatch && isoMatch[1] && isoMatch[2]) {
    const y = parseInt(isoMatch[1], 10)
    const m = parseInt(isoMatch[2], 10)
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      return { year: y, month: m }
    }
  }

  // Format: MM/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{4})/)
  if (slashMatch && slashMatch[1] && slashMatch[2]) {
    const m = parseInt(slashMatch[1], 10)
    const y = parseInt(slashMatch[2], 10)
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      return { year: y, month: m }
    }
  }

  // Format: YYYY
  const yearMatch = trimmed.match(/^(\d{4})$/)
  if (yearMatch && yearMatch[1]) {
    const y = parseInt(yearMatch[1], 10)
    if (!isNaN(y)) {
      return { year: y, month: 1 }
    }
  }

  // Fallback to Date.parse
  const parsed = Date.parse(trimmed)
  if (!isNaN(parsed)) {
    const d = new Date(parsed)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  }

  return null
}

export function sumExperienceMonths(experience: ExperienceEntry[]): number {
  if (!experience || experience.length === 0) return 0

  const now = new Date()
  const nowYearMonth = { year: now.getFullYear(), month: now.getMonth() + 1 }

  let totalMonths = 0

  for (const entry of experience) {
    const start = parseYearMonth(entry.startDate)
    if (!start) continue

    const end =
      entry.current || !entry.endDate ? nowYearMonth : parseYearMonth(entry.endDate) ?? nowYearMonth

    const months = (end.year - start.year) * 12 + (end.month - start.month)
    totalMonths += Math.max(1, months)
  }

  return Math.max(0, totalMonths)
}

function extractEducationLevel(text: string): number {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
  let maxLevel = 0
  for (const word of words) {
    const level = EDUCATION_LEVEL_MAP[word]
    if (level !== undefined && level > maxLevel) {
      maxLevel = level
    }
  }
  return maxLevel
}

export function matchEducation(
  education: EducationEntry[],
  requiredEducation: string | null
): number {
  if (!requiredEducation || requiredEducation.trim() === '') {
    return 100
  }

  if (!education || education.length === 0) {
    return 0
  }

  const reqLevel = extractEducationLevel(requiredEducation)

  let maxProfileLevel = 0
  for (const entry of education) {
    const degLevel = extractEducationLevel(entry.degree)
    const fieldLevel = entry.field ? extractEducationLevel(entry.field) : 0
    const entryLevel = Math.max(degLevel, fieldLevel)
    if (entryLevel > maxProfileLevel) {
      maxProfileLevel = entryLevel
    }
  }

  if (reqLevel === 0) {
    // Required education doesn't specify a degree level (e.g. "Computer Science")
    const reqLower = requiredEducation.toLowerCase().trim()
    const matchesKeyword = education.some((e) => {
      const deg = e.degree.toLowerCase()
      const field = (e.field ?? '').toLowerCase()
      const inst = e.institution.toLowerCase()
      return deg.includes(reqLower) || field.includes(reqLower) || reqLower.includes(deg) || (field && reqLower.includes(field))
    })

    if (matchesKeyword) return 100
    return maxProfileLevel > 0 ? 75 : 50
  }

  if (maxProfileLevel >= reqLevel) {
    return 100
  }

  if (maxProfileLevel > 0) {
    return Math.min(100, Math.max(0, Math.round((maxProfileLevel / reqLevel) * 80)))
  }

  return 20
}

export function buildProfileText(profile: ParsedCVProfile): string {
  const parts: string[] = []

  if (profile.fullName) parts.push(profile.fullName)
  if (profile.summary) parts.push(profile.summary)
  if (profile.skills && profile.skills.length > 0) parts.push(...profile.skills)
  if (profile.languages && profile.languages.length > 0) parts.push(...profile.languages)
  if (profile.certifications && profile.certifications.length > 0) parts.push(...profile.certifications)

  if (profile.experience) {
    for (const exp of profile.experience) {
      if (exp.company) parts.push(exp.company)
      if (exp.title) parts.push(exp.title)
      if (exp.location) parts.push(exp.location)
      if (exp.bullets && exp.bullets.length > 0) parts.push(...exp.bullets)
    }
  }

  if (profile.education) {
    for (const edu of profile.education) {
      if (edu.institution) parts.push(edu.institution)
      if (edu.degree) parts.push(edu.degree)
      if (edu.field) parts.push(edu.field)
    }
  }

  if (profile.projects) {
    for (const proj of profile.projects) {
      if (proj.name) parts.push(proj.name)
      if (proj.description) parts.push(proj.description)
      if (proj.technologies && proj.technologies.length > 0) parts.push(...proj.technologies)
    }
  }

  return parts.join(' ').toLowerCase()
}

export function computeKeywordOverlap(keywords: string[], profileText: string): number {
  if (!keywords || keywords.length === 0) {
    return 100
  }

  const normalizedProfileText = profileText.toLowerCase()
  let matched = 0

  for (const keyword of keywords) {
    const kwNorm = keyword.toLowerCase().trim()
    if (!kwNorm) continue
    if (normalizedProfileText.includes(kwNorm)) {
      matched++
    }
  }

  const score = Math.floor((matched / keywords.length) * 100)
  return Math.min(100, Math.max(0, score))
}

export function scoreCompatibility(
  profile: ParsedCVProfile,
  requirements: JobRequirements
): ScoreBreakdown {
  // 1. Skills score
  const requiredSkills = requirements.requiredSkills ?? []
  let requiredMatches = 0
  for (const skill of requiredSkills) {
    if (normalizedMatch(skill, profile.skills ?? [])) {
      requiredMatches++
    }
  }

  const skillsScore =
    requiredSkills.length === 0
      ? 100
      : Math.min(100, Math.max(0, Math.floor((requiredMatches / requiredSkills.length) * 100)))

  // 2. Experience score
  const totalMonths = sumExperienceMonths(profile.experience ?? [])
  const requiredMonths = (requirements.requiredYearsExperience ?? 0) * 12
  const experienceScore =
    requiredMonths === 0
      ? 100
      : Math.min(100, Math.max(0, Math.floor((totalMonths / requiredMonths) * 100)))

  // 3. Education score
  const educationScore = Math.min(
    100,
    Math.max(0, matchEducation(profile.education ?? [], requirements.requiredEducation))
  )

  // 4. Keyword score
  const profileText = buildProfileText(profile)
  const keywordScore = Math.min(
    100,
    Math.max(0, computeKeywordOverlap(requirements.keywords ?? [], profileText))
  )

  return {
    skills: skillsScore,
    experience: experienceScore,
    education: educationScore,
    keywords: keywordScore,
  }
}

export function computeWeightedScore(breakdown: ScoreBreakdown): number {
  const weighted =
    breakdown.skills * 0.4 +
    breakdown.experience * 0.3 +
    breakdown.education * 0.15 +
    breakdown.keywords * 0.15

  return Math.min(100, Math.max(0, Math.round(weighted)))
}
