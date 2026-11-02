import type {
  Calendar,
  CalendarMemberships,
  CalendarRole,
  Event,
  TeamRole,
  WorkspaceRole,
} from '../types/domain'

const roleRank: Record<CalendarRole, number> = {
  viewer: 1,
  participant: 2,
  editor: 3,
  manager: 4,
}

function highestRole(roles: CalendarRole[]): CalendarRole | null {
  if (roles.length === 0) return null
  return roles.reduce((highest, role) =>
    roleRank[role] > roleRank[highest] ? role : highest,
  )
}

function isWorkspaceManager(role: WorkspaceRole | null | undefined) {
  return role === 'owner' || role === 'admin'
}

export function calendarRole(
  calendar: Calendar,
  userId: string,
  memberships: CalendarMemberships,
): CalendarRole | null {
  if (calendar.deletedAt) return null

  if (calendar.kind === 'personal' && calendar.ownerId === userId) {
    return 'manager'
  }

  const roles: CalendarRole[] = []

  if (calendar.kind === 'team' && calendar.teamId) {
    if (memberships.teamIds?.includes(calendar.teamId)) {
      roles.push(memberships.teamRole === 'lead' ? 'manager' : 'participant')
    }
    if (isWorkspaceManager(memberships.workspaceRole)) {
      roles.push('manager')
    }
  }

  if (calendar.kind === 'workspace' && memberships.workspaceRole) {
    roles.push(isWorkspaceManager(memberships.workspaceRole) ? 'manager' : 'participant')
  }

  if (calendar.kind === 'shared') {
    if (calendar.createdBy === userId) {
      roles.push('manager')
    }
    if (memberships.calendarRole) {
      roles.push(memberships.calendarRole)
    }
  }

  for (const share of calendar.shares ?? []) {
    const shareRole =
      calendar.kind === 'personal' && share.role === 'editor' ? 'viewer' : share.role

    if (share.subjectType === 'user' && share.subjectId === userId) {
      roles.push(shareRole)
    }

    if (
      share.subjectType === 'team' &&
      memberships.teamIds?.includes(share.subjectId)
    ) {
      roles.push(shareRole)
    }

    if (
      share.subjectType === 'workspace' &&
      share.subjectId === calendar.workspaceId &&
      memberships.workspaceRole
    ) {
      roles.push(shareRole)
    }
  }

  return highestRole(roles)
}

export function hasCalendarAccess(
  calendar: Calendar,
  userId: string,
  memberships: CalendarMemberships,
) {
  return calendarRole(calendar, userId, memberships) !== null
}

export function canEditEvent(
  event: Event,
  role: CalendarRole | null,
  workspaceRole: WorkspaceRole | null,
  teamRole: TeamRole | null,
  userId: string,
) {
  if (event.deletedAt) return false
  if (event.visibility === 'private' && event.createdBy !== userId) return false
  if (event.createdBy === userId) return true
  if (role === 'manager' || role === 'editor') return true

  if (
    event.calendarKind !== 'personal' &&
    (workspaceRole === 'owner' || workspaceRole === 'admin')
  ) {
    return true
  }

  if (event.calendarKind === 'team' && teamRole === 'lead') {
    return true
  }

  return false
}

export function canManageCalendar(role: CalendarRole | null) {
  return role === 'manager'
}

export function canCreateEvent(role: CalendarRole | null) {
  return role === 'participant' || role === 'editor' || role === 'manager'
}

export function roleAtLeast(role: CalendarRole | null, minimum: CalendarRole) {
  return role !== null && roleRank[role] >= roleRank[minimum]
}
