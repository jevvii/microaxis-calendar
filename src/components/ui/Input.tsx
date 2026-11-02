import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

type InputProps = ComponentPropsWithoutRef<'input'> & {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-10 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-ink sm:text-sm',
        'placeholder:text-ink-3/70 transition-colors duration-150',
        'hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15',
        'disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-ink-3',
        invalid && 'border-danger focus:border-danger focus:ring-danger/15',
        className,
      )}
      {...props}
    />
  )
})
