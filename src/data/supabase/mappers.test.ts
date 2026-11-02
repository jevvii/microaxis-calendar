import { describe, expect, it } from 'vitest'
import {
  mapCalendarRow,
  mapEventRow,
  mapNotificationRow,
  mapProfileRow,
  mapTeamRow,
  mapWorkspaceMemberRow,
} from './mappers'

describe('Supabase row mappers', () => {
  it('maps a profile from snake_case', () => {
    expect(
      mapProfileRow({
        id: 'u-1',
        full_name: 'Mara Velasco',
        avatar_url: null,
        timezone: 'Asia/Manila',
        week_starts_on: 1,
        clock_24h: false,
      }),
    ).toMatchObject({ fullName: 'Mara Velasco', weekStartsOn: 1, clock24h: false })
  })

  it('maps a calendar with its shares', () => {
    const calendar = mapCalendarRow({
      id: 'cal-1',
      workspace_id: 'ws-1',
      owner_id: 'u-1',
      team_id: null,
      name: 'Mara’s calendar',
      description: null,
      kind: 'personal',
      color: '#0C7A43',
      visibility: 'private',
      created_by: 'u-1',
      created_at: '2026-11-01T00:00:00.000Z',
      updated_at: '2026-11-01T00:00:00.000Z',
      deleted_at: null,
      calendar_shares: [
        {
          id: 'share-1',
          calendar_id: 'cal-1',
          subject_type: 'team',
          subject_id: 'team-1',
          role: 'viewer',
          hide_details: false,
        },
      ],
    })

    expect(calendar.shares?.[0]).toMatchObject({
      subjectType: 'team',
      subjectId: 'team-1',
      hideDetails: false,
    })
  })

  it('maps a team with lead ids and member count', () => {
    const team = mapTeamRow({
      id: 'team-1',
      workspace_id: 'ws-1',
      name: 'Product',
      description: null,
      color: '#2F5D78',
      created_by: 'u-1',
      created_at: '2026-11-01T00:00:00.000Z',
      deleted_at: null,
      team_members: [
        { user_id: 'u-1', role: 'lead' },
        { user_id: 'u-2', role: 'member' },
      ],
    })

    expect(team.leadIds).toEqual(['u-1'])
    expect(team.memberCount).toBe(2)
  })

  it('maps a workspace member with profile', () => {
    const member = mapWorkspaceMemberRow({
      id: 'wm-1',
      workspace_id: 'ws-1',
      user_id: 'u-1',
      role: 'owner',
      joined_at: '2026-11-01T00:00:00.000Z',
      profile: {
        id: 'u-1',
        full_name: 'Mara Velasco',
        avatar_url: null,
        timezone: 'Asia/Manila',
        week_starts_on: 1,
        clock_24h: false,
      },
    })

    expect(member.profile?.fullName).toBe('Mara Velasco')
    expect(member.role).toBe('owner')
  })

  it('maps an event and preserves the calendar kind', () => {
    const event = mapEventRow(
      {
        id: 'evt-1',
        workspace_id: 'ws-1',
        calendar_id: 'cal-1',
        created_by: 'u-1',
        title: 'OceanJet release review',
        description: null,
        location: 'Room 2',
        starts_at: '2026-11-03T01:30:00.000Z',
        ends_at: '2026-11-03T02:30:00.000Z',
        all_day: false,
        time_zone: 'Asia/Manila',
        category_id: 'cat-1',
        priority: 'high',
        status: 'scheduled',
        visibility: 'calendar',
        recurrence_rule: null,
        recurrence_until: null,
        recurrence_exceptions: [],
        version: 3,
        created_at: '2026-11-01T00:00:00.000Z',
        updated_at: '2026-11-02T00:00:00.000Z',
        deleted_at: null,
      },
      'team',
    )

    expect(event).toMatchObject({
      calendarKind: 'team',
      title: 'OceanJet release review',
      priority: 'high',
      version: 3,
    })
  })

  it('maps a notification', () => {
    const notification = mapNotificationRow({
      id: 'n-1',
      workspace_id: 'ws-1',
      user_id: 'u-1',
      type: 'event_created',
      title: 'Ivo added Launch room retro',
      body: 'Launch room',
      href: '/app/calendar?event=evt-1',
      metadata: { eventId: 'evt-1' },
      read_at: null,
      created_at: '2026-11-02T00:00:00.000Z',
    })

    expect(notification).toMatchObject({
      type: 'event_created',
      readAt: null,
      metadata: { eventId: 'evt-1' },
    })
  })
})
