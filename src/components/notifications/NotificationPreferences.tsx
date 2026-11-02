import { useEffect, useState } from 'react'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../../hooks/useNotifications'
import { normalizeNotificationPreferences } from '../../lib/notificationPreferences'
import type { NotificationPreferences as Preferences } from '../../types/domain'
import { useToast } from '../../providers/ToastProvider'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { PushPermissionPrompt } from './PushPermissionPrompt'

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <span>
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-ink-3">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
      />
    </label>
  )
}

export function NotificationPreferences() {
  const preferencesQuery = useNotificationPreferences()
  const updatePreferences = useUpdateNotificationPreferences()
  const { toast } = useToast()
  const [draft, setDraft] = useState<Preferences>(() =>
    normalizeNotificationPreferences(undefined),
  )

  useEffect(() => {
    if (preferencesQuery.data) setDraft(preferencesQuery.data)
  }, [preferencesQuery.data])

  function setField<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function save() {
    updatePreferences.mutate(draft, {
      onSuccess: () => toast({ title: 'Notification preferences saved', tone: 'success' }),
      onError: (reason) =>
        toast({
          title: 'Could not save preferences',
          description: reason instanceof Error ? reason.message : 'Try again.',
          tone: 'error',
        }),
    })
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">Delivery</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em]">Notification preferences</h2>
          <p className="mt-1 text-sm text-ink-3">
            Quiet hours suppress email and push; in-app notifications remain available.
          </p>
        </div>
        <Button variant="primary" size="sm" loading={updatePreferences.isPending} onClick={save}>
          Save preferences
        </Button>
      </div>

      <div className="mt-4 rounded-panel border border-line bg-surface px-4">
        <ToggleRow
          label="Reminders"
          description="Receive reminders before events you can see."
          checked={draft.reminders}
          onChange={(checked) => setField('reminders', checked)}
        />
        <ToggleRow
          label="Email"
          description="Send notification email through the workspace sender."
          checked={draft.email}
          onChange={(checked) => setField('email', checked)}
        />
        <ToggleRow
          label="Browser push"
          description="Use Web Push after this browser grants permission."
          checked={draft.push}
          onChange={(checked) => setField('push', checked)}
        />
        <ToggleRow
          label="New shared events"
          description="Notify me when someone adds an event to a shared calendar."
          checked={draft.newSharedEvent}
          onChange={(checked) => setField('newSharedEvent', checked)}
        />
        <ToggleRow
          label="Mentions"
          description="Notify me when a comment mentions my name."
          checked={draft.mentions}
          onChange={(checked) => setField('mentions', checked)}
        />
        <ToggleRow
          label="Daily agenda"
          description="Send one morning summary at 08:00 local time."
          checked={draft.dailyAgenda}
          onChange={(checked) => setField('dailyAgenda', checked)}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Quiet hours start" htmlFor="quiet-start">
          <Input
            id="quiet-start"
            type="time"
            value={draft.quietHoursStart}
            onChange={(event) => setField('quietHoursStart', event.target.value)}
          />
        </Field>
        <Field label="Quiet hours end" htmlFor="quiet-end">
          <Input
            id="quiet-end"
            type="time"
            value={draft.quietHoursEnd}
            onChange={(event) => setField('quietHoursEnd', event.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4">
        <PushPermissionPrompt />
      </div>
    </section>
  )
}
