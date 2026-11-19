import type { JobRequirements, ParsedCVProfile, SkillGap } from '@applyflow/shared'
import { normalizedMatch } from './levenshtein.js'

export function identifyGaps(
  profile: ParsedCVProfile,
  requirements: JobRequirements
): SkillGap[] {
  const gaps: SkillGap[] = []
  const profileSkills = profile.skills ?? []
  const seen = new Set<string>()

  const requiredSkills = requirements.requiredSkills ?? []
  for (const skill of requiredSkills) {
    const trimmed = skill.trim()
    if (!trimmed) continue

    if (!normalizedMatch(trimmed, profileSkills)) {
      const lower = trimmed.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        gaps.push({
          skill: trimmed,
          required: true,
          severity: 'high',
        })
      }
    }
  }

  const preferredSkills = requirements.preferredSkills ?? []
  for (const skill of preferredSkills) {
    const trimmed = skill.trim()
    if (!trimmed) continue

    const lower = trimmed.toLowerCase()
    if (seen.has(lower)) continue

    if (!normalizedMatch(trimmed, profileSkills)) {
      seen.add(lower)
      gaps.push({
        skill: trimmed,
        required: false,
        severity: 'medium',
      })
    }
  }

  return gaps
}
