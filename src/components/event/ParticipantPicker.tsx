import type { WorkspaceMembership } from '../../types/domain'
import { Avatar } from '../ui/Avatar'

export function ParticipantPicker({
  members,
  selectedIds,
  onChange,
}: {
  members: WorkspaceMembership[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  function toggle(userId: string) {
    onChange(
      selectedIds.includes(userId)
        ? selectedIds.filter((id) => id !== userId)
        : [...selectedIds, userId],
    )
  }

  return (
    <fieldset>
      <legend className="text-[13px] font-medium text-ink">Participants</legend>
      <p className="mt-0.5 text-xs leading-5 text-ink-3">
        Optional. If none are selected, everyone with calendar access can respond.
      </p>
      <div className="mt-2 max-h-40 overflow-y-auto rounded-control border border-line bg-surface">
        {members.length === 0 ? (
          <p className="px-3 py-2.5 text-xs text-ink-3">No workspace members loaded.</p>
        ) : (
          members.map((member) => {
            const name = member.profile?.fullName ?? 'Member'
            const selected = selectedIds.includes(member.userId)
            return (
              <label
                key={member.userId}
                className="flex min-h-10 cursor-pointer items-center gap-2.5 border-b border-line px-3 text-[12px] last:border-b-0 hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(member.userId)}
                  className="size-3.5 accent-[var(--accent)]"
                />
                <Avatar name={name} src={member.profile?.avatarUrl} size="xs" decorative />
                <span className="min-w-0 flex-1 truncate text-ink">{name}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.05em] text-ink-3">
                  {member.role}
                </span>
              </label>
            )
          })
        )}
      </div>
    </fieldset>
  )
}
