import { UsersThree } from '@phosphor-icons/react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '../providers/WorkspaceProvider'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'

export function TeamPage() {
  const { teamId } = useParams()
  const { teams } = useWorkspace()
  const team = teams.find((item) => item.id === teamId)

  if (!team) {
    return (
      <EmptyState
        title="That team is not here."
        description="It may have been removed, or you may not be a member of it."
        icon={<UsersThree size={18} aria-hidden />}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">Team</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.035em]">{team.name}</h1>
        <Badge tone="neutral">{team.memberCount ?? 0} members</Badge>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-3">{team.description}</p>

      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-sm font-semibold">Team calendar</h2>
        <p className="mt-1 text-sm text-ink-3">
          Team events live on the shared team calendar. Leads can manage membership and the
          calendar; members can update attendance and add context.
        </p>
      </section>
    </div>
  )
}
