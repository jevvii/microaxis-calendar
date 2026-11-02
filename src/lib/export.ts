import { formatInTimeZone } from 'date-fns-tz'
import type {
  Calendar,
  Event,
  EventCategory,
  Team,
  Workspace,
  WorkspaceMembership,
} from '../types/domain'
import { dateKeyInTimeZone } from './date'

export type WorkspaceExportData = {
  workspace: Workspace
  members: WorkspaceMembership[]
  teams: Team[]
  calendars: Calendar[]
  categories: EventCategory[]
  events: Event[]
}

function escapeIcsText(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;')
}

function icsDateTime(value: string, timeZone: string) {
  return formatInTimeZone(new Date(value), timeZone, "yyyyMMdd'T'HHmmss")
}

export function exportCalendarIcs(calendar: Calendar, events: Event[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MicroAxis//Calendar//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcsText(calendar.name)}`,
  ]

  for (const event of events.filter((item) => !item.deletedAt)) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.id}@microaxis.calendar`)
    lines.push(`DTSTAMP:${formatInTimeZone(new Date(event.updatedAt), 'UTC', "yyyyMMdd'T'HHmmss'Z'")}`)
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${dateKeyInTimeZone(event.startsAt, event.timeZone).replaceAll('-', '')}`)
      lines.push(`DTEND;VALUE=DATE:${dateKeyInTimeZone(event.endsAt, event.timeZone).replaceAll('-', '')}`)
    } else {
      lines.push(`DTSTART;TZID=${event.timeZone}:${icsDateTime(event.startsAt, event.timeZone)}`)
      lines.push(`DTEND;TZID=${event.timeZone}:${icsDateTime(event.endsAt, event.timeZone)}`)
    }
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`)
    if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
    if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`)
    if (event.recurrenceRule) lines.push(`RRULE:${event.recurrenceRule}`)
    lines.push(`STATUS:${event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}

export function exportWorkspaceJson(data: WorkspaceExportData) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      product: 'MicroAxis Calendar',
      workspace: data.workspace,
      members: data.members,
      teams: data.teams,
      calendars: data.calendars,
      categories: data.categories,
      events: data.events,
    },
    null,
    2,
  )
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
