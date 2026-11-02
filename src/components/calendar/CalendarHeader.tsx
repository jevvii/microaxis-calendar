import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { ViewSwitcher, type CalendarView } from './ViewSwitcher'

export function CalendarHeader({
  title,
  subtitle,
  weekStart,
  weekEnd,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onNewEvent,
  offline = false,
}: {
  title: string
  subtitle: string
  weekStart: Date
  weekEnd: Date
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onNewEvent: () => void
  offline?: boolean
}) {
  const rangeLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${format(weekStart, 'MMM d')}–${format(weekEnd, 'd, yyyy')}`
      : `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`

  return (
    <div className="border-b border-line bg-canvas px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            {rangeLabel}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">{title}</h1>
          <p className="mt-1 text-sm text-ink-3">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <IconButton label="Previous week" size="sm" onClick={onPrev}>
              <CaretLeft size={15} weight="bold" aria-hidden />
            </IconButton>
            <IconButton label="Next week" size="sm" onClick={onNext}>
              <CaretRight size={15} weight="bold" aria-hidden />
            </IconButton>
          </div>
          <Button variant="ghost" size="sm" onClick={onToday}>
            Today
          </Button>
          <div className="hidden sm:block">
            <ViewSwitcher value={view} onChange={onViewChange} size="sm" />
          </div>
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={14} weight="bold" aria-hidden />}
            onClick={onNewEvent}
            disabled={offline}
          >
            New event
          </Button>
        </div>
      </div>

      <div className="mt-3 sm:hidden">
        <ViewSwitcher value={view} onChange={onViewChange} size="sm" />
      </div>
    </div>
  )
}
