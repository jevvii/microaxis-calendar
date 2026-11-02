import { Bell, Moon, Sun, Desktop, Warning } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { supabase } from '../lib/supabase'
import { Dialog } from '../components/ui/Dialog'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../providers/ThemeProvider'
import { useWorkspace } from '../providers/WorkspaceProvider'
import { useToast } from '../providers/ToastProvider'
import { useCalendars } from '../hooks/useCalendars'
import { GoogleCalendarSettings } from '../components/settings/GoogleCalendarSettings'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SegmentedControl } from '../components/ui/SegmentedControl'

export function SettingsPage() {
  const { user, isDemo, signOut } = useAuth()
  const { toast } = useToast()
  const { activeWorkspace, activeWorkspaceId, membership } = useWorkspace()
  const calendarsQuery = useCalendars(activeWorkspaceId)
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)

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
        <div className="flex items-start gap-2.5 rounded-panel border border-danger/25 bg-danger-wash p-4">
          <Warning size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-danger">Delete account</p>
            <p className="mt-1 text-xs leading-5 text-danger/85">
              You must transfer ownership of every workspace where you are the only Owner first.
            </p>
            <Button
              variant="danger"
              size="sm"
              className="mt-3"
              onClick={() => setDeleteOpen(true)}
            >
              Delete my account
            </Button>
          </div>
        </div>
      </section>

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

      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete your account?"
        description="This removes your profile and personal calendars. Shared events remain with the workspace."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={deleteConfirmation !== 'DELETE'}
              onClick={async () => {
                if (!supabase) {
                  toast({
                    title: 'Account deletion needs Supabase',
                    description: 'The demo workspace does not have a real account to delete.',
                    tone: 'error',
                  })
                  return
                }
                setDeleting(true)
                const { error } = await supabase.functions.invoke('delete-account', { body: {} })
                setDeleting(false)
                if (error) {
                  toast({ title: 'Could not delete your account', description: error.message, tone: 'error' })
                  return
                }
                await signOut()
                navigate('/auth')
              }}
            >
              Delete account
            </Button>
          </>
        }
      >
        <Field label="Type DELETE to confirm" htmlFor="account-delete-confirmation">
          <Input
            id="account-delete-confirmation"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder="DELETE"
          />
        </Field>
      </Dialog>
    </div>
  )
}
