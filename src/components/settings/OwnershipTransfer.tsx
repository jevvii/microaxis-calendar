import { useState } from 'react'
import type { WorkspaceMembership } from '../../types/domain'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'

export function OwnershipTransfer({
  members,
  currentUserId,
  onTransfer,
  saving = false,
}: {
  members: WorkspaceMembership[]
  currentUserId: string
  onTransfer: (userId: string) => void
  saving?: boolean
}) {
  const candidates = members.filter((member) => member.userId !== currentUserId)
  const [selected, setSelected] = useState(candidates[0]?.userId ?? '')

  return (
    <div>
      <h3 className="text-sm font-semibold">Transfer ownership</h3>
      <p className="mt-1 text-sm leading-6 text-ink-3">
        The new owner gets full control. Your role becomes Admin. At least one Owner must remain.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Select
          aria-label="New workspace owner"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="max-w-xs"
        >
          {candidates.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.profile?.fullName ?? 'Member'}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          size="sm"
          disabled={!selected}
          loading={saving}
          onClick={() => selected && onTransfer(selected)}
        >
          Transfer ownership
        </Button>
      </div>
    </div>
  )
}
