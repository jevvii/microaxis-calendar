import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Save changes
      </Button>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('exposes a busy state while loading and prevents duplicate activation', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Save changes
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Save changes' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()

    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
