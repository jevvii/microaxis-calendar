import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { addDaysToDateKey, dateKeyInTimeZone, formatDateKey } from '../../lib/date'
import {
  addMonthsToMonthKey,
  buildMonthGrid,
  parseDateValue,
} from '../../lib/dateTimePicker'
import { cn } from '../../lib/cn'
import { IconButton } from '../ui/IconButton'
import { Input } from '../ui/Input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover'

function displayDate(value: string, timeZone: string) {
  return value ? formatDateKey(value, timeZone, 'MMM d, yyyy') : ''
}

export function DatePicker({
  id,
  value,
  onChange,
  timeZone,
  weekStartsOn = 1,
  min,
  invalid = false,
  describedBy,
  className,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  timeZone: string
  weekStartsOn?: 0 | 1
  min?: string
  invalid?: boolean
  describedBy?: string
  className?: string
}) {
  const todayKey = dateKeyInTimeZone(new Date(), timeZone)
  const [open, setOpen] = useState(false)
  const [monthKey, setMonthKey] = useState(() => (value || todayKey).slice(0, 7))
  const [text, setText] = useState(() => displayDate(value, timeZone))

  useEffect(() => {
    setText(displayDate(value, timeZone))
  }, [timeZone, value])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setMonthKey((value || todayKey).slice(0, 7))
  }

  function commitText() {
    const parsed = parseDateValue(text)
    if (parsed) {
      onChange(parsed)
      return
    }
    if (!text.trim()) {
      onChange('')
      return
    }
    setText(displayDate(value, timeZone))
  }

  const days = buildMonthGrid(monthKey, weekStartsOn)
  const gridStart = days[0]
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    formatDateKey(addDaysToDateKey(gridStart, index), timeZone, 'EEE'),
  )

  return (
    <span className={cn('relative block min-w-0', className)}>
      <Input
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commitText}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        placeholder="Choose a date"
        autoComplete="off"
        invalid={invalid}
        aria-describedby={describedBy}
        className="pr-10"
      />
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Choose date"
            className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink focus-visible:outline-none"
          >
            <CalendarBlank size={15} aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[19rem] max-w-[calc(100vw-2rem)] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <IconButton
              label="Previous month"
              size="sm"
              onClick={() => setMonthKey((current) => addMonthsToMonthKey(current, -1))}
            >
              <CaretLeft size={14} weight="bold" aria-hidden />
            </IconButton>
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2">
              {formatDateKey(`${monthKey}-01`, timeZone, 'MMMM yyyy')}
            </p>
            <IconButton
              label="Next month"
              size="sm"
              onClick={() => setMonthKey((current) => addMonthsToMonthKey(current, 1))}
            >
              <CaretRight size={14} weight="bold" aria-hidden />
            </IconButton>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {weekdayLabels.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className="py-1 text-center font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3"
              >
                {label}
              </span>
            ))}
            {days.map((key) => {
              const selected = key === value
              const today = key === todayKey
              const outside = key.slice(0, 7) !== monthKey
              const disabled = Boolean(min && key < min)

              return (
                <button
                  key={key}
                  type="button"
                  aria-label={formatDateKey(key, timeZone, 'MMMM d, yyyy')}
                  aria-pressed={selected}
                  aria-current={today ? 'date' : undefined}
                  disabled={disabled}
                  onClick={() => {
                    onChange(key)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-control font-mono text-[12px] transition-colors',
                    'hover:bg-surface-3 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30',
                    outside && 'text-ink-3/60',
                    today && !selected && 'border border-accent text-accent',
                    selected && 'bg-accent text-surface hover:bg-accent-hover',
                  )}
                >
                  {Number(key.slice(8, 10))}
                </button>
              )
            })}
          </div>

          <p className="mt-2 border-t border-line pt-2 text-[10px] leading-4 text-ink-3">
            Type a date like 2026-11-03, then press Enter.
          </p>
        </PopoverContent>
      </Popover>
    </span>
  )
}
