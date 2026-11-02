import { CircleNotch } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/layout/Logo'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/app/calendar', { replace: true }), 600)
    return () => window.clearTimeout(timer)
  }, [navigate])

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
