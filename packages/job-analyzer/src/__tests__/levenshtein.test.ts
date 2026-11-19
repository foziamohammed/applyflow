import { describe, expect, it } from 'vitest'
import {
  levenshteinDistance,
  levenshteinSimilarity,
  normalizedMatch,
} from '../levenshtein.js'

describe('levenshtein', () => {
  describe('levenshteinDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(levenshteinDistance('typescript', 'typescript')).toBe(0)
    })

    it('returns length of other string when one is empty', () => {
      expect(levenshteinDistance('', 'hello')).toBe(5)
      expect(levenshteinDistance('world', '')).toBe(5)
    })

    it('correctly calculates single-char differences', () => {
      expect(levenshteinDistance('cat', 'bat')).toBe(1)
      expect(levenshteinDistance('cat', 'cats')).toBe(1)
      expect(levenshteinDistance('cats', 'cat')).toBe(1)
    })
  })

  describe('levenshteinSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(levenshteinSimilarity('node', 'node')).toBe(1.0)
      expect(levenshteinSimilarity('', '')).toBe(1.0)
    })

    it('returns 0.0 when one string is empty and other is not', () => {
      expect(levenshteinSimilarity('a', '')).toBe(0.0)
    })

    it('returns >= 0.85 for close typos', () => {
      // 'kubernetes' (10 chars), 'kubernets' (9 chars), dist = 1 -> 1 - 1/10 = 0.90
      expect(levenshteinSimilarity('kubernetes', 'kubernets')).toBeGreaterThanOrEqual(0.85)
    })
  })

  describe('normalizedMatch', () => {
    const profileSkills = ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker']

    it('matches exact skills case-insensitively', () => {
      expect(normalizedMatch('react', profileSkills)).toBe(true)
      expect(normalizedMatch('TYPESCRIPT', profileSkills)).toBe(true)
      expect(normalizedMatch('postgresql', profileSkills)).toBe(true)
    })

    it('matches skills with whitespace padding', () => {
      expect(normalizedMatch('  React  ', profileSkills)).toBe(true)
    })

    it('matches skills with minor typo (similarity >= 0.85)', () => {
      // 'Typescrip' (9 chars) vs 'typescript' (10 chars) -> dist 1 / 10 -> 0.9
      expect(normalizedMatch('Typescrip', profileSkills)).toBe(true)
    })

    it('returns false for completely absent skills', () => {
      expect(normalizedMatch('Python', profileSkills)).toBe(false)
      expect(normalizedMatch('Kubernetes', profileSkills)).toBe(false)
    })

    it('returns false for empty input', () => {
      expect(normalizedMatch('', profileSkills)).toBe(false)
      expect(normalizedMatch('   ', profileSkills)).toBe(false)
    })
  })
})
