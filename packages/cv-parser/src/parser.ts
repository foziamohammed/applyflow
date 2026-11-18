import { detectMimeType, type SupportedMimeType } from './mime.js'
import { parsePDF } from './pdf.js'
import { parseDOCX } from './docx.js'
import { ParseError } from './errors.js'

export async function parse(buffer: Buffer, declaredMimeType: string): Promise<string> {
  const detectedMime = await detectMimeType(buffer)

  if (detectedMime === null) {
    throw new ParseError(
      'parse_error',
      `Unsupported or undetectable file type. Declared: ${declaredMimeType}`
    )
  }

  if (detectedMime !== declaredMimeType) {
    throw new ParseError(
      'parse_error',
      `File type mismatch: declared ${declaredMimeType} but magic bytes indicate ${detectedMime}`
    )
  }

  if (detectedMime === 'application/pdf') {
    return parsePDF(buffer)
  }

  return parseDOCX(buffer)
}
