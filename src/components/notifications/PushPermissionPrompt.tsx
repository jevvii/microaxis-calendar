import { BellRinging, DeviceMobile } from '@phosphor-icons/react'
import { usePushSubscription } from '../../hooks/usePushSubscription'
import { Button } from '../ui/Button'

export function PushPermissionPrompt() {
  const { support, status, subscribe } = usePushSubscription()
  const isiOS =
    typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)

  return (
    <div className="rounded-panel border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <BellRinging size={18} className="mt-0.5 text-ink-3" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Browser notifications</p>
          <p className="mt-1 text-xs leading-5 text-ink-3">
            {status === 'granted'
              ? 'This browser is subscribed to reminders and shared-event alerts.'
              : support === 'available'
                ? 'Ask this browser for permission. Notification permission is never requested on page load.'
                : support === 'unconfigured'
                  ? 'Web Push is not configured. Add VITE_VAPID_PUBLIC_KEY to enable it.'
                  : 'This browser does not support Web Push.'}
          </p>
          {isiOS ? (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-5 text-ink-3">
              <DeviceMobile size={13} className="mt-0.5 shrink-0" aria-hidden />
              On iPhone or iPad, add MicroAxis Calendar to the Home Screen first.
            </p>
          ) : null}
          {support === 'available' && status !== 'granted' ? (
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => void subscribe()}>
              Enable browser notifications
            </Button>
          ) : null}
          {status === 'denied' ? (
            <p className="mt-2 text-xs text-danger">
              Permission was denied. Re-enable it in the browser’s site settings.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
