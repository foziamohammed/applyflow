import { AIUnavailableError } from './errors.js'

function isRetryableStatusCode(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600)
}

/**
 * Retry a function with exponential backoff on 429 and 5xx errors.
 * Delays: 1 s, 2 s, 4 s (Requirement 13).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  const delays = [1000, 2000, 4000]

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const status = getStatusCode(error)
      const isRetryable = status !== null && isRetryableStatusCode(status)

      if (!isRetryable || attempt >= maxAttempts) {
        if (isRetryable) {
          console.error(
            `[AI] All ${maxAttempts} retry attempts exhausted. Last error:`,
            error
          )
          throw new AIUnavailableError(
            `AI service unavailable after ${maxAttempts} attempts`,
            30
          )
        }
        throw error
      }

      const delay = delays[attempt - 1] ?? 4000
      console.warn(
        `[AI] Attempt ${attempt}/${maxAttempts} failed with status ${status}. ` +
          `Retrying in ${delay}ms...`
      )
      await sleep(delay)
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new AIUnavailableError('AI service unavailable')
}

function getStatusCode(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: unknown }).status
    if (typeof status === 'number') return status
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
