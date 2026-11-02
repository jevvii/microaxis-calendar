import {
  Bell,
  CalendarBlank,
  CaretUpDown,
  GearSix,
  Plus,
  UsersThree,
} from '@phosphor-icons/react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Logo } from './Logo'

export type SidebarCalendar = {
  id: string
  name: string
  color: string
  kind: 'personal' | 'team' | 'workspace' | 'shared'
}

export type SidebarTeam = {
  id: string
  name: string
  memberCount?: number
}

type SidebarProps = {
  workspaceName: string
  userName: string
  userAvatar?: string | null
  calendars?: SidebarCalendar[]
  teams?: SidebarTeam[]
  activeCalendarId?: string | null
  unreadCount?: number
  onSelectCalendar?: (calendarId: string) => void
  onNewEvent?: () => void
  onOpenWorkspaceMenu?: () => void
  onOpenSettings?: () => void
}

export function Sidebar({
  workspaceName,
  userName,
  userAvatar,
  calendars = [],
  teams = [],
  activeCalendarId,
  unreadCount = 0,
  onSelectCalendar,
  onNewEvent,
  onOpenWorkspaceMenu,
  onOpenSettings,
}: SidebarProps) {
  return (
    <div className="flex h-full flex-col bg-surface-2">
      <div className="flex h-14 items-center border-b border-line px-4">
        <Logo />
      </div>

      <div className="border-b border-line p-3">
        <button
          type="button"
          onClick={onOpenWorkspaceMenu}
          className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors hover:bg-surface-3"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-control border border-line bg-surface font-mono text-xs font-medium text-ink-2">
            {workspaceName.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{workspaceName}</span>
            <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
              Workspace
            </span>
          </span>
          <CaretUpDown size={14} className="shrink-0 text-ink-3" aria-hidden />
        </button>
        <Button
          variant="primary"
          className="mt-2 w-full justify-start"
          leadingIcon={<Plus size={15} weight="bold" aria-hidden />}
          onClick={onNewEvent}
        >
          New event
        </Button>
      </div>

      <nav aria-label="Primary" className="border-b border-line px-2 py-3">
        <NavLink
          to="/app/calendar"
          className={({ isActive }) =>
            cn(
              'flex h-9 items-center gap-2.5 rounded-control px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink',
              isActive && 'bg-surface text-ink',
            )
          }
        >
          <CalendarBlank size={16} aria-hidden />
          Calendar
        </NavLink>
        <NavLink
          to="/app/notifications"
          className={({ isActive }) =>
            cn(
              'mt-0.5 flex h-9 items-center gap-2.5 rounded-control px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink',
              isActive && 'bg-surface text-ink',
            )
          }
        >
          <Bell size={16} aria-hidden />
          <span className="flex-1">Inbox</span>
          {unreadCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[10px] font-medium text-surface">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </NavLink>
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            cn(
              'mt-0.5 flex h-9 items-center gap-2.5 rounded-control px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink',
              isActive && 'bg-surface text-ink',
            )
          }
        >
          <GearSix size={16} aria-hidden />
          Settings
        </NavLink>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="flex items-center justify-between px-2.5">
          <h2 className="text-[12px] font-medium text-ink-3">Calendars</h2>
          <span className="font-mono text-[10px] text-ink-3">{calendars.length}</span>
        </div>
        <div className="mt-1.5 grid gap-0.5">
          {calendars.map((calendar) => {
            const active = calendar.id === activeCalendarId
            return (
              <button
                key={calendar.id}
                type="button"
                onClick={() => onSelectCalendar?.(calendar.id)}
                className={cn(
                  'flex h-8 items-center gap-2.5 rounded-control px-2.5 text-left text-[12px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink',
                  active && 'bg-surface text-ink',
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: calendar.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{calendar.name}</span>
                {calendar.kind === 'personal' ? (
                  <span className="font-mono text-[9px] uppercase tracking-[0.05em] text-ink-3">
                    You
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        {teams.length > 0 ? (
          <>
            <div className="mt-5 flex items-center justify-between px-2.5">
              <h2 className="text-[12px] font-medium text-ink-3">Teams</h2>
              <span className="font-mono text-[10px] text-ink-3">{teams.length}</span>
            </div>
            <div className="mt-1.5 grid gap-0.5">
              {teams.map((team) => (
                <NavLink
                  key={team.id}
                  to={`/app/team/${team.id}`}
                  className={({ isActive }) =>
                    cn(
                      'flex h-8 items-center gap-2.5 rounded-control px-2.5 text-[12px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink',
                      isActive && 'bg-surface text-ink',
                    )
                  }
                >
                  <UsersThree size={14} className="shrink-0 text-ink-3" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  {typeof team.memberCount === 'number' ? (
                    <span className="font-mono text-[10px] text-ink-3">{team.memberCount}</span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2.5 border-t border-line p-3">
        <Avatar name={userName} src={userAvatar} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-ink">{userName}</p>
          <p className="truncate text-[11px] text-ink-3">Signed in</p>
        </div>
        <IconButton label="Account settings" size="sm" onClick={onOpenSettings}>
          <GearSix size={15} aria-hidden />
        </IconButton>
      </div>
    </div>
  )
}
