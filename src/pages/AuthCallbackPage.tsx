import { CircleNotch, WarningCircle } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearPendingInvite, readPendingInvite } from '../lib/pendingInvite'
import { useAuth } from '../providers/AuthProvider'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/layout/Logo'

export function AuthCallbackPage() {
  const { user, loading, configurationError } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      const pendingInvite = readPendingInvite()
      if (pendingInvite) clearPendingInvite()
      navigate(pendingInvite ? `/invite/${pendingInvite}` : '/app/calendar', { replace: true })
    }
  }, [loading, navigate, user])

  if (!loading && !user) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-canvas px-6">
        <div className="w-full max-w-sm text-center">
          <Logo linked={false} className="justify-center" />
          <WarningCircle size={22} className="mx-auto mt-8 text-danger" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold tracking-[-0.02em]">Sign-in did not finish.</h1>
          <p className="mt-2 text-sm leading-6 text-ink-3">
            {configurationError ??
              'The sign-in link may have expired. Request a new link or return to the sign-in page.'}
          </p>
          <Button variant="primary" className="mt-6" onClick={() => navigate('/auth', { replace: true })}>
            Return to sign in
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-canvas px-6">
      <div className="text-center">
        <Logo linked={false} className="justify-center" />
        <CircleNotch size={20} className="mx-auto mt-8 animate-spin text-ink-3" aria-hidden />
        <p className="mt-3 text-sm text-ink-3">Signing you back in.</p>
      </div>
    </main>
  )
}
