import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoProvider } from './demoProvider'

const eventInput = {
  calendarId: '30000000-0000-4000-8000-000000000001',
  title: 'Pricing model review',
  description: 'Walk through the new agency retainer model.',
  location: 'Studio room',
  startsAt: '2026-11-09T01:00:00.000Z',
  endsAt: '2026-11-09T02:00:00.000Z',
  allDay: false,
  timeZone: 'Asia/Manila',
  categoryId: null,
  priority: 'normal' as const,
  status: 'scheduled' as const,
  visibility: 'calendar' as const,
  recurrenceRule: null,
  recurrenceUntil: null,
  participantIds: [],
}

describe('demo provider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('seeds a personal and a shared calendar with realistic team data', async () => {
    const provider = createDemoProvider(localStorage)
    const workspaces = await provider.listWorkspaces()
    expect(workspaces).toHaveLength(1)

    const calendars = await provider.listCalendars(workspaces[0].id)
    expect(calendars).toHaveLength(5)
    expect(calendars.some((calendar) => calendar.kind === 'personal')).toBe(true)
    expect(calendars.some((calendar) => calendar.kind === 'shared')).toBe(true)

    const teams = await provider.listTeams(workspaces[0].id)
    expect(teams).toHaveLength(3)

    const members = await provider.listMembers(workspaces[0].id)
    expect(members).toHaveLength(4)
  })

  it('creates an event at version 1 and increments to version 2 on update', async () => {
    const provider = createDemoProvider(localStorage)
    const created = await provider.createEvent(eventInput)
    expect(created.version).toBe(1)

    const updated = await provider.updateEvent(
      created.id,
      { ...eventInput, title: 'Pricing model review — revised' },
      1,
    )

    expect(updated.ok).toBe(true)
    if (!updated.ok) throw new Error('expected a successful update')
    expect(updated.event.version).toBe(2)
    expect(updated.event.title).toBe('Pricing model review — revised')
  })

  it('returns a conflict instead of overwriting a stale version', async () => {
    const provider = createDemoProvider(localStorage)
    const created = await provider.createEvent(eventInput)

    await provider.updateEvent(created.id, { ...eventInput, title: 'First edit' }, 1)
    const stale = await provider.updateEvent(created.id, { ...eventInput, title: 'Stale edit' }, 1)

    expect(stale.ok).toBe(false)
    if (stale.ok) throw new Error('expected a conflict')
    expect(stale.conflict).toBe(true)
    expect(stale.current?.title).toBe('First edit')
  })

  it('persists demo changes across provider instances', async () => {
    const first = createDemoProvider(localStorage)
    const created = await first.createEvent({ ...eventInput, title: 'Persisted review' })

    const second = createDemoProvider(localStorage)
    const events = await second.listEvents({
      workspaceId: '10000000-0000-4000-8000-000000000001',
      rangeStart: '2026-11-08T00:00:00.000Z',
      rangeEnd: '2026-11-10T00:00:00.000Z',
    })

    expect(events.some((event) => event.id === created.id)).toBe(true)
  })
})
