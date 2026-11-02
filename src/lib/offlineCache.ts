import { del, get, set } from 'idb-keyval'
import type { Event } from '../types/domain'

export type CachedEventSummary = {
  id: string
  calendarId: string
  title: string
  startsAt: string
  endsAt: string
  allDay: boolean
  timeZone: string
  location: string | null
}

const CACHE_KEY = 'microaxis-offline-events-v1'
const FORWARD_DAYS = 90
const BACK_DAYS = 30

export function toEventSummaries(events: Event[]): CachedEventSummary[] {
  return events.map((event) => ({
    id: event.id,
    calendarId: event.calendarId,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: event.allDay,
    timeZone: event.timeZone,
    location: event.location,
  }))
}

export function filterCachedEventSummaries(
  summaries: CachedEventSummary[],
  rangeStart: string,
  rangeEnd: string,
) {
  const start = new Date(rangeStart).getTime()
  const end = new Date(rangeEnd).getTime()
  return summaries
    .filter(
      (summary) =>
        new Date(summary.startsAt).getTime() < end &&
        new Date(summary.endsAt).getTime() > start,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export async function cacheEventSummaries(events: Event[]) {
  if (typeof indexedDB === 'undefined') return
  const now = Date.now()
  const oldest = now - BACK_DAYS * 86_400_000
  const newest = now + FORWARD_DAYS * 86_400_000
  const existing = (await get<CachedEventSummary[]>(CACHE_KEY)) ?? []
  const merged = new Map(existing.map((summary) => [summary.id, summary]))

  for (const summary of toEventSummaries(events)) {
    const start = new Date(summary.startsAt).getTime()
    if (start >= oldest && start <= newest) merged.set(summary.id, summary)
  }

  await set(
    CACHE_KEY,
    [...merged.values()].filter((summary) => {
      const start = new Date(summary.startsAt).getTime()
      return start >= oldest && start <= newest
    }),
  )
}

export async function readCachedEventSummaries(rangeStart: string, rangeEnd: string) {
  if (typeof indexedDB === 'undefined') return []
  const summaries = (await get<CachedEventSummary[]>(CACHE_KEY)) ?? []
  return filterCachedEventSummaries(summaries, rangeStart, rangeEnd)
}

export async function clearOfflineCache() {
  if (typeof indexedDB === 'undefined') return
  await del(CACHE_KEY)
}
