import { ArrowRight } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataProvider } from '../data/provider'
import { useAuth } from '../providers/AuthProvider'
import { useToast } from '../providers/ToastProvider'
import { useWorkspace } from '../providers/WorkspaceProvider'
import { slugify } from '../lib/validation'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/layout/Logo'

export function OnboardingPage() {
  const provider = useDataProvider()
  const { user } = useAuth()
  const { refresh } = useWorkspace()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (name.trim().length < 2) {
      setError('Add a workspace name.')
      return
    }

    setSubmitting(true)
    try {
      await provider.createWorkspace({
        name: name.trim(),
        slug: slug.trim() || slugify(name),
      })
      refresh()
      toast({ title: 'Workspace created', tone: 'success' })
      navigate('/app/calendar')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create the workspace.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-canvas px-6 py-12">
      <div className="w-full max-w-md">
        <Logo linked={false} />
        <div className="mt-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">New workspace</p>
          <h1 className="mt-2 font-serif text-4xl leading-none tracking-[-0.03em]">
            Give the studio a room.
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-3">
            {user?.fullName ?? 'You'} will be the first Owner. Invite the rest of the team after
            the workspace exists.
          </p>
        </div>

        <form className="mt-8 grid gap-4" onSubmit={createWorkspace}>
          <Field label="Workspace name" htmlFor="workspace-name" hint="This is what members see.">
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (!slug) setSlug(slugify(event.target.value))
              }}
              placeholder="MicroAxis Studio"
              autoFocus
            />
          </Field>
          <Field label="Workspace address" htmlFor="workspace-slug" hint="Lowercase letters, numbers, and hyphens.">
            <Input
              id="workspace-slug"
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
              placeholder="microaxis-studio"
            />
          </Field>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            leadingIcon={<ArrowRight size={15} weight="bold" aria-hidden />}
          >
            Create workspace
          </Button>
        </form>
      </div>
    </main>
  )
}
