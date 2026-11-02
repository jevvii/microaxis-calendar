import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

type TextareaProps = ComponentPropsWithoutRef<'textarea'> & {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid = false, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full resize-y rounded-control border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink',
        'placeholder:text-ink-3/70 transition-colors duration-150',
        'hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15',
        invalid && 'border-danger focus:border-danger focus:ring-danger/15',
        className,
      )}
      {...props}
    />
  )
})
