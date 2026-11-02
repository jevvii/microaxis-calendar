import { EnvelopeSimple, Plus } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { CalendarCreateDialog } from '../components/calendar/CalendarCreateDialog'
import { CalendarSettings } from '../components/calendar/CalendarSettings'
import { ShareDialog } from '../components/calendar/ShareDialog'
import { AuditLog } from '../components/workspace/AuditLog'
import { MemberTable } from '../components/workspace/MemberTable'
import { TeamEditor } from '../components/workspace/TeamEditor'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { createWorkspaceInvite } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useCalendars } from '../hooks/useCalendars'
import { useCategories } from '../hooks/useCategories'
import { useCalendarAdmin, useWorkspaceAdmin } from '../hooks/useWorkspaceAdmin'
import { useAuth } from '../providers/AuthProvider'
import { useToast } from '../providers/ToastProvider'
import { useWorkspace } from '../providers/WorkspaceProvider'
import type { WorkspaceRole } from '../types/domain'

type Tab = 'members' | 'teams' | 'calendars' | 'categories' | 'audit'

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'members', label: 'Members' },
  { id: 'teams', label: 'Teams' },
  { id: 'calendars', label: 'Calendars' },
  { id: 'categories', label: 'Categories' },
  { id: 'audit', label: 'Audit log' },
]

