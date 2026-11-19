import type { JobRequirements, ParsedCVProfile, SkillGap, TailoringConstraints } from '@applyflow/shared'
import { normalizedMatch } from './levenshtein.js'

export function buildTailoringConstraints(
  profile: ParsedCVProfile,
  gaps: SkillGap[],
  requirements?: JobRequirements
): TailoringConstraints {
  const forbiddenAdditions = gaps.map((g) => g.skill)
  const profileSkills = profile.skills ?? []

  let emphasize: string[] = []
  let deprioritize: string[] = []

  if (requirements) {
    const jobSkills = [
      ...(requirements.requiredSkills ?? []),
      ...(requirements.preferredSkills ?? []),
      ...(requirements.keywords ?? []),
    ]

    emphasize = profileSkills.filter((skill) =>
      jobSkills.some((jobSkill) => normalizedMatch(jobSkill, [skill]))
    )

    deprioritize = profileSkills.filter((skill) => !emphasize.includes(skill))
  } else {
    const gapSkillNames = new Set(gaps.map((g) => g.skill.toLowerCase()))
    emphasize = profileSkills.filter((skill) => !gapSkillNames.has(skill.toLowerCase()))
    deprioritize = []
  }

  return {
    forbiddenAdditions,
    emphasize,
    deprioritize,
  }
}
