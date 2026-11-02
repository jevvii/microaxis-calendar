import { Select } from '../ui/Select'
import type { EventStatus } from '../../types/domain'

export function EventStatusControl({
  value,
  canEdit,
  onChange,
}: {
  value: EventStatus
  canEdit: boolean
  onChange: (status: EventStatus) => void
}) {
  return (
    <Select
      aria-label="Event status"
      value={value}
      disabled={!canEdit}
      onChange={(event) => onChange(event.target.value as EventStatus)}
    >
      <option value="scheduled">Scheduled</option>
      <option value="tentative">Tentative</option>
      <option value="cancelled">Cancelled</option>
    </Select>
  )
}
