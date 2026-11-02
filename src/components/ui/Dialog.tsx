import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from '@phosphor-icons/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: DialogProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) {
      returnFocusRef.current?.focus()
    }
  }, [open])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[1px]" />
        <DialogPrimitive.Content
          onOpenAutoFocus={() => {
            returnFocusRef.current = document.activeElement as HTMLElement | null
          }}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto border border-line bg-surface',
            'rounded-t-panel p-5 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)]',
            'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-panel sm:p-6',
            sizeClasses[size],
            className,
          )}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold tracking-[-0.02em] text-ink">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1.5 text-sm leading-6 text-ink-3">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close dialog"
              className="-mr-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <X size={17} weight="bold" aria-hidden />
            </DialogPrimitive.Close>
          </div>

          <div className="mt-5">{children}</div>

          {footer ? (
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
