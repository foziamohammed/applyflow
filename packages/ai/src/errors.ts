export class AIUnavailableError extends Error {
  public readonly retryAfter: number

  constructor(message: string, retryAfter = 30) {
    super(message)
    this.name = 'AIUnavailableError'
    this.retryAfter = retryAfter
  }
}
