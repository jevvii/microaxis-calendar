import { CircleNotch, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGoogleConnection } from '../hooks/useGoogleConnection'
import { useToast } from '../providers/ToastProvider'
import { Button } from '../components/ui/Button'

export function GoogleCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const google = useGoogleConnection()
  const exchange = google.exchange
  const started = useRef(false)
  const [error, setError] = useState<string | null>(params.get('error'))

  useEffect(() => {
    if (started.current) return
    started.current = true

    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state) {
      setError('Google did not return an authorization code.')
      return
    }

    exchange.mutate(
      { code, state },
      {
        onSuccess: () => {
          toast({ title: 'Google Calendar connected', tone: 'success' })
          navigate('/app/settings', { replace: true })
        },
        onError: (reason) =>
          setError(reason instanceof Error ? reason.message : 'Google connection failed.'),
      },
    )
  }, [exchange, navigate, params, toast])

  return (
    <div className="grid min-h-[60dvh] place-items-center px-6">
      <div className="max-w-sm text-center">
        {error ? (
          <>
            <WarningCircle size={22} className="mx-auto text-danger" aria-hidden />
            <h1 className="mt-3 text-lg font-semibold tracking-[-0.02em]">
              Google Calendar was not connected.
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-3">{error}</p>
            <Button variant="secondary" className="mt-5" onClick={() => navigate('/app/settings')}>
              Back to settings
            </Button>
          </>
        ) : (
          <>
            <CircleNotch size={20} className="mx-auto animate-spin text-ink-3" aria-hidden />
            <h1 className="mt-3 text-lg font-semibold tracking-[-0.02em]">
              Connecting Google Calendar.
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-3">
              Creating the dedicated MicroAxis calendar and storing the connection.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
