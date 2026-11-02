import { describe, expect, it } from 'vitest'
import { validateAttachmentFile } from './attachments'

function makeFile(size: number, type = 'application/pdf') {
  return new File([new Uint8Array(size)], 'brief.pdf', { type })
}

describe('validateAttachmentFile', () => {
  it('accepts a valid PDF', () => {
    expect(validateAttachmentFile(makeFile(1024))).toBeNull()
  })

  it('rejects files larger than 10 MB', () => {
    expect(validateAttachmentFile(makeFile(10 * 1024 * 1024 + 1))).toBe(
      'Attachments must be 10 MB or smaller',
    )
  })

  it('rejects a disallowed MIME type', () => {
    expect(validateAttachmentFile(makeFile(1024, 'application/zip'))).toBe(
      'This file type is not supported',
    )
  })
})
