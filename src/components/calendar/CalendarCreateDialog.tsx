import { useState, type FormEvent } from 'react'
import type { Team } from '../../types/domain'
import type { CalendarAdminInput } from '../../data/types'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

const colors = ['#0C7A43', '#2F5D78', '#8B4039', '#3F5C3A', '#7A5A1F', '#6E5140']

export function CalendarCreateDialog({
  open,
  onOpenChange,
  workspaceId,
  teams,
  onCreate,
  saving = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  teams: Team[]
  onCreate: (input: CalendarAdminInput) => void
  saving?: boolean
}) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<CalendarAdminInput['kind']>('shared')
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '')
  const [color, setColor] = useState(colors[0])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    onCreate({
      workspaceId,
      name: name.trim(),
      description: '',
      kind,
      teamId: kind === 'team' ? teamId : null,
      color,
    })
    setName('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New calendar"
      description="Personal calendars stay private. Team, workspace, and shared calendars are visible to the people you choose."
      size="sm"
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Name" htmlFor="calendar-name">
          <Input
            id="calendar-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Launch room"
            autoFocus
          />
        </Field>
        <Field label="Kind" htmlFor="calendar-kind">
          <Select
            id="calendar-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as CalendarAdminInput['kind'])}
          >
            <option value="personal">Personal</option>
            <option value="team">Team</option>
            <option value="workspace">Workspace</option>
            <option value="shared">Custom shared</option>
          </Select>
        </Field>
        {kind === 'team' ? (
          <Field label="Team" htmlFor="calendar-team">
            <Select
              id="calendar-team"
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <fieldset>
          <legend className="text-[13px] font-medium text-ink">Color</legend>
          <div className="mt-2 flex gap-2">
            {colors.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Use ${option} calendar color`}
                aria-pressed={color === option}
                onClick={() => setColor(option)}
                className={`size-7 rounded-full border-2 ${
                  color === option ? 'border-ink' : 'border-transparent'
                }`}
                style={{ backgroundColor: option }}
              />
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>
            Create calendar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
