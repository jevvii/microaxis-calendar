import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type BadgeTone = 'neutral' | 'accent' | 'info' | 'warning' | 'danger'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-line bg-surface-2 text-ink-2',
  accent: 'border-accent/20 bg-accent-wash text-accent',
  info: 'border-info/20 bg-info-wash text-info',
  warning: 'border-warning/20 bg-warning-wash text-warning',
  danger: 'border-danger/20 bg-danger-wash text-danger',
}

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em]',
        toneClasses[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  )
}
