export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  const aLen = a.length
  const bLen = b.length
  if (aLen === 0) return bLen
  if (bLen === 0) return aLen

  let prevRow = new Array<number>(bLen + 1)
  let currRow = new Array<number>(bLen + 1)

  for (let j = 0; j <= bLen; j++) {
    prevRow[j] = j
  }

  for (let i = 1; i <= aLen; i++) {
    currRow[0] = i
    const charA = a.charCodeAt(i - 1)

    for (let j = 1; j <= bLen; j++) {
      const charB = b.charCodeAt(j - 1)
      const cost = charA === charB ? 0 : 1

      const deletion = (prevRow[j] as number) + 1
      const insertion = (currRow[j - 1] as number) + 1
      const substitution = (prevRow[j - 1] as number) + cost

      currRow[j] = Math.min(deletion, insertion, substitution)
    }

    const temp = prevRow
    prevRow = currRow
    currRow = temp
  }

  return prevRow[bLen] as number
}

export function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1.0
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1.0
  const distance = levenshteinDistance(a, b)
  return 1 - distance / maxLen
}

export function normalizedMatch(required: string, profileSkills: string[]): boolean {
  const requiredNorm = required.toLowerCase().trim()
  if (!requiredNorm) return false

  return profileSkills.some((s) => {
    const sNorm = s.toLowerCase().trim()
    if (!sNorm) return false
    if (sNorm === requiredNorm) return true
    return levenshteinSimilarity(sNorm, requiredNorm) >= 0.85
  })
}
