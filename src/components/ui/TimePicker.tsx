import { Clock } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { formatTimeValue, parseTimeValue } from '../../lib/dateTimePicker'
import { cn } from '../../lib/cn'
import { Input } from '../ui/Input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover'

const QUARTER_HOURS = Array.from({ length: 96 }, (_, index) => {
  const total = index * 15
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
})

export function TimePicker({
  id,
  value,
  onChange,
  clock24h = false,
  invalid = false,
  describedBy,
  ariaLabel = 'Choose time',
  className,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  clock24h?: boolean
  invalid?: boolean
  describedBy?: string
  ariaLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() =>
    value ? formatTimeValue(value, clock24h) : '',
  )

  useEffect(() => {
    setText(value ? formatTimeValue(value, clock24h) : '')
  }, [clock24h, value])

  useEffect(() => {
    if (!open) return
    const selected = document.getElementById(`${id}-option-${value.replace(':', '')}`)
    selected?.scrollIntoView({ block: 'center' })
  }, [id, open, value])

  function commitText() {
    const parsed = parseTimeValue(text)
    if (parsed) {
      onChange(parsed)
      return
    }
    if (!text.trim()) {
      onChange('')
      return
    }
    setText(value ? formatTimeValue(value, clock24h) : '')
  }

  const times = value && !QUARTER_HOURS.includes(value) ? [value, ...QUARTER_HOURS] : QUARTER_HOURS

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
        placeholder="Choose a time"
        autoComplete="off"
        invalid={invalid}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        className="pr-10 font-mono text-[13px]"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Choose time"
            className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink focus-visible:outline-none"
          >
            <Clock size={15} aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-44 p-2">
          <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto pr-1">
            {times.map((time) => {
              const selected = time === value
              return (
                <button
                  key={time}
                  id={`${id}-option-${time.replace(':', '')}`}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(time)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex h-8 items-center justify-center rounded-control font-mono text-[12px] transition-colors',
                    'hover:bg-surface-3 focus-visible:outline-none',
                    selected
                      ? 'bg-accent-wash font-medium text-accent hover:bg-accent-wash'
                      : 'text-ink-2',
                  )}
                >
                  {formatTimeValue(time, clock24h)}
                </button>
              )
            })}
          </div>
          <p className="mt-2 border-t border-line pt-2 text-[10px] leading-4 text-ink-3">
            Type 09:30 or 9:30 PM.
          </p>
        </PopoverContent>
      </Popover>
    </span>
  )
}
