import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DataProviderProvider } from '../data/provider'
import { DEMO_WORKSPACE_ID } from '../data/demo/demoData'
import { queryClient } from '../lib/queryClient'
import { AuthProvider } from '../providers/AuthProvider'
import { QueryProvider } from '../providers/QueryProvider'
import { WorkspaceProvider } from '../providers/WorkspaceProvider'
import { useCalendars } from './useCalendars'
import { useWorkspaceAdmin } from './useWorkspaceAdmin'

function SidebarProbe() {
  const calendars = useCalendars(DEMO_WORKSPACE_ID)
  const admin = useWorkspaceAdmin(DEMO_WORKSPACE_ID)

  return (
    <div>
      <div data-testid="calendar-names">
        {calendars.data?.map((calendar) => calendar.name).join('|') ?? 'loading'}
      </div>
      <button
        type="button"
        onClick={() =>
          admin.createCalendar.mutate({
            workspaceId: DEMO_WORKSPACE_ID,
            name: 'Launch room',
            description: '',
            kind: 'shared',
            teamId: null,
            color: '#0C7A43',
          })
        }
      >
        Create calendar
      </button>
    </div>
  )
}

function renderProbe() {
  return render(
    <DataProviderProvider>
      <QueryProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <SidebarProbe />
          </WorkspaceProvider>
        </AuthProvider>
      </QueryProvider>
    </DataProviderProvider>,
  )
}

describe('useWorkspaceAdmin', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient.clear()
  })

  it('adds a created calendar to the sidebar list', async () => {
    const user = userEvent.setup()
    renderProbe()

    await waitFor(() => {
      expect(screen.getByTestId('calendar-names')).not.toHaveTextContent('loading')
    })

    await user.click(screen.getByRole('button', { name: 'Create calendar' }))

    await waitFor(() => {
      expect(screen.getByTestId('calendar-names')).toHaveTextContent('Launch room')
    })
  })
})
