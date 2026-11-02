import { Bell, Moon, Sun, Desktop } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../providers/ThemeProvider'
import { useWorkspace } from '../providers/WorkspaceProvider'
import { useCalendars } from '../hooks/useCalendars'
import { GoogleCalendarSettings } from '../components/settings/GoogleCalendarSettings'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SegmentedControl } from '../components/ui/SegmentedControl'

export function SettingsPage() {
  const { user, isDemo } = useAuth()
  const { activeWorkspace, activeWorkspaceId, membership } = useWorkspace()
  const calendarsQuery = useCalendars(activeWorkspaceId)
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">Settings</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">Your account</h1>
      <p className="mt-1 text-sm text-ink-3">
        Preferences are personal. Workspace policy lives under Workspace.
      </p>

      <section className="mt-8 border-t border-line pt-6">
        <div className="flex items-center gap-3">
          <Avatar name={user?.fullName ?? 'Signed-in user'} src={user?.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{user?.fullName ?? 'Not signed in'}</p>
            <p className="mt-0.5 text-xs text-ink-3">
              {user?.timezone ?? 'Asia/Manila'} · {user?.clock24h ? '24-hour' : '12-hour'} time
            </p>
          </div>
          {isDemo ? <Badge tone="warning">Demo mode</Badge> : null}
        </div>
      </section>

      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-ink-3">Follow the system or keep one theme.</p>
        <SegmentedControl<Theme>
          className="mt-4"
          ariaLabel="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'light', label: 'Light', icon: <Sun size={13} aria-hidden /> },
            { value: 'dark', label: 'Dark', icon: <Moon size={13} aria-hidden /> },
            { value: 'system', label: 'System', icon: <Desktop size={13} aria-hidden /> },
          ]}
        />
      </section>

      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-panel border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <Bell size={18} className="mt-0.5 text-ink-3" aria-hidden />
            <div>
              <p className="text-sm font-medium">Reminders and shared-event alerts</p>
              <p className="mt-1 text-xs leading-5 text-ink-3">
                In-app notifications are on. Email and browser push are configured per device.
              </p>
            </div>
          </div>
          <Badge tone="accent">Default</Badge>
        </div>
      </section>

      <div className="mt-8 border-t border-line pt-6">
        <GoogleCalendarSettings calendars={calendarsQuery.data ?? []} />
      </div>

      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-sm font-semibold">Workspace</h2>
        <p className="mt-1 text-sm text-ink-3">
          {activeWorkspace?.name ?? 'No workspace'}
          {membership ? ` · ${membership.role}` : ''}
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/app/workspace')}>
          Open workspace settings
        </Button>
      </section>
    </div>
  )
}
