import type { NotificationPreferences } from '../types/domain'

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  reminders: true,
  email: true,
  push: false,
  newSharedEvent: true,
  mentions: true,
  dailyAgenda: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
}

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== 'object') return DEFAULT_NOTIFICATION_PREFERENCES
  const partial = value as Partial<NotificationPreferences>
  return {
    reminders: partial.reminders ?? DEFAULT_NOTIFICATION_PREFERENCES.reminders,
    email: partial.email ?? DEFAULT_NOTIFICATION_PREFERENCES.email,
    push: partial.push ?? DEFAULT_NOTIFICATION_PREFERENCES.push,
    newSharedEvent:
      partial.newSharedEvent ?? DEFAULT_NOTIFICATION_PREFERENCES.newSharedEvent,
    mentions: partial.mentions ?? DEFAULT_NOTIFICATION_PREFERENCES.mentions,
    dailyAgenda: partial.dailyAgenda ?? DEFAULT_NOTIFICATION_PREFERENCES.dailyAgenda,
    quietHoursStart:
      partial.quietHoursStart ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursStart,
    quietHoursEnd: partial.quietHoursEnd ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnd,
  }
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

export function isWithinQuietHours(
  now: Date,
  preferences: NotificationPreferences,
) {
  const current = now.getHours() * 60 + now.getMinutes()
  const start = toMinutes(preferences.quietHoursStart)
  const end = toMinutes(preferences.quietHoursEnd)

  if (start === end) return false
  if (start < end) return current >= start && current < end
  return current >= start || current < end
}
