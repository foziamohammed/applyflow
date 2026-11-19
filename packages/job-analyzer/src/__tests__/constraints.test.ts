import { describe, expect, it } from 'vitest'
import type { JobRequirements, ParsedCVProfile, SkillGap } from '@applyflow/shared'
import { buildTailoringConstraints } from '../constraints.js'

describe('buildTailoringConstraints', () => {
  const profile: ParsedCVProfile = {
    fullName: 'Jane Doe',
    email: null,
    phone: null,
    location: null,
    summary: null,
    skills: ['TypeScript', 'React', 'Node.js', 'Cobol', 'Fortran'],
    languages: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
  }

  const gaps: SkillGap[] = [
    { skill: 'AWS', required: true, severity: 'high' },
    { skill: 'Docker', required: false, severity: 'medium' },
  ]

  it('populates forbiddenAdditions from gaps', () => {
    const constraints = buildTailoringConstraints(profile, gaps)
    expect(constraints.forbiddenAdditions).toEqual(['AWS', 'Docker'])
  })

  it('separates emphasize and deprioritize based on requirements when provided', () => {
    const requirements: JobRequirements = {
      requiredSkills: ['TypeScript', 'React'],
      preferredSkills: ['Node.js'],
      requiredYearsExperience: null,
      requiredEducation: null,
      responsibilities: [],
      niceToHave: [],
      keywords: [],
    }

    const constraints = buildTailoringConstraints(profile, gaps, requirements)
    expect(constraints.forbiddenAdditions).toEqual(['AWS', 'Docker'])
    expect(constraints.emphasize).toEqual(['TypeScript', 'React', 'Node.js'])
    expect(constraints.deprioritize).toEqual(['Cobol', 'Fortran'])
  })
})
