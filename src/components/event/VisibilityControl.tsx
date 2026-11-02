import { Select } from '../ui/Select'
import type { EventVisibility } from '../../types/domain'

export function VisibilityControl({
  value,
  onChange,
  id,
}: {
  value: EventVisibility
  onChange: (visibility: EventVisibility) => void
  id?: string
}) {
  return (
    <Select
      id={id}
      aria-label="Event visibility"
      value={value}
      onChange={(event) => onChange(event.target.value as EventVisibility)}
    >
      <option value="calendar">Everyone with calendar access</option>
      <option value="participants">Participants only</option>
      <option value="private">Only me</option>
    </Select>
  )
}
