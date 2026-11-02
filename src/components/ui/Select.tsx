import { CaretDown } from '@phosphor-icons/react'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

type SelectProps = ComponentPropsWithoutRef<'select'> & {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid = false, children, ...props },
  ref,
) {
  return (
    <span className="relative block">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-10 w-full appearance-none rounded-control border border-line-strong bg-surface pl-3 pr-9 text-base text-ink sm:text-sm',
          'transition-colors duration-150 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15',
          'disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-ink-3',
          invalid && 'border-danger focus:border-danger focus:ring-danger/15',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <CaretDown
        size={13}
        weight="bold"
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
      />
    </span>
  )
})
