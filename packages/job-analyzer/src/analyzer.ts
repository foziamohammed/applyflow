import type {
  JobRequirements,
  ParsedCVProfile,
  ScoreBreakdown,
  SkillGap,
  TailoringConstraints,
} from '@applyflow/shared'
import { buildTailoringConstraints } from './constraints.js'
import { identifyGaps } from './gaps.js'
import { computeWeightedScore, scoreCompatibility } from './scoring.js'

export interface JobAnalyzer {
  score(profile: ParsedCVProfile, requirements: JobRequirements): ScoreBreakdown
  scoreCompatibility(profile: ParsedCVProfile, requirements: JobRequirements): ScoreBreakdown
  identifyGaps(profile: ParsedCVProfile, requirements: JobRequirements): SkillGap[]
  buildTailoringConstraints(
    profile: ParsedCVProfile,
    gaps: SkillGap[],
    requirements?: JobRequirements
  ): TailoringConstraints
  computeWeightedScore(breakdown: ScoreBreakdown): number
}

export const jobAnalyzer: JobAnalyzer = {
  score: scoreCompatibility,
  scoreCompatibility,
  identifyGaps,
  buildTailoringConstraints,
  computeWeightedScore,
}
