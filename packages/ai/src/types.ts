import type {
  ApplicationAnswer,
  CompatibilityResult,
  JobRequirements,
  ParsedCVProfile,
  TailoredCVContent,
} from '@applyflow/shared'

export interface AIClient {
  extractCVProfile(rawText: string): Promise<ParsedCVProfile>
  extractJobRequirements(rawDescription: string): Promise<JobRequirements>
  analyzeCompatibility(
    profile: ParsedCVProfile,
    requirements: JobRequirements
  ): Promise<CompatibilityResult>
  tailorCV(
    profile: ParsedCVProfile,
    requirements: JobRequirements,
    systemPrompt: string
  ): Promise<TailoredCVContent>
  generateAnswers(
    profile: ParsedCVProfile,
    requirements: JobRequirements,
    questions: string[],
    priorAnswers?: ApplicationAnswer[]
  ): Promise<string[]>
}

// Re-export the AI client interface
export type { AIClient as default }
