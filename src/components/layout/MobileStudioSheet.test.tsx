import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Calendar, Team, Workspace } from '../../types/domain'
import { MobileStudioSheet } from './MobileStudioSheet'

const workspace: Workspace = {
  id: 'workspace-1',
  name: 'MicroAxis Studio',
  slug: 'microaxis-studio',
  createdBy: 'user-1',
  createdAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
}

const calendars: Array<Pick<Calendar, 'id' | 'name' | 'color' | 'kind'>> = [
  { id: 'calendar-1', name: 'Product', color: '#2F5D78', kind: 'team' },
  { id: 'calendar-2', name: "Mara's calendar", color: '#0C7A43', kind: 'personal' },
]

const teams: Array<Pick<Team, 'id' | 'name' | 'memberCount'>> = [
  { id: 'team-1', name: 'Product', memberCount: 4 },
]

function renderSheet({
  onSelectWorkspace = vi.fn(),
  onSelectCalendar = vi.fn(),
  onSelectTeam = vi.fn(),
  teamList = teams,
}: {
  onSelectWorkspace?: (workspaceId: string) => void
  onSelectCalendar?: (calendarId: string) => void
  onSelectTeam?: (teamId: string) => void
  teamList?: Array<Pick<Team, 'id' | 'name' | 'memberCount'>>
} = {}) {
  return render(
    <MobileStudioSheet
      open
      onOpenChange={() => {}}
      workspaces={[workspace]}
      activeWorkspaceId={workspace.id}
      calendars={calendars}
      teams={teamList}
      activeCalendarId="calendar-1"
      onSelectWorkspace={onSelectWorkspace}
      onSelectCalendar={onSelectCalendar}
      onSelectTeam={onSelectTeam}
    />,
  )
}

describe('MobileStudioSheet', () => {
  it('shows the workspace, calendars, and teams', () => {
    renderSheet()

    expect(screen.getByRole('heading', { name: 'Studio' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /MicroAxis Studio/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Product calendar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Product team' })).toBeInTheDocument()
  })

  it('selects a calendar and a team', async () => {
    const onSelectCalendar = vi.fn()
    const onSelectTeam = vi.fn()
    const user = userEvent.setup()
    renderSheet({ onSelectCalendar, onSelectTeam })

    await user.click(screen.getByRole('button', { name: "Mara's calendar calendar" }))
    await user.click(screen.getByRole('button', { name: 'Product team' }))

    expect(onSelectCalendar).toHaveBeenCalledWith('calendar-2')
    expect(onSelectTeam).toHaveBeenCalledWith('team-1')
  })

  it('selects a workspace', async () => {
    const onSelectWorkspace = vi.fn()
    const user = userEvent.setup()
    renderSheet({ onSelectWorkspace })

    await user.click(screen.getByRole('button', { name: /MicroAxis Studio/ }))

    expect(onSelectWorkspace).toHaveBeenCalledWith('workspace-1')
  })

  it('hides the teams section when there are no teams', () => {
    renderSheet({ teamList: [] })

    expect(screen.queryByRole('heading', { name: 'Teams' })).not.toBeInTheDocument()
  })
})
