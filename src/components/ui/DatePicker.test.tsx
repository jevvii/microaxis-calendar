import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker } from './DatePicker'

describe('DatePicker', () => {
  it('selects a day from the calendar grid', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <DatePicker
        id="date"
        value="2026-11-03"
        onChange={onChange}
        timeZone="Asia/Manila"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Choose date' }))
    await user.click(screen.getByRole('button', { name: 'November 10, 2026' }))

    expect(onChange).toHaveBeenCalledWith('2026-11-10')
  })

  it('accepts a typed date on blur', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <DatePicker
        id="date"
        value="2026-11-03"
        onChange={onChange}
        timeZone="Asia/Manila"
      />,
    )

    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '2026-11-12')
    await user.tab()

    expect(onChange).toHaveBeenCalledWith('2026-11-12')
  })
})
