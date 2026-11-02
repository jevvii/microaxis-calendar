import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Dialog } from './Dialog'

function DialogHarness() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open details</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="OceanJet release review"
        description="A short review before the release window."
      >
        <Button onClick={() => setOpen(false)}>Done</Button>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('traps focus and returns focus to the trigger when closed', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)

    const trigger = screen.getByRole('button', { name: 'Open details' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'OceanJet release review' })).toBeInTheDocument()

    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true)
    })

    await user.click(screen.getByRole('button', { name: 'Done' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(document.activeElement).toBe(trigger)
    })
  })
})
