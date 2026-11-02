import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  optional = false,
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
  optional?: boolean
}) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {optional ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
            Optional
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs leading-5 text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs leading-5 text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
