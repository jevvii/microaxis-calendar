import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Logo } from './Logo'

export function Topbar({
  left,
  center,
  right,
  className,
}: {
  left?: ReactNode
  center?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/95 px-3 backdrop-blur-sm sm:px-4 lg:px-6',
        className,
      )}
    >
      <div className="lg:hidden">
        <Logo compact />
      </div>
      <div className="min-w-0 flex-1">{left}</div>
      {center ? <div className="hidden md:block">{center}</div> : null}
      <div className="flex shrink-0 items-center gap-1.5">{right}</div>
    </header>
  )
}
