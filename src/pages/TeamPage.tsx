import { PencilSimple, UsersThree } from '@phosphor-icons/react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { TeamEditor } from '../components/workspace/TeamEditor'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useCalendars } from '../hooks/useCalendars'
import { useWorkspaceAdmin } from '../hooks/useWorkspaceAdmin'
import { useToast } from '../providers/ToastProvider'
import { useAuth } from '../providers/AuthProvider'
import { useWorkspace } from '../providers/WorkspaceProvider'

export function TeamPage() {
  const { teamId } = useParams()
  const { user } = useAuth()
  const { teams, members, membership, activeWorkspaceId } = useWorkspace()
  const calendarsQuery = useCalendars(activeWorkspaceId)
  const admin = useWorkspaceAdmin(activeWorkspaceId)
  const { toast } = useToast()
  const [editorOpen, setEditorOpen] = useState(false)
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

  const isWorkspaceAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const canManage = isWorkspaceAdmin || (user ? team.leadIds?.includes(user.id) : false)
  const teamCalendars = (calendarsQuery.data ?? []).filter((calendar) => calendar.teamId === team.id)
  const teamMembers = (team.memberIds ?? []).map((userId) => ({
    userId,
    profile: members.find((member) => member.userId === userId)?.profile,
    lead: team.leadIds?.includes(userId) ?? false,
  }))

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">Team</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em]">{team.name}</h1>
            <Badge tone="neutral">{team.memberCount ?? 0} members</Badge>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-3">{team.description}</p>
        </div>
        {canManage ? (
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<PencilSimple size={14} aria-hidden />}
            onClick={() => setEditorOpen(true)}
          >
            Manage team
          </Button>
        ) : null}
      </div>

      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-sm font-semibold">Members</h2>
        <div className="mt-3 divide-y divide-line border-y border-line">
          {teamMembers.map((member) => {
            const name = member.profile?.fullName ?? 'Member'
            return (
              <div key={member.userId} className="flex items-center gap-3 py-3">
                <Avatar name={name} src={member.profile?.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{name}</p>
                  <p className="text-xs text-ink-3">
                    {member.profile?.timezone ?? 'Asia/Manila'}
                  </p>
                </div>
                <Badge tone={member.lead ? 'accent' : 'neutral'}>
                  {member.lead ? 'Lead' : 'Member'}
                </Badge>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-sm font-semibold">Team calendars</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {teamCalendars.map((calendar) => (
            <div key={calendar.id} className="rounded-panel border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: calendar.color }} />
                <p className="text-sm font-medium text-ink">{calendar.name}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-3">{calendar.description}</p>
            </div>
          ))}
          {teamCalendars.length === 0 ? (
            <p className="text-sm text-ink-3">No team calendar yet.</p>
          ) : null}
        </div>
      </section>

      <TeamEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        team={team}
        members={members}
        saving={admin.updateTeam.isPending}
        onSave={(input) =>
          admin.updateTeam.mutate(
            { teamId: team.id, input },
            {
              onSuccess: () => setEditorOpen(false),
              onError: (reason) =>
                toast({
                  title: 'Could not save the team',
                  description: reason instanceof Error ? reason.message : 'Try again.',
                  tone: 'error',
                }),
            },
          )
        }
        onDelete={
          isWorkspaceAdmin
            ? () =>
                admin.deleteTeam.mutate(team.id, {
                  onSuccess: () => setEditorOpen(false),
                  onError: (reason) =>
                    toast({
                      title: 'Could not delete the team',
                      description: reason instanceof Error ? reason.message : 'Try again.',
                      tone: 'error',
                    }),
                })
            : undefined
        }
      />
    </div>
  )
}
