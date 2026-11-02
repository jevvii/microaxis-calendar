import { describe, expect, it } from 'vitest'
import { isWithinQuietHours, normalizeNotificationPreferences } from './notificationPreferences'

const preferences = normalizeNotificationPreferences({})

describe('quiet hours', () => {
  it('treats late evening as quiet across midnight', () => {
    expect(isWithinQuietHours(new Date('2026-11-03T23:30:00'), preferences)).toBe(true)
  })

  it('treats early morning as quiet across midnight', () => {
    expect(isWithinQuietHours(new Date('2026-11-03T07:30:00'), preferences)).toBe(true)
  })

  it('treats midday as outside quiet hours', () => {
    expect(isWithinQuietHours(new Date('2026-11-03T12:00:00'), preferences)).toBe(false)
  })
})
