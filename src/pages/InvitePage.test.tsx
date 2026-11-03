import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvitePage } from './InvitePage'

const mocks = vi.hoisted(() => ({
  acceptInvite: vi.fn(),
  setActiveWorkspaceId: vi.fn(),
  refresh: vi.fn(),
  toast: vi.fn(),
  auth: { user: null as null | { id: string; fullName: string }, isDemo: false },
}))

vi.mock('../lib/auth', () => ({ acceptInvite: mocks.acceptInvite }))
vi.mock('../providers/AuthProvider', () => ({
  useAuth: () => mocks.auth,
}))
vi.mock('../providers/ToastProvider', () => ({
  useToast: () => ({ toast: mocks.toast }),
}))
vi.mock('../providers/WorkspaceProvider', () => ({
  useWorkspace: () => ({
    setActiveWorkspaceId: mocks.setActiveWorkspaceId,
    refresh: mocks.refresh,
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/invite/token-1']}>
      <Routes>
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/app/calendar" element={<div>calendar page</div>} />
        <Route path="/auth" element={<div>auth page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InvitePage', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.acceptInvite.mockReset()
    mocks.setActiveWorkspaceId.mockReset()
    mocks.refresh.mockReset()
    mocks.toast.mockReset()
    mocks.auth = { user: { id: 'user-1', fullName: 'Invited Member' }, isDemo: false }
  })

  it('opens the joined workspace after accepting an invitation', async () => {
    localStorage.setItem('microaxis-pending-invite', 'token-1')
    mocks.acceptInvite.mockResolvedValue({ error: null, workspaceId: 'workspace-new' })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Accept invitation' }))

    await waitFor(() => {
      expect(mocks.setActiveWorkspaceId).toHaveBeenCalledWith('workspace-new')
    })
    expect(mocks.refresh).toHaveBeenCalled()
    expect(await screen.findByText('calendar page')).toBeInTheDocument()
    expect(localStorage.getItem('microaxis-pending-invite')).toBeNull()
  })

  it('stays on the invitation and shows the error when acceptance fails', async () => {
    mocks.acceptInvite.mockResolvedValue({ error: 'This invitation is invalid or has expired' })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Accept invitation' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This invitation is invalid or has expired',
    )
    expect(mocks.setActiveWorkspaceId).not.toHaveBeenCalled()
  })

  it('remembers the invitation through sign-in', async () => {
    mocks.auth = { user: null, isDemo: false }
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Sign in to continue' }))

    expect(localStorage.getItem('microaxis-pending-invite')).toBe('token-1')
    expect(await screen.findByText('auth page')).toBeInTheDocument()
  })
})
