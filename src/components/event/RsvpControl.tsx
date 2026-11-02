import { Check, Question, X } from '@phosphor-icons/react'
import { cn } from '../../lib/cn'
import type { RsvpStatus } from '../../types/domain'

const options: Array<{
  value: RsvpStatus
  label: string
  icon: typeof Check
}> = [
  { value: 'going', label: 'Going', icon: Check },
  { value: 'maybe', label: 'Maybe', icon: Question },
  { value: 'declined', label: 'Declined', icon: X },
]

export function RsvpControl({
  value,
  onChange,
  disabled = false,
}: {
  eventId: string
  userId: string
  value: RsvpStatus
  onChange: (status: RsvpStatus) => void
  disabled?: boolean
}) {
  return (
    <div role="group" aria-label="Your response" className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const Icon = option.icon
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-[11px] font-medium transition-colors',
              selected
                ? 'border-accent/30 bg-accent-wash text-accent'
                : 'border-line bg-surface text-ink-3 hover:border-line-strong hover:text-ink',
              disabled && 'pointer-events-none opacity-45',
            )}
          >
            <Icon size={12} weight={selected ? 'bold' : 'regular'} aria-hidden />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
