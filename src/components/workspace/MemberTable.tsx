import { Trash } from '@phosphor-icons/react'
import type { WorkspaceMembership, WorkspaceRole } from '../../types/domain'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { RoleSelect } from './RoleSelect'

export function MemberTable({
  members,
  currentUserId,
  canManage,
  onRoleChange,
  onRemove,
}: {
  members: WorkspaceMembership[]
  currentUserId: string
  canManage: boolean
  onRoleChange: (userId: string, role: WorkspaceRole) => void
  onRemove: (userId: string) => void
}) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {members.map((member) => {
        const name = member.profile?.fullName ?? 'Member'
        const own = member.userId === currentUserId
        return (
          <div key={member.id} className="flex flex-wrap items-center gap-3 py-3">
            <Avatar name={name} src={member.profile?.avatarUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                {name}
                {own ? <Badge tone="accent">You</Badge> : null}
              </p>
              <p className="text-xs text-ink-3">
                {member.profile?.timezone ?? 'Asia/Manila'} · joined{' '}
                {new Date(member.joinedAt).toLocaleDateString('en-PH', {
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            {canManage ? (
              <>
                <RoleSelect
                  value={member.role}
                  onChange={(role) => onRoleChange(member.userId, role)}
                />
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  disabled={own}
                  onClick={() => onRemove(member.userId)}
                  className="inline-flex size-8 items-center justify-center rounded-control text-ink-3 hover:bg-danger-wash hover:text-danger disabled:pointer-events-none disabled:opacity-35"
                >
                  <Trash size={14} aria-hidden />
                </button>
              </>
            ) : (
              <Badge tone={member.role === 'owner' ? 'accent' : 'neutral'}>{member.role}</Badge>
            )}
          </div>
        )
      })}
    </div>
  )
}
