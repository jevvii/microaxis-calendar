import { cn } from '../../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-control bg-surface-3', className)} />
}

export function CalendarSkeleton() {
  return (
    <div className="grid gap-3" aria-label="Loading calendar" role="status">
      <Skeleton className="h-8 w-44" />
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-panel border border-line bg-line">
        {Array.from({ length: 35 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-none bg-surface" />
        ))}
      </div>
    </div>
  )
}
