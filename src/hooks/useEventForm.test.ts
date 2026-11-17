import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialDraft, nextHourLocal } from './useEventForm'

describe('event form time defaults', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the viewer time zone for a new event', () => {
    const draft = createInitialDraft([], [], null, 'Europe/London')
    expect(draft.timeZone).toBe('Europe/London')
  })

  it('finds the next hour in the event time zone, not the browser hour', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-03T01:30:00.000Z'))

    expect(nextHourLocal('Asia/Kolkata')).toBe('2026-11-03T08:00')
  })
})
