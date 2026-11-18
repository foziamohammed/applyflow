import mammoth from 'mammoth'
import { ParseError } from './errors.js'

export async function parseDOCX(buffer: Buffer): Promise<string> {
  let result: { value: string }
  try {
    result = await mammoth.extractRawText({ buffer })
  } catch (err) {
    throw new ParseError('parse_error', `DOCX parsing failed: ${(err as Error).message}`)
  }
  if (!result.value || result.value.trim().length === 0) {
    throw new ParseError('empty_text', 'DOCX produced no extractable text')
  }
  return result.value.trim()
}
