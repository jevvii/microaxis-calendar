import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('app routes', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, '', '/app/calendar')
  })

  it('renders the calendar workspace in demo mode without Supabase credentials', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /this week/i })).toBeInTheDocument()
    expect((await screen.findAllByText(/OceanJet release review/i)).length).toBeGreaterThan(0)
  })

  it('renders the notifications route independently of the calendar', async () => {
    window.history.pushState({}, '', '/app/notifications')
    render(<App />)

    expect(await screen.findByRole('heading', { name: /notifications/i })).toBeInTheDocument()
    expect(await screen.findByText(/Ivo added Launch room retro/i)).toBeInTheDocument()
  })
})
