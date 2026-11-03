import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthCallbackPage } from './AuthCallbackPage'

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as null | { id: string; fullName: string },
    loading: true,
    configurationError: null as string | null,
  },
}))

vi.mock('../providers/AuthProvider', () => ({ useAuth: () => mocks.auth }))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/auth/callback']}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/invite/:token" element={<div>invite page</div>} />
        <Route path="/app/calendar" element={<div>calendar page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.auth = {
      user: { id: 'user-1', fullName: 'Signed-in Member' },
      loading: false,
      configurationError: null,
    }
  })

  it('returns to the invitation that started sign-in', async () => {
    localStorage.setItem('microaxis-pending-invite', 'token-9')
    renderPage()

    expect(await screen.findByText('invite page')).toBeInTheDocument()
    expect(localStorage.getItem('microaxis-pending-invite')).toBeNull()
  })

  it('opens the calendar when no invitation is pending', async () => {
    renderPage()

    expect(await screen.findByText('calendar page')).toBeInTheDocument()
  })
})
