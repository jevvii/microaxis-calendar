import { GoogleLogo, ArrowsClockwise, WarningCircle } from '@phosphor-icons/react'
import type { Calendar } from '../../types/domain'
import { useGoogleConnection } from '../../hooks/useGoogleConnection'
import { useToast } from '../../providers/ToastProvider'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export function GoogleCalendarSettings({ calendars }: { calendars: Calendar[] }) {
  const { toast } = useToast()
  const google = useGoogleConnection()

  function errorMessage(reason: unknown) {
    return reason instanceof Error ? reason.message : 'Try again.'
  }

  return (
    <section>
      <div className="flex items-start gap-3">
        <GoogleLogo size={18} className="mt-0.5 text-ink-3" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">Google Calendar</h2>
            {google.connection ? <Badge tone="accent">Connected</Badge> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-ink-3">
            Export selected MicroAxis calendars into a dedicated MicroAxis Google calendar. This
            is one-way: Google changes never flow back.
          </p>
        </div>
      </div>

      {google.support === 'unconfigured' ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-panel border border-warning/25 bg-warning-wash p-4 text-warning">
          <WarningCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p className="text-xs leading-5">
            Google export is not configured. Add `VITE_GOOGLE_CLIENT_ID` and the Google OAuth
            function secrets to enable it.
          </p>
        </div>
      ) : google.connection ? (
        <div className="mt-4 rounded-panel border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">
                {google.connection.google_email ?? 'Google account connected'}
              </p>
              <p className="mt-1 font-mono text-[10px] text-ink-3">
                {google.connection.google_calendar_id ?? 'MicroAxis calendar'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<ArrowsClockwise size={13} aria-hidden />}
                loading={google.sync.isPending}
                onClick={() =>
                  google.sync.mutate(undefined, {
                    onSuccess: () =>
                      toast({ title: 'Google sync finished', tone: 'success' }),
                    onError: (reason) =>
                      toast({
                        title: 'Google sync failed',
                        description: errorMessage(reason),
                        tone: 'error',
                      }),
                  })
                }
              >
                Sync now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  google.disconnect.mutate(undefined, {
                    onSuccess: () =>
                      toast({ title: 'Google account disconnected', tone: 'success' }),
                  })
                }
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          leadingIcon={<GoogleLogo size={14} weight="bold" aria-hidden />}
          loading={google.connect.isPending}
          onClick={() =>
            google.connect.mutate(undefined, {
              onError: (reason) =>
                toast({
                  title: 'Could not start Google connection',
                  description: errorMessage(reason),
                  tone: 'error',
                }),
            })
          }
        >
          Connect Google Calendar
        </Button>
      )}

      {google.connection ? (
        <div className="mt-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
            Calendars to export
          </p>
          <div className="mt-2 divide-y divide-line border-y border-line">
            {calendars.map((calendar) => (
              <label
                key={calendar.id}
                className="flex min-h-10 cursor-pointer items-center gap-2.5 py-2"
              >
                <input
                  type="checkbox"
                  checked={google.preferences.get(calendar.id) === true}
                  onChange={(event) =>
                    google.setCalendarExport.mutate(
                      { calendarId: calendar.id, enabled: event.target.checked },
                      {
                        onError: (reason) =>
                          toast({
                            title: 'Could not update export',
                            description: errorMessage(reason),
                            tone: 'error',
                          }),
                      },
                    )
                  }
                  className="size-4 accent-[var(--accent)]"
                />
                <span className="size-2.5 rounded-full" style={{ backgroundColor: calendar.color }} />
                <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{calendar.name}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.05em] text-ink-3">
                  {calendar.kind}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
