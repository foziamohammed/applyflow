// Client
export { getOpenAIClient, resetOpenAIClient } from './client.js'

// AI functions
export {
  extractCVProfile,
  extractJobRequirements,
  analyzeCompatibility,
  tailorCV,
  generateAnswers,
} from './functions.js'

// Retry utility
export { withRetry } from './retry.js'

// Errors
export { AIUnavailableError } from './errors.js'

// Types
export type { AIClient } from './types.js'
