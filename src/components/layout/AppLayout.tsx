import { Bell, MagnifyingGlass } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useDataProvider } from '../../data/provider'
import { useNotifications } from '../../hooks/useNotifications'
import { useRealtimeWorkspace } from '../../hooks/useRealtime'
import { useAuth } from '../../providers/AuthProvider'
import { useWorkspace } from '../../providers/WorkspaceProvider'
import type { Calendar } from '../../types/domain'
import { Avatar } from '../ui/Avatar'
import { IconButton } from '../ui/IconButton'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover'
import { Dialog } from '../ui/Dialog'
import { NotificationPanel } from '../notifications/NotificationPanel'
import { AppShell } from './AppShell'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'
import { Topbar } from './Topbar'

export function AppLayout() {
  const provider = useDataProvider()
  const { user } = useAuth()
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    teams,
    loading,
  } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const notificationsState = useNotifications(activeWorkspaceId)
  useRealtimeWorkspace(activeWorkspaceId)

  useEffect(() => {
    if (!activeWorkspaceId) {
      setCalendars([])
      return
    }

    let cancelled = false
    provider
      .listCalendars(activeWorkspaceId)
      .then((nextCalendars) => {
        if (!cancelled) setCalendars(nextCalendars)
      })
      .catch(() => {
        if (!cancelled) setCalendars([])
      })

    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId, provider])

  const unreadCount = notificationsState.unreadCount

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next, { replace: true })
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
          onSelectCalendar={(calendarId) => {
            if (!location.pathname.includes('/calendar')) {
              navigate(`/app/calendar?calendar=${calendarId}`)
              return
            }
            updateParams({
              calendar: activeCalendarId === calendarId ? null : calendarId,
            })
          }}
          onNewEvent={() => navigate('/app/calendar?new=1')}
          onOpenWorkspaceMenu={() => setWorkspaceMenuOpen(true)}
          onOpenSettings={() => navigate('/app/settings')}
        />
      }
      topbar={
        <Topbar
          left={
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold tracking-[-0.01em]">
                {activeWorkspace?.name ?? 'MicroAxis Calendar'}
              </p>
              <p className="hidden font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 sm:block">
                Calendar · {user?.timezone ?? 'Asia/Manila'}
              </p>
            </div>
          }
          right={
            <>
              <IconButton
                label="Search"
                size="sm"
                onClick={() => {
                  navigate('/app/calendar')
                  window.setTimeout(() => {
                    document
                      .querySelector<HTMLInputElement>('input[aria-label="Search events"]')
                      ?.focus()
                  }, 60)
                }}
              >
                <MagnifyingGlass size={15} aria-hidden />
              </IconButton>
              <Popover>
                <PopoverTrigger asChild>
                  <IconButton label="Notifications" size="sm" className="relative">
                    <Bell size={15} aria-hidden />
                    {unreadCount > 0 ? (
                      <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" />
                    ) : null}
                  </IconButton>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
                  <NotificationPanel
                    notifications={notificationsState.notifications}
                    unreadCount={unreadCount}
                    onMarkRead={(notification) => notificationsState.markRead(notification.id)}
                    onMarkAllRead={notificationsState.markAllRead}
                    onSelect={(notification) => {
                      notificationsState.markRead(notification.id)
                      if (notification.href) navigate(notification.href)
                    }}
                    onViewAll={() => navigate('/app/notifications')}
                  />
                </PopoverContent>
              </Popover>
              <ThemeToggle />
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

      <Dialog
        open={workspaceMenuOpen}
        onOpenChange={setWorkspaceMenuOpen}
        title="Switch workspace"
        description="Calendars are scoped to the active workspace."
        size="sm"
      >
        <div className="grid gap-1">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              onClick={() => {
                setActiveWorkspaceId(workspace.id)
                setWorkspaceMenuOpen(false)
                navigate('/app/calendar')
              }}
              className={`flex items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-2 ${
                workspace.id === activeWorkspaceId ? 'bg-accent-wash text-accent' : 'text-ink-2'
              }`}
            >
              <span className="flex size-7 items-center justify-center rounded-control border border-line bg-surface font-mono text-[10px]">
                {workspace.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{workspace.name}</span>
              {workspace.id === activeWorkspaceId ? (
                <span className="font-mono text-[9px] uppercase tracking-[0.05em]">Active</span>
              ) : null}
            </button>
          ))}
        </div>
      </Dialog>
    </AppShell>
  )
}
