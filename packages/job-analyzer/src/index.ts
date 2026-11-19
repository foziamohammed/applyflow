export type { JobAnalyzer } from './analyzer.js'
export { jobAnalyzer } from './analyzer.js'

export {
  levenshteinDistance,
  levenshteinSimilarity,
  normalizedMatch,
} from './levenshtein.js'

export {
  buildProfileText,
  computeKeywordOverlap,
  computeWeightedScore,
  matchEducation,
  scoreCompatibility,
  sumExperienceMonths,
} from './scoring.js'

export { identifyGaps } from './gaps.js'
export { buildTailoringConstraints } from './constraints.js'
