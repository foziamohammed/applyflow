import pdfParse from 'pdf-parse'
import { ParseError } from './errors.js'

export async function parsePDF(buffer: Buffer): Promise<string> {
  let result: { text: string }
  try {
    result = await pdfParse(buffer)
  } catch (err) {
    throw new ParseError('parse_error', `PDF parsing failed: ${(err as Error).message}`)
  }
  if (!result.text || result.text.trim().length === 0) {
    throw new ParseError('empty_text', 'PDF produced no extractable text (possibly a scanned image)')
  }
  return result.text.trim()
}
