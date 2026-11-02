import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '../lib/cn'

type ToastTone = 'success' | 'info' | 'error'

type ToastInput = {
  title: string
  description?: string
  tone?: ToastTone
  duration?: number
}

type ToastItem = ToastInput & { id: string }

type ToastContextValue = {
  toast: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneIcon = {
  success: CheckCircle,
  info: Info,
  error: WarningCircle,
}

const toneClasses: Record<ToastTone, string> = {
  success: 'text-accent',
  info: 'text-info',
  error: 'text-danger',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current.slice(-3), { ...input, id }])
      const timer = setTimeout(() => dismiss(id), input.duration ?? 4500)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-20 right-4 z-[80] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 lg:bottom-5"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const tone = item.tone ?? 'info'
            const Icon = toneIcon[tone]
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto flex items-start gap-3 rounded-panel border border-line bg-surface p-3.5 text-ink shadow-[0_12px_32px_-24px_rgba(0,0,0,0.35)]"
              >
                <Icon size={17} weight="bold" className={cn('mt-0.5', toneClasses[tone])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs leading-5 text-ink-3">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(item.id)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-control text-ink-3 hover:bg-surface-3 hover:text-ink"
                >
                  <X size={13} weight="bold" aria-hidden />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
