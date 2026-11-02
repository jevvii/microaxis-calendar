import { CloudSlash } from '@phosphor-icons/react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-14 z-40 border-t border-warning/25 bg-warning-wash px-4 py-2.5 text-warning lg:bottom-0"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2 text-[11px] font-medium">
        <CloudSlash size={14} aria-hidden />
        You’re offline. Showing saved events; changes are disabled.
      </div>
    </div>
  )
}
