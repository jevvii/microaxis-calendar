import type { Event, EventPriority, EventStatus } from '../types/domain'

export type EventFilters = {
  calendarIds?: string[]
  categoryIds?: string[]
  priorities?: EventPriority[]
  creatorIds?: string[]
  statuses?: EventStatus[]
  query?: string
}

export function applyEventFilters(events: Event[], filters: EventFilters = {}) {
  const query = filters.query?.trim().toLowerCase()

  return events.filter((event) => {
    if (filters.calendarIds?.length && !filters.calendarIds.includes(event.calendarId)) {
      return false
    }
    if (filters.categoryIds?.length && (!event.categoryId || !filters.categoryIds.includes(event.categoryId))) {
      return false
    }
    if (filters.priorities?.length && !filters.priorities.includes(event.priority)) {
      return false
    }
    if (filters.creatorIds?.length && !filters.creatorIds.includes(event.createdBy)) {
      return false
    }
    if (filters.statuses?.length && !filters.statuses.includes(event.status)) {
      return false
    }
    if (query) {
      const haystack = [event.title, event.description, event.location, event.creator?.fullName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })
}
