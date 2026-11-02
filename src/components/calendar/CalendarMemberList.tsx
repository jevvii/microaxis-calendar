import { Trash } from '@phosphor-icons/react'
import type { CalendarShare, Team, WorkspaceMembership } from '../../types/domain'

export function CalendarMemberList({
  shares,
  teams,
  members,
  onRevoke,
}: {
  shares: CalendarShare[]
  teams: Team[]
  members: WorkspaceMembership[]
  onRevoke: (shareId: string) => void
}) {
  if (shares.length === 0) {
    return (
      <p className="text-sm text-ink-3">
        This calendar is not shared with anyone else yet.
      </p>
    )
  }

  function label(share: CalendarShare) {
    if (share.subjectType === 'workspace') return 'Whole workspace'
    if (share.subjectType === 'team') {
      return teams.find((team) => team.id === share.subjectId)?.name ?? 'Team'
    }
    return members.find((member) => member.userId === share.subjectId)?.profile?.fullName ?? 'Member'
  }

  return (
    <div className="divide-y divide-line border-y border-line">
      {shares.map((share) => (
        <div key={share.id} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-ink">{label(share)}</p>
            <p className="text-[10px] text-ink-3">
              {share.role}
              {share.hideDetails ? ' · busy blocks only' : ''}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Revoke ${label(share)}`}
            onClick={() => onRevoke(share.id)}
            className="inline-flex size-7 items-center justify-center rounded-control text-ink-3 hover:bg-danger-wash hover:text-danger"
          >
            <Trash size={13} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}
