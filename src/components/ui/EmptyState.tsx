import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-start px-6 py-14 sm:px-10', className)}>
      {icon ? (
        <div className="mb-4 flex size-9 items-center justify-center rounded-control border border-line bg-surface-2 text-ink-3">
          {icon}
        </div>
      ) : null}
      <h2 className="max-w-md font-serif text-3xl leading-[1.05] tracking-[-0.02em] text-ink">
        {title}
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-ink-3">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
