import type { WorkspaceRole } from '../../types/domain'
import { Select } from '../ui/Select'

export function RoleSelect({
  value,
  disabled,
  onChange,
}: {
  value: WorkspaceRole
  disabled?: boolean
  onChange: (role: WorkspaceRole) => void
}) {
  return (
    <Select
      aria-label="Workspace role"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as WorkspaceRole)}
      className="h-8 w-28 text-[11px]"
    >
      <option value="owner">Owner</option>
      <option value="admin">Admin</option>
      <option value="member">Member</option>
    </Select>
  )
}
