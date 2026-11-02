import { describe, expect, it } from 'vitest'
import type { Calendar, CalendarMemberships, Event } from '../types/domain'
import { calendarRole, canEditEvent, hasCalendarAccess } from './permissions'

const baseCalendar: Calendar = {
  id: 'cal-1',
  workspaceId: 'ws-1',
  ownerId: 'u-owner',
  teamId: null,
  name: 'Mara’s calendar',
  description: null,
  kind: 'personal',
  color: '#0C7A43',
  visibility: 'private',
  createdBy: 'u-owner',
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  deletedAt: null,
  shares: [],
}

const baseEvent: Event = {
  id: 'evt-1',
  workspaceId: 'ws-1',
  calendarId: 'cal-1',
  calendarKind: 'personal',
  createdBy: 'u-owner',
  title: 'OceanJet release review',
  description: null,
  location: null,
  startsAt: '2026-11-03T01:30:00.000Z',
  endsAt: '2026-11-03T02:30:00.000Z',
  allDay: false,
  timeZone: 'Asia/Manila',
  categoryId: null,
  priority: 'normal',
  status: 'scheduled',
  visibility: 'calendar',
  recurrenceRule: null,
  recurrenceUntil: null,
  recurrenceExceptions: [],
  version: 1,
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  deletedAt: null,
}

const noMemberships: CalendarMemberships = {}

describe('calendarRole', () => {
  it('gives a personal calendar owner the manager role', () => {
    expect(calendarRole(baseCalendar, 'u-owner', noMemberships)).toBe('manager')
    expect(hasCalendarAccess(baseCalendar, 'u-owner', noMemberships)).toBe(true)
  })

  it('does not give a personal calendar owner access to another personal calendar', () => {
    const otherCalendar = { ...baseCalendar, ownerId: 'u-other' }
    expect(calendarRole(otherCalendar, 'u-owner', noMemberships)).toBeNull()
    expect(hasCalendarAccess(otherCalendar, 'u-owner', noMemberships)).toBe(false)
  })

  it('honors an explicit personal share as viewer', () => {
    const shared = {
      ...baseCalendar,
      shares: [
        {
          id: 'share-1',
          calendarId: 'cal-1',
          subjectType: 'user' as const,
          subjectId: 'u-viewer',
          role: 'viewer' as const,
          hideDetails: false,
        },
      ],
    }

    expect(calendarRole(shared, 'u-viewer', noMemberships)).toBe('viewer')
    expect(hasCalendarAccess(shared, 'u-viewer', noMemberships)).toBe(true)
  })

  it('applies a team share only to members of that team', () => {
    const shared = {
      ...baseCalendar,
      shares: [
        {
          id: 'share-2',
          calendarId: 'cal-1',
          subjectType: 'team' as const,
          subjectId: 'team-product',
          role: 'viewer' as const,
          hideDetails: false,
        },
      ],
    }

    expect(
      calendarRole(shared, 'u-member', {
        teamIds: ['team-product'],
        teamRole: 'member',
      }),
    ).toBe('viewer')
    expect(calendarRole(shared, 'u-outsider', { teamIds: [] })).toBeNull()
  })

  it('applies a workspace share only to members of that workspace', () => {
    const shared = {
      ...baseCalendar,
      shares: [
        {
          id: 'share-3',
          calendarId: 'cal-1',
          subjectType: 'workspace' as const,
          subjectId: 'ws-1',
          role: 'participant' as const,
          hideDetails: true,
        },
      ],
    }

    expect(calendarRole(shared, 'u-member', { workspaceRole: 'member' })).toBe('participant')
    expect(calendarRole(shared, 'u-outsider', {})).toBeNull()
  })

  it('gives team members participant access and team leads manager access', () => {
    const teamCalendar = { ...baseCalendar, kind: 'team' as const, teamId: 'team-product', ownerId: null }

    expect(
      calendarRole(teamCalendar, 'u-member', {
        teamIds: ['team-product'],
        teamRole: 'member',
      }),
    ).toBe('participant')
    expect(
      calendarRole(teamCalendar, 'u-lead', {
        teamIds: ['team-product'],
        teamRole: 'lead',
      }),
    ).toBe('manager')
    expect(calendarRole(teamCalendar, 'u-outsider', { teamIds: [] })).toBeNull()
  })

  it('gives workspace members participant access and workspace admins manager access', () => {
    const workspaceCalendar = { ...baseCalendar, kind: 'workspace' as const, ownerId: null }

    expect(calendarRole(workspaceCalendar, 'u-member', { workspaceRole: 'member' })).toBe('participant')
    expect(calendarRole(workspaceCalendar, 'u-admin', { workspaceRole: 'admin' })).toBe('manager')
    expect(calendarRole(workspaceCalendar, 'u-owner', { workspaceRole: 'owner' })).toBe('manager')
    expect(calendarRole(workspaceCalendar, 'u-outsider', {})).toBeNull()
  })

  it('uses explicit calendar roles for custom shared calendars', () => {
    const sharedCalendar = {
      ...baseCalendar,
      kind: 'shared' as const,
      ownerId: null,
      createdBy: 'u-creator',
    }

    expect(calendarRole(sharedCalendar, 'u-editor', { calendarRole: 'editor' })).toBe('editor')
    expect(calendarRole(sharedCalendar, 'u-outsider', {})).toBeNull()
  })
})

describe('canEditEvent', () => {
  it('allows the creator to edit their own personal event', () => {
    expect(canEditEvent(baseEvent, 'manager', null, null, 'u-owner')).toBe(true)
  })

  it('does not allow a personal-calendar viewer to edit an event', () => {
    expect(canEditEvent(baseEvent, 'viewer', null, null, 'u-viewer')).toBe(false)
  })

  it('allows a shared-calendar editor to edit another creator’s event', () => {
    const sharedEvent = { ...baseEvent, calendarKind: 'shared' as const, createdBy: 'u-creator' }
    expect(canEditEvent(sharedEvent, 'editor', null, null, 'u-editor')).toBe(true)
  })

  it('does not allow a shared-calendar viewer to edit', () => {
    const sharedEvent = { ...baseEvent, calendarKind: 'shared' as const, createdBy: 'u-creator' }
    expect(canEditEvent(sharedEvent, 'viewer', null, null, 'u-viewer')).toBe(false)
  })

  it('does not let a workspace admin edit a personal event unless shared as editor', () => {
    expect(canEditEvent(baseEvent, null, 'admin', null, 'u-admin')).toBe(false)
  })

  it('lets a team lead edit a shared event', () => {
    const teamEvent = { ...baseEvent, calendarKind: 'team' as const, createdBy: 'u-member' }
    expect(canEditEvent(teamEvent, 'manager', null, 'lead', 'u-lead')).toBe(true)
  })

  it('keeps a private event editable only by its creator', () => {
    const privateEvent = { ...baseEvent, visibility: 'private' as const, createdBy: 'u-owner' }
    expect(canEditEvent(privateEvent, 'manager', 'admin', 'lead', 'u-admin')).toBe(false)
    expect(canEditEvent(privateEvent, 'manager', 'admin', 'lead', 'u-owner')).toBe(true)
  })
})
