import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function AppShell({
  sidebar,
  topbar,
  children,
  mobileNav,
  detail,
  className,
}: {
  sidebar: ReactNode
  topbar: ReactNode
  children: ReactNode
  mobileNav?: ReactNode
  detail?: ReactNode
  className?: string
}) {
  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <div className="paper-noise" aria-hidden />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-line lg:block">
        {sidebar}
      </aside>

      <div className="min-h-[100dvh] lg:pl-[248px]">
        {topbar}
        <div className="flex min-h-[calc(100dvh-3.5rem)]">
          <main className={cn('min-w-0 flex-1 pb-20 lg:pb-0', className)}>{children}</main>
          {detail ? (
            <aside className="hidden w-[360px] shrink-0 border-l border-line xl:block">{detail}</aside>
          ) : null}
        </div>
      </div>

      {mobileNav}
    </div>
  )
}
