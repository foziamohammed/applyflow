import OpenAI from 'openai'

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env['OPENAI_API_KEY']
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is not set. ' +
          'Set it before using AI features.'
      )
    }
    _client = new OpenAI({ apiKey })
  }
  return _client
}

/**
 * Reset the singleton client. Useful for testing.
 */
export function resetOpenAIClient(): void {
  _client = null
}
