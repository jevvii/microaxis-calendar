import { CircleNotch } from '@phosphor-icons/react'
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

export type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leadingIcon?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-ink bg-ink text-surface hover:border-accent hover:bg-accent-hover',
  secondary:
    'border border-line-strong bg-surface text-ink hover:border-ink hover:bg-surface-2',
  ghost: 'border border-transparent bg-transparent text-ink-2 hover:bg-surface-3 hover:text-ink',
  danger:
    'border border-danger/30 bg-danger text-white hover:border-danger hover:bg-danger/90',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    leadingIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control font-medium tracking-[-0.01em]',
        'transition-[background-color,border-color,color,transform] duration-150',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <CircleNotch size={15} weight="bold" className="animate-spin" aria-hidden />
      ) : (
        leadingIcon
      )}
      {children}
    </button>
  )
})
