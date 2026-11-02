import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Calendar, Team, WorkspaceMembership } from '../../types/domain'
import { ShareDialog } from './ShareDialog'

const calendar: Calendar = {
  id: 'cal-1',
  workspaceId: 'ws-1',
  ownerId: 'u-1',
  teamId: null,
  name: 'Mara’s calendar',
  description: null,
  kind: 'personal',
  color: '#0C7A43',
  visibility: 'private',
  createdBy: 'u-1',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  deletedAt: null,
  shares: [],
}

const teams: Team[] = [
  {
    id: 'team-1',
    workspaceId: 'ws-1',
    name: 'Product',
    description: null,
    color: '#2F5D78',
    createdBy: 'u-1',
    createdAt: '2026-11-01T00:00:00.000Z',
    deletedAt: null,
  },
]

const members: WorkspaceMembership[] = [
  {
    id: 'wm-1',
    workspaceId: 'ws-1',
    userId: 'u-2',
    role: 'member',
    joinedAt: '2026-11-01T00:00:00.000Z',
    profile: {
      id: 'u-2',
      fullName: 'Ivo Santos',
      avatarUrl: null,
      timezone: 'Asia/Manila',
      weekStartsOn: 1,
      clock24h: false,
    },
  },
]

describe('ShareDialog', () => {
  it('shares a personal calendar with a team as busy-only viewer', async () => {
    const user = userEvent.setup()
    const onShare = vi.fn()

    render(
      <ShareDialog
        open
        onOpenChange={vi.fn()}
        calendar={calendar}
        teams={teams}
        members={members}
        onShare={onShare}
        onRevoke={vi.fn()}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Share with'), 'team')
    await user.selectOptions(screen.getByLabelText('Team'), 'team-1')
    await user.selectOptions(screen.getByLabelText('Access'), 'viewer')
    await user.click(screen.getByRole('checkbox', { name: /busy blocks only/i }))
    await user.click(screen.getByRole('button', { name: 'Share calendar' }))

    expect(onShare).toHaveBeenCalledWith({
      calendarId: 'cal-1',
      subjectType: 'team',
      subjectId: 'team-1',
      role: 'viewer',
      hideDetails: true,
    })
  })

  it('revokes an existing share', async () => {
    const user = userEvent.setup()
    const onRevoke = vi.fn()

    render(
      <ShareDialog
        open
        onOpenChange={vi.fn()}
        calendar={{
          ...calendar,
          shares: [
            {
              id: 'share-1',
              calendarId: 'cal-1',
              subjectType: 'team',
              subjectId: 'team-1',
              role: 'viewer',
              hideDetails: true,
            },
          ],
        }}
        teams={teams}
        members={members}
        onShare={vi.fn()}
        onRevoke={onRevoke}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Revoke Product access' }))
    expect(onRevoke).toHaveBeenCalledWith('share-1')
  })
})
