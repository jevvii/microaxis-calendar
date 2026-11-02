import { Bell, CalendarBlank, DotsThreeOutline, Sun } from '@phosphor-icons/react'
import { cn } from '../../lib/cn'

type MobileDestination = 'today' | 'calendar' | 'inbox' | 'more'

const items: Array<{
  id: MobileDestination
  label: string
  icon: typeof CalendarBlank
}> = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'calendar', label: 'Calendar', icon: CalendarBlank },
  { id: 'inbox', label: 'Inbox', icon: Bell },
  { id: 'more', label: 'More', icon: DotsThreeOutline },
]

export function MobileNav({
  active,
  unreadCount = 0,
  onSelect,
}: {
  active: MobileDestination
  unreadCount?: number
  onSelect: (destination: MobileDestination) => void
}) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          const selected = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={selected ? 'page' : undefined}
              className={cn(
                'relative flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                selected ? 'text-accent' : 'text-ink-3 hover:text-ink',
              )}
            >
              <span className="relative">
                <Icon size={20} weight={selected ? 'fill' : 'regular'} aria-hidden />
                {item.id === 'inbox' && unreadCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1 size-2 rounded-full border-2 border-surface bg-accent" />
                ) : null}
              </span>
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
