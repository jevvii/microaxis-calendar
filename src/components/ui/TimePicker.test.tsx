import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TimePicker } from './TimePicker'

describe('TimePicker', () => {
  it('selects a quarter-hour from the list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<TimePicker id="time" value="09:00" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Choose time' }))
    await user.click(screen.getByRole('button', { name: '2:30 PM' }))

    expect(onChange).toHaveBeenCalledWith('14:30')
  })

  it('accepts a typed time on blur', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<TimePicker id="time" value="09:00" onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '9:15 PM')
    await user.tab()

    expect(onChange).toHaveBeenCalledWith('21:15')
  })
})
