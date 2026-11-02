import { Trash } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import type {
  Calendar,
  CalendarRole,
  ShareSubjectType,
  Team,
  WorkspaceMembership,
} from '../../types/domain'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field } from '../ui/Field'
import { Select } from '../ui/Select'

type ShareInput = {
  calendarId: string
  subjectType: ShareSubjectType
  subjectId: string
  role: Exclude<CalendarRole, 'manager'>
  hideDetails: boolean
}

export function ShareDialog({
  open,
  onOpenChange,
  calendar,
  teams,
  members,
  onShare,
  onRevoke,
  saving = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendar: Calendar
  teams: Team[]
  members: WorkspaceMembership[]
  onShare: (input: ShareInput) => void
  onRevoke: (shareId: string) => void
  saving?: boolean
}) {
  const [subjectType, setSubjectType] = useState<ShareSubjectType>(
    teams.length > 0 ? 'team' : 'workspace',
  )
  const [subjectId, setSubjectId] = useState(teams[0]?.id ?? calendar.workspaceId)
  const [role, setRole] = useState<'viewer' | 'participant' | 'editor'>('viewer')
  const [hideDetails, setHideDetails] = useState(false)

  const availableMembers = members.filter((member) => member.userId !== calendar.ownerId)

  function changeSubjectType(next: ShareSubjectType) {
    setSubjectType(next)
    if (next === 'team') setSubjectId(teams[0]?.id ?? '')
    else if (next === 'workspace') setSubjectId(calendar.workspaceId)
    else setSubjectId(availableMembers[0]?.userId ?? '')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const resolvedSubjectId =
      subjectType === 'workspace' ? calendar.workspaceId : subjectId
    if (!resolvedSubjectId) return
    onShare({
      calendarId: calendar.id,
      subjectType,
      subjectId: resolvedSubjectId,
      role,
      hideDetails,
    })
  }

  function subjectLabel(share: NonNullable<Calendar['shares']>[number]) {
    if (share.subjectType === 'team') {
      return teams.find((team) => team.id === share.subjectId)?.name ?? 'Team'
    }
    if (share.subjectType === 'workspace') return 'Whole workspace'
    return (
      members.find((member) => member.userId === share.subjectId)?.profile?.fullName ?? 'Member'
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Share ${calendar.name}`}
      description="Sharing a personal calendar never gives recipients edit rights over your events."
      size="md"
    >
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Share with" htmlFor="share-subject-type">
            <Select
              id="share-subject-type"
              value={subjectType}
              onChange={(event) => changeSubjectType(event.target.value as ShareSubjectType)}
            >
              {teams.length > 0 ? <option value="team">A team</option> : null}
              <option value="workspace">The whole workspace</option>
              <option value="user">A person</option>
            </Select>
          </Field>

          {subjectType === 'team' ? (
            <Field label="Team" htmlFor="share-team">
              <Select
                id="share-team"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : subjectType === 'user' ? (
            <Field label="Person" htmlFor="share-member">
              <Select
                id="share-member"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
              >
                {availableMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.profile?.fullName ?? 'Member'}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Workspace" htmlFor="share-workspace">
              <Select id="share-workspace" value={calendar.workspaceId} disabled>
                <option value={calendar.workspaceId}>Everyone in this workspace</option>
              </Select>
            </Field>
          )}
        </div>

        <Field label="Access" htmlFor="share-role">
          <Select
            id="share-role"
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
          >
            <option value="viewer">Viewer · details, RSVP, comments</option>
            <option value="participant">Participant · can add events</option>
            {calendar.kind !== 'personal' ? (
              <option value="editor">Editor · can edit shared events</option>
            ) : null}
          </Select>
        </Field>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line bg-surface-2 p-3">
          <input
            type="checkbox"
            checked={hideDetails}
            onChange={(event) => setHideDetails(event.target.checked)}
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <span>
            <span className="block text-[12px] font-medium text-ink">Show busy blocks only</span>
            <span className="mt-0.5 block text-xs leading-5 text-ink-3">
              Recipients see time and status, never titles, descriptions, locations, or attachments.
            </span>
          </span>
        </label>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>
            Share calendar
          </Button>
        </div>
      </form>

      {calendar.shares?.length ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
            Current access
          </p>
          <div className="mt-2 divide-y divide-line border-y border-line">
            {calendar.shares.map((share) => (
              <div key={share.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-ink">
                    {subjectLabel(share)}
                  </p>
                  <p className="text-[10px] text-ink-3">
                    {share.role} {share.hideDetails ? '· busy blocks only' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Revoke ${subjectLabel(share)} access`}
                  onClick={() => onRevoke(share.id)}
                  className="inline-flex size-7 items-center justify-center rounded-control text-ink-3 hover:bg-danger-wash hover:text-danger"
                >
                  <Trash size={13} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Dialog>
  )
}
