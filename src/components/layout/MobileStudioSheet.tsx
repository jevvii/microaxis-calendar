import { Check, UsersThree } from '@phosphor-icons/react'
import { cn } from '../../lib/cn'
import type { Workspace } from '../../types/domain'
import { Dialog } from '../ui/Dialog'
import type { SidebarCalendar, SidebarTeam } from './Sidebar'

export function MobileStudioSheet({
  open,
  onOpenChange,
  workspaces,
  activeWorkspaceId,
  calendars,
  teams,
  activeCalendarId,
  onSelectWorkspace,
  onSelectCalendar,
  onSelectTeam,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  calendars: SidebarCalendar[]
  teams: SidebarTeam[]
  activeCalendarId: string | null
  onSelectWorkspace: (workspaceId: string) => void
  onSelectCalendar: (calendarId: string) => void
  onSelectTeam: (teamId: string) => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Studio"
      description="Switch workspace, choose a calendar, or open a team."
      size="sm"
      className="lg:hidden"
    >
      <div className="grid gap-6">
        <section>
          <h2 className="px-2.5 text-[12px] font-medium text-ink-3">Workspaces</h2>
          <div className="mt-1.5 grid gap-0.5">
            {workspaces.map((workspace) => {
              const active = workspace.id === activeWorkspaceId
              return (
                <button
                  key={workspace.id}
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelectWorkspace(workspace.id)}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-control px-2.5 text-left text-[13px] transition-colors hover:bg-surface-2',
                    active ? 'bg-accent-wash text-accent' : 'text-ink-2',
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-control border border-line bg-surface font-mono text-[10px]">
                    {workspace.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{workspace.name}</span>
                  {active ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.05em]">Active</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between px-2.5">
            <h2 className="text-[12px] font-medium text-ink-3">Calendars</h2>
            <span className="font-mono text-[10px] text-ink-3">{calendars.length}</span>
          </div>
          <div className="mt-1.5 grid gap-0.5">
            {calendars.map((calendar) => {
              const active = calendar.id === activeCalendarId
              return (
                <button
                  key={calendar.id}
                  type="button"
                  aria-label={`${calendar.name} calendar`}
                  aria-pressed={active}
                  onClick={() => onSelectCalendar(calendar.id)}
                  className={cn(
                    'flex min-h-11 items-center gap-2.5 rounded-control px-2.5 text-left text-[12px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink',
                    active && 'bg-surface-2 text-ink',
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: calendar.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{calendar.name}</span>
                  {calendar.kind === 'personal' ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.05em] text-ink-3">
                      You
                    </span>
                  ) : null}
                  {active ? <Check size={13} weight="bold" className="text-accent" aria-hidden /> : null}
                </button>
              )
            })}
          </div>
        </section>

        {teams.length > 0 ? (
          <section>
            <div className="flex items-center justify-between px-2.5">
              <h2 className="text-[12px] font-medium text-ink-3">Teams</h2>
              <span className="font-mono text-[10px] text-ink-3">{teams.length}</span>
            </div>
            <div className="mt-1.5 grid gap-0.5">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  aria-label={`${team.name} team`}
                  onClick={() => onSelectTeam(team.id)}
                  className="flex min-h-11 items-center gap-2.5 rounded-control px-2.5 text-left text-[12px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <UsersThree size={14} className="shrink-0 text-ink-3" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  {typeof team.memberCount === 'number' ? (
                    <span className="font-mono text-[10px] text-ink-3">{team.memberCount}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </Dialog>
  )
}
