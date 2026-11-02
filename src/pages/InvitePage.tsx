import { EnvelopeSimple } from '@phosphor-icons/react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/layout/Logo'

export function InvitePage() {
  const { token } = useParams()

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md">
        <Logo linked={false} />
        <div className="mt-10 rounded-panel border border-line bg-surface p-6">
          <span className="flex size-9 items-center justify-center rounded-control border border-line bg-surface-2 text-ink-3">
            <EnvelopeSimple size={17} aria-hidden />
          </span>
          <h1 className="mt-5 font-serif text-3xl leading-none tracking-[-0.03em]">
            You have an invitation.
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-3">
            Invitation tokens are validated by Supabase in the next task. This link carries the
            token <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[11px]">{token}</code>.
          </p>
          <Button variant="primary" className="mt-6 w-full" disabled>
            Accept after sign-in
          </Button>
        </div>
      </div>
    </main>
  )
}
