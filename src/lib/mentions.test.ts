import { describe, expect, it } from 'vitest'
import { parseMentions } from './mentions'

const members = [
  { userId: 'u-1', fullName: 'Mara Velasco' },
  { userId: 'u-2', fullName: 'Ivo Santos' },
  { userId: 'u-3', fullName: 'Rin Takahashi' },
]

describe('parseMentions', () => {
  it('parses display names containing spaces', () => {
    expect(parseMentions('@Mara Velasco can you check step 3?', members)).toEqual([
      { userId: 'u-1', fullName: 'Mara Velasco', start: 0, end: 13 },
    ])
  })

  it('parses multiple and repeated mentions without duplicating the same span', () => {
    const mentions = parseMentions(
      '@Mara Velasco and @Ivo Santos — @Mara Velasco please review.',
      members,
    )

    expect(mentions.map((mention) => mention.userId)).toEqual(['u-1', 'u-2', 'u-1'])
    expect(new Set(mentions.map((mention) => `${mention.userId}:${mention.start}`)).size).toBe(3)
  })

  it('does not match a partial display name', () => {
    expect(parseMentions('@Mara should not match Mara Velasco', members)).toEqual([])
  })

  it('is case-insensitive', () => {
    expect(parseMentions('@ivo santos take a look', members)).toEqual([
      { userId: 'u-2', fullName: 'Ivo Santos', start: 0, end: 11 },
    ])
  })

  it('ignores an @ that is part of an email address', () => {
    expect(parseMentions('Write to mara@microaxis.test', members)).toEqual([])
  })
})
