import {
  Bell,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Plus,
} from '@phosphor-icons/react'
import { addDays, format, getISOWeek, startOfWeek } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useDataProvider } from '../../data/provider'
import { useRealtimeWorkspace } from '../../hooks/useRealtime'
import { useAuth } from '../../providers/AuthProvider'
import { useWorkspace } from '../../providers/WorkspaceProvider'
import { useToast } from '../../providers/ToastProvider'
import type { Calendar, Notification } from '../../types/domain'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { SegmentedControl } from '../ui/SegmentedControl'
import { AppShell } from './AppShell'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { Topbar } from './Topbar'

type View = 'week' | 'month' | 'agenda'

function viewFrom(value: string | null): View {
  return value === 'month' || value === 'agenda' ? value : 'week'
}

export function AppLayout() {
  const provider = useDataProvider()
  const { user } = useAuth()
  const { activeWorkspace, activeWorkspaceId, teams, loading } = useWorkspace()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  useRealtimeWorkspace(activeWorkspaceId)

  useEffect(() => {
    if (!activeWorkspaceId) {
      setCalendars([])
      setNotifications([])
      return
    }

    let cancelled = false
    Promise.all([
      provider.listCalendars(activeWorkspaceId),
      provider.listNotifications(activeWorkspaceId),
    ])
      .then(([nextCalendars, nextNotifications]) => {
        if (cancelled) return
        setCalendars(nextCalendars)
        setNotifications(nextNotifications)
      })
      .catch(() => {
        if (!cancelled) {
          setCalendars([])
          setNotifications([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId, provider])

  const dateParam = searchParams.get('date')
  const selectedDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date()
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)
  const view = viewFrom(searchParams.get('view'))
  const unreadCount = notifications.filter((notification) => !notification.readAt).length

  const dateLabel = useMemo(() => {
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
    if (sameMonth) {
      return `${format(weekStart, 'MMM d')}–${format(weekEnd, 'd, yyyy')}`
    }
    return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
  }, [weekEnd, weekStart])

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
  }

  function moveWeek(direction: -1 | 1) {
    updateParams({ date: format(addDays(weekStart, direction * 7), 'yyyy-MM-dd') })
  }

  const activeCalendarId = searchParams.get('calendar')
  const mobileActive = location.pathname.includes('/notifications')
    ? 'inbox'
    : location.pathname.includes('/settings') ||
        location.pathname.includes('/workspace') ||
        location.pathname.includes('/team/')
      ? 'more'
      : 'calendar'

  if (!loading && !activeWorkspace) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-canvas px-6">
        <div className="max-w-md text-center">
          <img src="/microaxis-mark.svg" alt="" className="mx-auto size-10" />
          <h1 className="mt-5 font-serif text-4xl tracking-[-0.03em]">No workspace yet</h1>
          <p className="mt-3 text-sm leading-6 text-ink-3">
            Create a workspace to start keeping the studio calendar.
          </p>
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="mt-6 rounded-control border border-ink bg-ink px-4 py-2 text-sm font-medium text-surface"
          >
            Create workspace
          </button>
        </div>
      </div>
    )
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          workspaceName={activeWorkspace?.name ?? 'MicroAxis Calendar'}
          userName={user?.fullName ?? 'Signed-in user'}
          userAvatar={user?.avatarUrl}
          calendars={calendars.map((calendar) => ({
            id: calendar.id,
            name: calendar.name,
            color: calendar.color,
            kind: calendar.kind,
          }))}
          teams={teams.map((team) => ({
            id: team.id,
            name: team.name,
            memberCount: team.memberCount,
          }))}
          activeCalendarId={activeCalendarId}
          unreadCount={unreadCount}
          onSelectCalendar={(calendarId) =>
            updateParams({
              calendar: activeCalendarId === calendarId ? null : calendarId,
            })
          }
          onNewEvent={() => updateParams({ new: '1' })}
        />
      }
      topbar={
        <Topbar
          left={
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-0.5 sm:flex">
                <IconButton label="Previous week" size="sm" onClick={() => moveWeek(-1)}>
                  <CaretLeft size={15} weight="bold" aria-hidden />
                </IconButton>
                <IconButton label="Next week" size="sm" onClick={() => moveWeek(1)}>
                  <CaretRight size={15} weight="bold" aria-hidden />
                </IconButton>
              </div>
              <button
                type="button"
                onClick={() => updateParams({ date: null })}
                className="min-w-0 rounded-control px-1 py-1 text-left hover:bg-surface-3"
              >
                <p className="truncate text-[13px] font-semibold tracking-[-0.01em]">{dateLabel}</p>
                <p className="hidden font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 sm:block">
                  Week {getISOWeek(weekStart)} · {user?.timezone ?? 'Asia/Manila'}
                </p>
              </button>
            </div>
          }
          center={
            <SegmentedControl
              ariaLabel="Calendar view"
              value={view}
              onChange={(nextView) => updateParams({ view: nextView })}
              options={[
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'agenda', label: 'Agenda' },
              ]}
            />
          }
          right={
            <>
              <IconButton
                label="Search"
                size="sm"
                onClick={() =>
                  toast({
                    title: 'Search is not wired yet',
                    description: 'The next pass adds command search across events and people.',
                    tone: 'info',
                  })
                }
              >
                <MagnifyingGlass size={15} aria-hidden />
              </IconButton>
              <IconButton
                label="Notifications"
                size="sm"
                className="relative"
                onClick={() => navigate('/app/notifications')}
              >
                <Bell size={15} aria-hidden />
                {unreadCount > 0 ? (
                  <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" />
                ) : null}
              </IconButton>
              <ThemeToggle />
              <Button size="sm" variant="primary" leadingIcon={<Plus size={14} weight="bold" aria-hidden />} onClick={() => updateParams({ new: '1' })}>
                <span className="hidden sm:inline">New event</span>
              </Button>
              <Avatar name={user?.fullName ?? 'Signed-in user'} src={user?.avatarUrl} size="sm" />
            </>
          }
        />
      }
      mobileNav={
        <MobileNav
          active={mobileActive}
          unreadCount={unreadCount}
          onSelect={(destination) => {
            if (destination === 'today') navigate('/app/calendar')
            if (destination === 'calendar') navigate('/app/calendar')
            if (destination === 'inbox') navigate('/app/notifications')
            if (destination === 'more') navigate('/app/settings')
          }}
        />
      }
    >
      <Outlet />
    </AppShell>
  )
}
