import { CloudSlash } from '@phosphor-icons/react'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/layout/Logo'

export function OfflinePage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md">
        <Logo linked={false} />
        <div className="mt-10">
          <span className="flex size-9 items-center justify-center rounded-control border border-line bg-surface-2 text-ink-3">
            <CloudSlash size={17} aria-hidden />
          </span>
          <h1 className="mt-5 font-serif text-4xl leading-none tracking-[-0.03em]">
            The calendar is offline.
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-3">
            Saved events remain readable for the next 90 days. Changes, comments, and uploads need
            a connection.
          </p>
          <Button variant="primary" className="mt-6" onClick={() => window.location.assign('/app/calendar')}>
            Try again
          </Button>
        </div>
      </div>
    </main>
  )
}
