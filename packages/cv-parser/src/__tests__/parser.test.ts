import { describe, it, expect } from 'vitest'
import { parse, ParseError } from '../index.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('cv-parser', () => {
  it('throws ParseError with parse_error for a non-PDF/DOCX buffer', async () => {
    const fakeBuffer = Buffer.from('this is plain text, not a valid file')
    await expect(parse(fakeBuffer, 'application/pdf')).rejects.toThrow(ParseError)
  })

  it('ParseError has the correct reason field', async () => {
    const fakeBuffer = Buffer.from('fake content')
    try {
      await parse(fakeBuffer, 'application/pdf')
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError)
      expect((err as ParseError).reason).toBe('parse_error')
    }
  })
})
