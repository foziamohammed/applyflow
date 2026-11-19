import { describe, expect, it } from 'vitest'
import type { JobRequirements, ParsedCVProfile } from '@applyflow/shared'
import { identifyGaps } from '../gaps.js'

describe('identifyGaps', () => {
  const profile: ParsedCVProfile = {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: null,
    location: null,
    summary: null,
    skills: ['TypeScript', 'React', 'Node.js'],
    languages: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
  }

  it('identifies missing required skills as required: true and high severity', () => {
    const requirements: JobRequirements = {
      requiredSkills: ['TypeScript', 'React', 'Docker', 'Kubernetes'],
      preferredSkills: [],
      requiredYearsExperience: 2,
      requiredEducation: null,
      responsibilities: [],
      niceToHave: [],
      keywords: [],
    }

    const gaps = identifyGaps(profile, requirements)

    expect(gaps).toHaveLength(2)
    expect(gaps).toEqual([
      { skill: 'Docker', required: true, severity: 'high' },
      { skill: 'Kubernetes', required: true, severity: 'high' },
    ])
  })

  it('identifies missing preferred skills as required: false and medium severity', () => {
    const requirements: JobRequirements = {
      requiredSkills: ['TypeScript'],
      preferredSkills: ['GraphQL', 'AWS'],
      requiredYearsExperience: null,
      requiredEducation: null,
      responsibilities: [],
      niceToHave: [],
      keywords: [],
    }

    const gaps = identifyGaps(profile, requirements)

    expect(gaps).toHaveLength(2)
    expect(gaps).toEqual([
      { skill: 'GraphQL', required: false, severity: 'medium' },
      { skill: 'AWS', required: false, severity: 'medium' },
    ])
  })

  it('does not emit gaps for skills present after normalization', () => {
    const requirements: JobRequirements = {
      requiredSkills: ['typescript', 'REACT', '  Node.js  '],
      preferredSkills: [],
      requiredYearsExperience: null,
      requiredEducation: null,
      responsibilities: [],
      niceToHave: [],
      keywords: [],
    }

    const gaps = identifyGaps(profile, requirements)
    expect(gaps).toHaveLength(0)
  })

  it('deduplicates skills present in both required and preferred', () => {
    const requirements: JobRequirements = {
      requiredSkills: ['Python'],
      preferredSkills: ['Python', 'Golang'],
      requiredYearsExperience: null,
      requiredEducation: null,
      responsibilities: [],
      niceToHave: [],
      keywords: [],
    }

    const gaps = identifyGaps(profile, requirements)
    expect(gaps).toHaveLength(2)
    const pythonGap = gaps.find((g) => g.skill === 'Python')
    expect(pythonGap).toBeDefined()
    expect(pythonGap?.required).toBe(true)
    expect(pythonGap?.severity).toBe('high')
  })
})
