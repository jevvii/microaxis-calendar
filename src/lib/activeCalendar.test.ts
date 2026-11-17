import { describe, expect, it } from 'vitest'
import type { Calendar } from '../types/domain'
import { resolveActiveCalendar } from './activeCalendar'

function makeCalendar(overrides: Partial<Calendar> & Pick<Calendar, 'id' | 'name'>): Calendar {
  return {
    workspaceId: 'ws-1',
    ownerId: null,
    teamId: null,
    description: null,
    kind: 'shared',
    color: '#0C7A43',
    visibility: 'workspace',
    createdBy: 'u-1',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    deletedAt: null,
    shares: [],
    ...overrides,
  }
}

const personal = makeCalendar({
  id: 'cal-personal',
  name: 'Mara’s calendar',
  kind: 'personal',
  ownerId: 'u-1',
})
const team = makeCalendar({ id: 'cal-team', name: 'Product', kind: 'team', teamId: 'team-1' })
const readOnly = makeCalendar({ id: 'cal-readonly', name: 'View only' })

describe('resolveActiveCalendar', () => {
  it('prefers the writable URL selection', () => {
    expect(
      resolveActiveCalendar({
        calendars: [personal, team, readOnly],
        writableCalendars: [personal, team],
        urlCalendarId: 'cal-team',
        rememberedCalendarId: 'cal-personal',
        userId: 'u-1',
      })?.id,
    ).toBe('cal-team')
  })

  it('falls back to the remembered calendar when the URL is cleared', () => {
    expect(
      resolveActiveCalendar({
        calendars: [personal, team],
        writableCalendars: [personal, team],
        urlCalendarId: null,
        rememberedCalendarId: 'cal-team',
        userId: 'u-1',
      })?.id,
    ).toBe('cal-team')
  })

  it('ignores a read-only URL selection and uses the remembered writable calendar', () => {
    expect(
      resolveActiveCalendar({
        calendars: [personal, team, readOnly],
        writableCalendars: [personal, team],
        urlCalendarId: 'cal-readonly',
        rememberedCalendarId: 'cal-team',
        userId: 'u-1',
      })?.id,
    ).toBe('cal-team')
  })

  it('falls back to the personal calendar, then the first writable calendar', () => {
    expect(
      resolveActiveCalendar({
        calendars: [team, personal],
        writableCalendars: [team, personal],
        urlCalendarId: null,
        rememberedCalendarId: null,
        userId: 'u-1',
      })?.id,
    ).toBe('cal-personal')

    expect(
      resolveActiveCalendar({
        calendars: [team],
        writableCalendars: [team],
        urlCalendarId: null,
        rememberedCalendarId: null,
        userId: 'u-1',
      })?.id,
    ).toBe('cal-team')
  })

  it('returns null when nothing is writable', () => {
    expect(
      resolveActiveCalendar({
        calendars: [readOnly],
        writableCalendars: [],
        urlCalendarId: 'cal-readonly',
        rememberedCalendarId: null,
        userId: 'u-1',
      }),
    ).toBeNull()
  })
})
