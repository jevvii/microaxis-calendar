import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RsvpControl } from './RsvpControl'

describe('RsvpControl', () => {
  it('updates only the current user’s attendance choice', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <RsvpControl
        eventId="evt-1"
        userId="u-1"
        value="no_response"
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Going' }))
    expect(onChange).toHaveBeenCalledWith('going')

    await user.click(screen.getByRole('button', { name: 'Maybe' }))
    expect(onChange).toHaveBeenCalledWith('maybe')
  })

  it('marks the active choice for assistive technology', () => {
    render(
      <RsvpControl eventId="evt-1" userId="u-1" value="going" onChange={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Going' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Maybe' })).toHaveAttribute('aria-pressed', 'false')
  })
})
