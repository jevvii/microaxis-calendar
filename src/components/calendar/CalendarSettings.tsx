import { useEffect, useState, type FormEvent } from 'react'
import type { Calendar, Team, WorkspaceMembership } from '../../types/domain'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { CalendarMemberList } from './CalendarMemberList'

const colors = ['#0C7A43', '#2F5D78', '#8B4039', '#3F5C3A', '#7A5A1F', '#6E5140']

export function CalendarSettings({
  open,
  onOpenChange,
  calendar,
  teams,
  members,
  onSave,
  onDelete,
  onShare,
  onRevoke,
  saving = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendar: Calendar
  teams: Team[]
  members: WorkspaceMembership[]
  onSave: (input: { name: string; description: string; color: string }) => void
  onDelete: () => void
  onShare: () => void
  onRevoke: (shareId: string) => void
  saving?: boolean
}) {
  const [name, setName] = useState(calendar.name)
  const [description, setDescription] = useState(calendar.description ?? '')
  const [color, setColor] = useState(calendar.color)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(calendar.name)
    setDescription(calendar.description ?? '')
    setColor(calendar.color)
    setConfirmDelete(false)
  }, [calendar, open])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim(), color })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Calendar settings"
      description="Calendar details are separate from individual events."
      size="md"
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Name" htmlFor="settings-calendar-name">
          <Input
            id="settings-calendar-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor="settings-calendar-description" optional>
          <Textarea
            id="settings-calendar-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
          />
        </Field>
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

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onShare}>
              Share calendar
            </Button>
            {confirmDelete ? (
              <Button type="button" variant="danger" size="sm" onClick={onDelete}>
                Confirm delete
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                Delete calendar
              </Button>
            )}
          </div>
          <Button type="submit" variant="primary" loading={saving}>
            Save calendar
          </Button>
        </div>
      </form>

      <div className="mt-5 border-t border-line pt-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
          Shared with
        </p>
        <div className="mt-2">
          <CalendarMemberList
            shares={calendar.shares ?? []}
            teams={teams}
            members={members}
            onRevoke={onRevoke}
          />
        </div>
      </div>
    </Dialog>
  )
}
