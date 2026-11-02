import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '../../lib/cn'

type IconButtonProps = ComponentPropsWithoutRef<'button'> & {
  label: string
  active?: boolean
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active = false, size = 'md', className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control border border-transparent text-ink-3',
        'transition-colors duration-150 hover:bg-surface-3 hover:text-ink active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-accent-wash text-accent',
        size === 'sm' ? 'size-8' : 'size-9',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})
