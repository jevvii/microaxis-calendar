import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type SegmentOption<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = 'md',
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentOption<T>[]
  ariaLabel: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-control border border-line bg-surface-2 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-[4px] font-medium transition-colors duration-150',
              size === 'sm' ? 'h-7 px-2 text-[11px]' : 'h-8 px-2.5 text-xs',
              active
                ? 'bg-surface text-ink shadow-[0_1px_0_rgba(0,0,0,0.03)]'
                : 'text-ink-3 hover:text-ink',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
