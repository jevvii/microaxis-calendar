import { GoogleLogo, EnvelopeSimple, ArrowRight } from '@phosphor-icons/react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { useToast } from '../providers/ToastProvider'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/layout/Logo'

export function AuthPage() {
  const { user, isDemo, configurationError } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  return (
    <main className="grid min-h-[100dvh] bg-canvas lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex flex-col justify-between border-b border-line px-6 py-6 lg:border-b-0 lg:border-r lg:px-10 lg:py-8">
        <Logo />
        <div className="max-w-lg py-16 lg:py-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            MicroAxis Calendar
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2.8rem,6vw,5.2rem)] leading-[0.98] tracking-[-0.035em]">
            The studio calendar, kept in one hand.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-ink-2">
            Personal calendars stay private. Shared calendars stay legible. Every event keeps its
            creator in view.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="ink-stamp px-2 py-1 text-ink-3">Shared teams</span>
            <span className="ink-stamp px-2 py-1 text-ink-3">Personal sharing</span>
            <span className="ink-stamp px-2 py-1 text-ink-3">Google export</span>
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
          A separate MicroAxis product
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 lg:px-10">
        <div className="w-full max-w-sm">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Sign in</h2>
          <p className="mt-1.5 text-sm leading-6 text-ink-3">
            Use the Google account you already use for work, or get a link by email.
          </p>

          {configurationError ? (
            <div className="mt-5 rounded-control border border-warning/25 bg-warning-wash p-3 text-sm leading-6 text-warning">
              {configurationError} The demo workspace is still available.
            </div>
          ) : null}

          <div className="mt-6 grid gap-2.5">
            <Button
              variant="primary"
              leadingIcon={<GoogleLogo size={16} weight="bold" aria-hidden />}
              onClick={() =>
                toast({
                  title: isDemo ? 'Demo mode is active' : 'Google sign-in is next',
                  description: isDemo
                    ? 'The demo workspace is already signed in.'
                    : 'Supabase OAuth is wired in the next task.',
                  tone: 'info',
                })
              }
            >
              Continue with Google
            </Button>

            <div className="my-1 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <Field label="Work email" htmlFor="auth-email">
              <Input
                id="auth-email"
                type="email"
                placeholder="you@studio.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </Field>
            <Button
              variant="secondary"
              leadingIcon={<EnvelopeSimple size={16} aria-hidden />}
              onClick={() =>
                toast({
                  title: isDemo ? 'Demo mode is active' : 'Magic links are next',
                  description: isDemo
                    ? 'Open the demo workspace below.'
                    : 'Supabase email auth is wired in the next task.',
                  tone: 'info',
                })
              }
            >
              Email me a sign-in link
            </Button>
          </div>

          {user ? (
            <button
              type="button"
              onClick={() => navigate('/app/calendar')}
              className="mt-6 flex w-full items-center justify-between rounded-control border border-line bg-surface px-3.5 py-3 text-left text-sm transition-colors hover:border-line-strong"
            >
              <span>
                <span className="block font-medium text-ink">Open the demo workspace</span>
                <span className="mt-0.5 block text-xs text-ink-3">Mara Velasco · MicroAxis Studio</span>
              </span>
              <ArrowRight size={16} className="text-ink-3" aria-hidden />
            </button>
          ) : null}

          <p className="mt-6 text-xs leading-5 text-ink-3">
            By continuing you agree to the workspace invitation and the studio’s acceptable use
            policy. <Link to="/offline" className="underline underline-offset-2">Offline help</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
