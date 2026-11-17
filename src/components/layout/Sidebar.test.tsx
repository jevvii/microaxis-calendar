import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('lets the user sign out from the account row', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()

    render(
      <MemoryRouter>
        <Sidebar
          workspaceName="MicroAxis Studio"
          userName="Mara Velasco"
          onSignOut={onSignOut}
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
