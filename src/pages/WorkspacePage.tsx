import { ArrowSquareOut, ShieldCheck, UsersThree } from '@phosphor-icons/react'
import { useWorkspace } from '../providers/WorkspaceProvider'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'

export function WorkspacePage() {
  const { activeWorkspace, members, teams, membership } = useWorkspace()

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
            {activeWorkspace?.name ?? 'Workspace settings'}
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            Members, teams, categories, and workspace policy.
          </p>
        </div>
        {membership ? <Badge tone="accent">{membership.role}</Badge> : null}
      </div>

      <section className="mt-8 border-t border-line pt-6">
        <div className="flex items-center gap-2">
          <UsersThree size={17} className="text-ink-3" aria-hidden />
          <h2 className="text-sm font-semibold">Members</h2>
          <span className="font-mono text-[10px] text-ink-3">{members.length}</span>
        </div>
        <div className="mt-3 divide-y divide-line border-y border-line">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 py-3">
              <Avatar name={member.profile?.fullName ?? 'Member'} src={member.profile?.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {member.profile?.fullName ?? 'Member'}
                </p>
                <p className="text-xs text-ink-3">{member.profile?.timezone ?? 'Asia/Manila'}</p>
              </div>
              <Badge tone={member.role === 'owner' ? 'accent' : 'neutral'}>{member.role}</Badge>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 border-t border-line pt-6">
        <div className="flex items-center gap-2">
          <ShieldCheck size={17} className="text-ink-3" aria-hidden />
          <h2 className="text-sm font-semibold">Teams</h2>
          <span className="font-mono text-[10px] text-ink-3">{teams.length}</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="rounded-panel border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{team.name}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-3">{team.description}</p>
                </div>
                <ArrowSquareOut size={14} className="mt-0.5 text-ink-3" aria-hidden />
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-3">
                {team.memberCount ?? 0} members
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
