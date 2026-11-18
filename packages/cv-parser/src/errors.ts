export type ParseFailureReason = 'empty_text' | 'parse_error'

export class ParseError extends Error {
  constructor(
    public readonly reason: ParseFailureReason,
    message: string
  ) {
    super(message)
    this.name = 'ParseError'
  }
}
