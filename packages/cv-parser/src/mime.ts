import { fileTypeFromBuffer } from 'file-type'

export type SupportedMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function detectMimeType(buffer: Buffer): Promise<SupportedMimeType | null> {
  const result = await fileTypeFromBuffer(buffer)
  if (!result) return null
  if (result.mime === 'application/pdf') return 'application/pdf'
  if (
    result.mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return null
}
