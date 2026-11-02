import { useEffect, useState, type FormEvent } from 'react'
import type { Team, WorkspaceMembership } from '../../types/domain'
import type { TeamAdminInput } from '../../data/types'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Avatar } from '../ui/Avatar'

const colors = ['#2F5D78', '#8B4039', '#3F5C3A', '#7A5A1F', '#6E5140']

export function TeamEditor({
  open,
  onOpenChange,
  team,
  members,
  onSave,
  onDelete,
  saving = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: Team | null
  members: WorkspaceMembership[]
  onSave: (input: TeamAdminInput) => void
  onDelete?: () => void
  saving?: boolean
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(colors[0])
  const [roles, setRoles] = useState<Record<string, 'none' | 'member' | 'lead'>>({})

  useEffect(() => {
    if (!open) return
    setName(team?.name ?? '')
    setDescription(team?.description ?? '')
    setColor(team?.color ?? colors[0])
    const next: Record<string, 'none' | 'member' | 'lead'> = {}
    for (const member of members) {
      if (team?.leadIds?.includes(member.userId)) next[member.userId] = 'lead'
      else if (team?.memberIds?.includes(member.userId)) next[member.userId] = 'member'
      else next[member.userId] = 'none'
    }
    setRoles(next)
  }, [members, open, team])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    const leadIds = Object.entries(roles)
      .filter(([, role]) => role === 'lead')
      .map(([userId]) => userId)
    const memberIds = Object.entries(roles)
      .filter(([, role]) => role === 'member')
      .map(([userId]) => userId)
    onSave({
      name: name.trim(),
      description: description.trim(),
      color,
      leadIds,
      memberIds,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={team ? `Edit ${team.name}` : 'New team'}
      description="Leads manage team membership and team calendars. Multiple leads are allowed."
      size="md"
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Team name" htmlFor="team-name">
          <Input
            id="team-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Client Delivery"
            autoFocus
          />
        </Field>
        <Field label="Description" htmlFor="team-description" optional>
          <Textarea
            id="team-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="What this team owns."
          />
        </Field>
        <fieldset>
          <legend className="text-[13px] font-medium text-ink">Color</legend>
          <div className="mt-2 flex gap-2">
            {colors.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Use ${option} team color`}
                aria-pressed={color === option}
                onClick={() => setColor(option)}
                className={`size-7 rounded-full border-2 transition-transform ${
                  color === option ? 'scale-110 border-ink' : 'border-transparent'
                }`}
                style={{ backgroundColor: option }}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[13px] font-medium text-ink">Members</legend>
          <div className="mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-control border border-line">
            {members.map((member) => {
              const name = member.profile?.fullName ?? 'Member'
              return (
                <div key={member.userId} className="flex items-center gap-2.5 px-3 py-2">
                  <Avatar name={name} src={member.profile?.avatarUrl} size="xs" decorative />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{name}</span>
                  <Select
                    aria-label={`${name} team role`}
                    value={roles[member.userId] ?? 'none'}
                    onChange={(event) =>
                      setRoles((current) => ({
                        ...current,
                        [member.userId]: event.target.value as 'none' | 'member' | 'lead',
                      }))
                    }
                    className="h-8 w-28 text-[11px]"
                  >
                    <option value="none">No access</option>
                    <option value="member">Member</option>
                    <option value="lead">Lead</option>
                  </Select>
                </div>
              )
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
          {team && onDelete ? (
            <Button variant="ghost" size="sm" onClick={onDelete} disabled={saving}>
              Delete team
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" variant="primary" loading={saving}>
            {team ? 'Save team' : 'Create team'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
