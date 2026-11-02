import { EnvelopeSimple } from '@phosphor-icons/react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { acceptInvite } from '../lib/auth'
import { useAuth } from '../providers/AuthProvider'
import { useToast } from '../providers/ToastProvider'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/layout/Logo'

export function InvitePage() {
  const { token } = useParams()
  const { user, isDemo } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function accept() {
    if (!token) return
    setError(null)
    setLoading(true)
    const result = await acceptInvite(token)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    toast({ title: 'Invitation accepted', tone: 'success' })
    navigate('/app/calendar')
  }

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
            {isDemo
              ? 'Demo invitations are illustrative. Sign-in and workspace joining run against Supabase in configured environments.'
              : user
                ? 'Accept the invitation to join the workspace. The link expires seven days after it was created.'
                : 'Sign in with the email address that received the invitation, then come back to this link.'}
          </p>
          {token ? (
            <p className="mt-3 break-all rounded-control bg-surface-3 px-2.5 py-2 font-mono text-[10px] text-ink-3">
              {token}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 text-sm leading-6 text-danger">
              {error}
            </p>
          ) : null}

          {!user ? (
            <Button variant="primary" className="mt-6 w-full" onClick={() => navigate('/auth')}>
              Sign in to continue
            </Button>
          ) : (
            <Button
              variant="primary"
              className="mt-6 w-full"
              loading={loading}
              disabled={isDemo}
              onClick={accept}
            >
              {isDemo ? 'Demo invitation' : 'Accept invitation'}
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
