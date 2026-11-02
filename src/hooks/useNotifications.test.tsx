import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DataProviderProvider } from '../data/provider'
import { DEMO_WORKSPACE_ID } from '../data/demo/demoData'
import { queryClient } from '../lib/queryClient'
import { QueryProvider } from '../providers/QueryProvider'
import { useNotifications } from './useNotifications'

function NotificationsProbe() {
  const notifications = useNotifications(DEMO_WORKSPACE_ID)

  return (
    <div>
      <span data-testid="count">{notifications.notifications.length}</span>
      <span data-testid="unread">{notifications.unreadCount}</span>
      <button type="button" onClick={() => notifications.markRead(notifications.notifications[0].id)}>
        Mark first read
      </button>
      <button type="button" onClick={() => notifications.markAllRead()}>
        Mark all read
      </button>
    </div>
  )
}

function renderProbe() {
  return render(
    <DataProviderProvider>
      <QueryProvider>
        <NotificationsProbe />
      </QueryProvider>
    </DataProviderProvider>,
  )
}

describe('useNotifications', () => {
  beforeEach(() => {
    localStorage.clear()
    queryClient.clear()
  })

  it('loads notifications and counts unread rows', async () => {
    renderProbe()

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('3')
    })
    expect(screen.getByTestId('unread')).toHaveTextContent('3')
  })

  it('marks one notification read and then all remaining notifications read', async () => {
    const user = userEvent.setup()
    renderProbe()

    await waitFor(() => {
      expect(screen.getByTestId('unread')).toHaveTextContent('3')
    })

    await user.click(screen.getByRole('button', { name: 'Mark first read' }))
    await waitFor(() => {
      expect(screen.getByTestId('unread')).toHaveTextContent('2')
    })

    await user.click(screen.getByRole('button', { name: 'Mark all read' }))
    await waitFor(() => {
      expect(screen.getByTestId('unread')).toHaveTextContent('0')
    })
  })
})
