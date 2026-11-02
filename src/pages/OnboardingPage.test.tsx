import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'

describe('OnboardingPage', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, '', '/onboarding')
  })

  it('creates a workspace and enters the calendar', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(await screen.findByLabelText('Workspace name'), 'Northwind Studio')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/app/calendar')
    })
  })
})
