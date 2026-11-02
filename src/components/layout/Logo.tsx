import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

export function Logo({
  compact = false,
  className,
  linked = true,
}: {
  compact?: boolean
  className?: string
  linked?: boolean
}) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <img src="/microaxis-mark.svg" alt="" className="size-6 shrink-0" />
      {!compact ? (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-semibold tracking-[-0.03em]">MicroAxis</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            Calendar
          </span>
        </span>
      ) : null}
    </span>
  )

  if (!linked) return content
  return (
    <Link to="/app/calendar" aria-label="MicroAxis Calendar home" className="inline-flex">
      {content}
    </Link>
  )
}
