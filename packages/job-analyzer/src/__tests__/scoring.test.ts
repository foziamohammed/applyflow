import { describe, expect, it } from 'vitest'
import type { JobRequirements, ParsedCVProfile, ScoreBreakdown } from '@applyflow/shared'
import {
  computeKeywordOverlap,
  computeWeightedScore,
  matchEducation,
  scoreCompatibility,
  sumExperienceMonths,
} from '../scoring.js'

describe('scoring', () => {
  const baseProfile: ParsedCVProfile = {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: null,
    location: 'London, UK',
    summary: 'Experienced Full-Stack TypeScript engineer with AWS experience',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
    languages: ['English'],
    education: [
      {
        institution: 'University of Oxford',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        startYear: 2016,
        endYear: 2019,
        gpa: null,
      },
    ],
    experience: [
      {
        company: 'TechCorp',
        title: 'Senior Engineer',
        location: 'London',
        startDate: '2021-01',
        endDate: '2023-01',
        current: false,
        bullets: ['Built scalable microservices in Node and TypeScript', 'Deployed to AWS ECS'],
      },
      {
        company: 'StartupX',
        title: 'Software Developer',
        location: 'London',
        startDate: '2019-06',
        endDate: '2020-12',
        current: false,
        bullets: ['Developed web applications using React and PostgreSQL'],
      },
    ],
    projects: [
      {
        name: 'OpenSource App',
        description: 'A tool for managing microservices',
        technologies: ['TypeScript', 'Docker'],
        url: null,
      },
    ],
    certifications: ['AWS Certified Solutions Architect'],
  }

  const baseRequirements: JobRequirements = {
    requiredSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    preferredSkills: ['AWS', 'GraphQL'],
    requiredYearsExperience: 3,
    requiredEducation: 'Bachelor in Computer Science',
    responsibilities: ['Build high quality web applications'],
    niceToHave: ['Experience with Docker'],
    keywords: ['typescript', 'react', 'aws', 'scalable', 'microservices'],
  }

  describe('scoreCompatibility', () => {
    it('returns 100 for skills when all required skills match', () => {
      const breakdown = scoreCompatibility(baseProfile, baseRequirements)
      expect(breakdown.skills).toBe(100)
    })

    it('returns 0 for skills when zero required skills match', () => {
      const noMatchReqs: JobRequirements = {
        ...baseRequirements,
        requiredSkills: ['Rust', 'Go', 'Haskell', 'Kubernetes'],
      }
      const breakdown = scoreCompatibility(baseProfile, noMatchReqs)
      expect(breakdown.skills).toBe(0)
    })

    it('returns proportional score for partial skills match', () => {
      const partialReqs: JobRequirements = {
        ...baseRequirements,
        // 2 matches (TypeScript, React) out of 4 -> 50%
        requiredSkills: ['TypeScript', 'React', 'Rust', 'Kubernetes'],
      }
      const breakdown = scoreCompatibility(baseProfile, partialReqs)
      expect(breakdown.skills).toBe(50)
    })

    it('returns 100 for skills when requiredSkills is empty', () => {
      const emptyReqs: JobRequirements = {
        ...baseRequirements,
        requiredSkills: [],
      }
      const breakdown = scoreCompatibility(baseProfile, emptyReqs)
      expect(breakdown.skills).toBe(100)
    })

    it('caps experience score at 100 when profile exceeds required years', () => {
      // Profile has ~42 months experience (24 + 18) = 3.5 years
      // Job requires 1 year (12 months) -> totalMonths/requiredMonths > 1
      const lowExpReqs: JobRequirements = {
        ...baseRequirements,
        requiredYearsExperience: 1,
      }
      const breakdown = scoreCompatibility(baseProfile, lowExpReqs)
      expect(breakdown.experience).toBe(100)
    })

    it('returns 100 for experience when requiredYearsExperience is 0 or null', () => {
      const zeroExpReqs: JobRequirements = {
        ...baseRequirements,
        requiredYearsExperience: 0,
      }
      const breakdown1 = scoreCompatibility(baseProfile, zeroExpReqs)
      expect(breakdown1.experience).toBe(100)

      const nullExpReqs: JobRequirements = {
        ...baseRequirements,
        requiredYearsExperience: null,
      }
      const breakdown2 = scoreCompatibility(baseProfile, nullExpReqs)
      expect(breakdown2.experience).toBe(100)
    })

    it('calculates keyword overlap score correctly', () => {
      const reqsWithKeywords: JobRequirements = {
        ...baseRequirements,
        keywords: ['typescript', 'react', 'aws', 'nonexistent1', 'nonexistent2'],
      }
      // 3 of 5 keywords present -> 60%
      const breakdown = scoreCompatibility(baseProfile, reqsWithKeywords)
      expect(breakdown.keywords).toBe(60)
    })

    it('guarantees all subscores are within [0, 100]', () => {
      const breakdown = scoreCompatibility(baseProfile, baseRequirements)
      expect(breakdown.skills).toBeGreaterThanOrEqual(0)
      expect(breakdown.skills).toBeLessThanOrEqual(100)
      expect(breakdown.experience).toBeGreaterThanOrEqual(0)
      expect(breakdown.experience).toBeLessThanOrEqual(100)
      expect(breakdown.education).toBeGreaterThanOrEqual(0)
      expect(breakdown.education).toBeLessThanOrEqual(100)
      expect(breakdown.keywords).toBeGreaterThanOrEqual(0)
      expect(breakdown.keywords).toBeLessThanOrEqual(100)
    })
  })

  describe('computeWeightedScore', () => {
    it('applies 40/30/15/15 weights correctly', () => {
      const breakdown: ScoreBreakdown = {
        skills: 100,      // 100 * 0.40 = 40
        experience: 80,   // 80 * 0.30  = 24
        education: 100,   // 100 * 0.15 = 15
        keywords: 60,     // 60 * 0.15  = 9
      }
      // Total = 40 + 24 + 15 + 9 = 88
      expect(computeWeightedScore(breakdown)).toBe(88)
    })

    it('returns 0 for all-zero breakdown', () => {
      expect(computeWeightedScore({ skills: 0, experience: 0, education: 0, keywords: 0 })).toBe(0)
    })

    it('returns 100 for all-100 breakdown', () => {
      expect(
        computeWeightedScore({ skills: 100, experience: 100, education: 100, keywords: 100 })
      ).toBe(100)
    })
  })

  describe('matchEducation', () => {
    it('returns 100 when requiredEducation is null or empty', () => {
      expect(matchEducation([], null)).toBe(100)
      expect(matchEducation([], '')).toBe(100)
      expect(matchEducation([], '   ')).toBe(100)
    })

    it('returns 0 when candidate has no education but education is required', () => {
      expect(matchEducation([], "Bachelor's Degree")).toBe(0)
    })

    it('returns 100 when candidate degree level matches or exceeds required', () => {
      const bachelorEdu = [
        {
          institution: 'MIT',
          degree: 'Bachelor of Science',
          field: 'CS',
          startYear: 2018,
          endYear: 2022,
          gpa: null,
        },
      ]
      expect(matchEducation(bachelorEdu, 'BSc Computer Science')).toBe(100)
      expect(matchEducation(bachelorEdu, 'Associate Degree')).toBe(100)
    })
  })
})