export function WorkspacePage() {
  const { user, isDemo } = useAuth()
  const { toast } = useToast()
  const { activeWorkspace, activeWorkspaceId, members, teams, membership } = useWorkspace()
  const calendarsQuery = useCalendars(activeWorkspaceId)
  const categoriesQuery = useCategories(activeWorkspaceId)
  const admin = useWorkspaceAdmin(activeWorkspaceId)
  const calendarAdmin = useCalendarAdmin(activeWorkspaceId)
  const [tab, setTab] = useState<Tab>('members')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member')
  const [inviteSaving, setInviteSaving] = useState(false)
  const [teamEditorOpen, setTeamEditorOpen] = useState(false)
  const [teamEditorId, setTeamEditorId] = useState<string | null>(null)
  const [calendarCreateOpen, setCalendarCreateOpen] = useState(false)
  const [settingsCalendarId, setSettingsCalendarId] = useState<string | null>(null)
  const [shareCalendarId, setShareCalendarId] = useState<string | null>(null)

  const calendars = calendarsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const canManage = membership?.role === 'owner' || membership?.role === 'admin'
  const editingTeam = teamEditorId ? teams.find((team) => team.id === teamEditorId) ?? null : null
  const settingsCalendar = calendars.find((calendar) => calendar.id === settingsCalendarId) ?? null
  const shareCalendar = calendars.find((calendar) => calendar.id === shareCalendarId) ?? null

  async function sendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeWorkspaceId) return
    setInviteSaving(true)
    const result = await createWorkspaceInvite({
      workspaceId: activeWorkspaceId,
      email: inviteEmail,
      role: inviteRole,
    })
    if (result.error || !result.invite) {
      setInviteSaving(false)
      toast({ title: 'Could not create the invitation', description: result.error ?? undefined, tone: 'error' })
      return
    }

    if (!supabase || isDemo) {
      setInviteSaving(false)
      toast({
        title: 'Invitation created',
        description: 'Email delivery requires a configured Supabase and Brevo environment.',
        tone: 'info',
      })
      setInviteOpen(false)
      return
    }

    const { error } = await supabase.functions.invoke('send-invite', {
      body: { inviteId: result.invite.id },
    })
    setInviteSaving(false)
    if (error) {
      toast({ title: 'Invitation saved, but email failed', description: error.message, tone: 'error' })
      return
    }
    toast({ title: 'Invitation sent', tone: 'success' })
    setInviteEmail('')
    setInviteOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
            {activeWorkspace?.name ?? 'Workspace settings'}
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            Members, teams, calendars, categories, and audit history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {membership ? <Badge tone="accent">{membership.role}</Badge> : null}
          {canManage ? (
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<EnvelopeSimple size={14} aria-hidden />}
              onClick={() => setInviteOpen(true)}
            >
              Invite member
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line pb-px">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={`shrink-0 border-b-2 px-3 py-2 text-[12px] font-medium transition-colors ${
              tab === item.id
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'members' ? (
          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Members</h2>
                <p className="mt-1 text-sm text-ink-3">
                  Multiple owners, admins, and leads are allowed. The last owner cannot be removed.
                </p>
              </div>
              <span className="font-mono text-[10px] text-ink-3">{members.length}</span>
            </div>
            <MemberTable
              members={members}
              currentUserId={user?.id ?? ''}
              canManage={canManage}
              onRoleChange={(userId, role) => admin.updateMember.mutate({ userId, role })}
              onRemove={(userId) => admin.removeMember.mutate(userId)}
            />
          </section>
        ) : null}

        {tab === 'teams' ? (
          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Teams</h2>
                <p className="mt-1 text-sm text-ink-3">
                  Team leads can manage membership and team calendars.
                </p>
              </div>
              {canManage ? (
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<Plus size={14} aria-hidden />}
                  onClick={() => {
                    setTeamEditorId(null)
                    setTeamEditorOpen(true)
                  }}
                >
                  New team
                </Button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    setTeamEditorId(team.id)
                    setTeamEditorOpen(true)
                  }}
                  className="rounded-panel border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{team.name}</p>
                      <p className="mt-1 text-xs leading-5 text-ink-3">{team.description}</p>
                    </div>
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                  </div>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-3">
                    {team.memberCount ?? 0} members · {team.leadIds?.length ?? 0} leads
                  </p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {tab === 'calendars' ? (
          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Calendars</h2>
                <p className="mt-1 text-sm text-ink-3">
                  Personal calendars can be shared with a team, the workspace, or named people.
                </p>
              </div>
              {canManage ? (
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<Plus size={14} aria-hidden />}
                  onClick={() => setCalendarCreateOpen(true)}
                >
                  New calendar
                </Button>
              ) : null}
            </div>
            <div className="mt-3 divide-y divide-line border-y border-line">
              {calendars.map((calendar) => (
                <div key={calendar.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: calendar.color }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{calendar.name}</p>
                    <p className="text-xs text-ink-3">
                      {calendar.kind} · {calendar.shares?.length ?? 0} shares
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShareCalendarId(calendar.id)}
                  >
                    Share
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSettingsCalendarId(calendar.id)}
                  >
                    Settings
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {tab === 'categories' ? (
          <section>
            <h2 className="text-sm font-semibold">Categories</h2>
            <p className="mt-1 text-sm text-ink-3">
              Workspace-defined categories keep the calendar legible and the filters meaningful.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2.5 rounded-panel border border-line bg-surface p-3"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-ink">{category.name}</span>
                  <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.05em] text-ink-3">
                    {category.icon}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {tab === 'audit' ? (
          <section>
            <h2 className="text-sm font-semibold">Audit log</h2>
            <p className="mt-1 text-sm text-ink-3">
              Membership, team, calendar, and invitation changes. Personal calendar details never
              appear here.
            </p>
            <div className="mt-4">
              <AuditLog entries={admin.auditQuery.data ?? []} loading={admin.auditQuery.isLoading} />
            </div>
          </section>
        ) : null}
      </div>

      <Dialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite a workspace member"
        description="Workspace invitations expire after seven days. Only owners and admins can invite new people."
        size="sm"
      >
        <form className="grid gap-4" onSubmit={sendInvite}>
          <Field label="Email" htmlFor="invite-email">
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="teammate@studio.com"
            />
          </Field>
          <Field label="Role" htmlFor="invite-role">
            <Select
              id="invite-role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as WorkspaceRole)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Button type="submit" variant="primary" loading={inviteSaving}>
            Send invitation
          </Button>
        </form>
      </Dialog>

      <TeamEditor
        open={teamEditorOpen}
        onOpenChange={setTeamEditorOpen}
        team={editingTeam}
        members={members}
        saving={admin.createTeam.isPending || admin.updateTeam.isPending}
        onSave={(input) => {
          if (editingTeam) {
            admin.updateTeam.mutate(
              { teamId: editingTeam.id, input },
              { onSuccess: () => setTeamEditorOpen(false) },
            )
          } else {
            admin.createTeam.mutate(input, { onSuccess: () => setTeamEditorOpen(false) })
          }
        }}
        onDelete={
          editingTeam
            ? () => {
                admin.deleteTeam.mutate(editingTeam.id, {
                  onSuccess: () => setTeamEditorOpen(false),
                })
              }
            : undefined
        }
      />

      {activeWorkspaceId ? (
        <CalendarCreateDialog
          open={calendarCreateOpen}
          onOpenChange={setCalendarCreateOpen}
          workspaceId={activeWorkspaceId}
          teams={teams}
          saving={admin.createCalendar.isPending}
          onCreate={(input) =>
            admin.createCalendar.mutate(input, {
              onSuccess: () => setCalendarCreateOpen(false),
            })
          }
        />
      ) : null}

      {settingsCalendar ? (
        <CalendarSettings
          open={Boolean(settingsCalendarId)}
          onOpenChange={(open) => !open && setSettingsCalendarId(null)}
          calendar={settingsCalendar}
          teams={teams}
          members={members}
          saving={calendarAdmin.updateCalendar.isPending}
          onSave={(input) =>
            calendarAdmin.updateCalendar.mutate(
              { calendarId: settingsCalendar.id, input },
              { onSuccess: () => setSettingsCalendarId(null) },
            )
          }
          onDelete={() =>
            calendarAdmin.deleteCalendar.mutate(settingsCalendar.id, {
              onSuccess: () => setSettingsCalendarId(null),
            })
          }
          onShare={() => {
            setShareCalendarId(settingsCalendar.id)
            setSettingsCalendarId(null)
          }}
          onRevoke={(shareId) => calendarAdmin.deleteShare.mutate(shareId)}
        />
      ) : null}

      {shareCalendar ? (
        <ShareDialog
          open={Boolean(shareCalendarId)}
          onOpenChange={(open) => !open && setShareCalendarId(null)}
          calendar={shareCalendar}
          teams={teams}
          members={members}
          saving={calendarAdmin.upsertShare.isPending}
          onShare={(input) =>
            calendarAdmin.upsertShare.mutate(input, {
              onSuccess: () => setShareCalendarId(null),
            })
          }
          onRevoke={(shareId) => calendarAdmin.deleteShare.mutate(shareId)}
        />
      ) : null}
    </div>
  )
}
