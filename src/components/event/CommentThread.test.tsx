import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { EventComment } from '../../types/domain'
import { CommentThread } from './CommentThread'

const comment: EventComment = {
  id: 'c-1',
  workspaceId: 'ws-1',
  eventId: 'evt-1',
  authorId: 'u-1',
  body: '@Mara Velasco can you check the focus order on step 3?',
  createdAt: '2026-11-01T23:55:00.000Z',
  updatedAt: '2026-11-01T23:55:00.000Z',
  deletedAt: null,
  author: {
    id: 'u-1',
    fullName: 'Rin Takahashi',
    avatarUrl: null,
    timezone: 'Asia/Manila',
    weekStartsOn: 1,
    clock24h: false,
  },
}

describe('CommentThread', () => {
  it('shows edit and delete only for the author', () => {
    render(
      <CommentThread
        comments={[comment]}
        currentUserId="u-2"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText(/can you check the focus order/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit comment' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete comment' })).not.toBeInTheDocument()
  })

  it('lets the author edit and delete their comment', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    render(
      <CommentThread
        comments={[comment]}
        currentUserId="u-1"
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit comment' }))
    const editor = screen.getByRole('textbox', { name: 'Edit comment body' })
    await user.clear(editor)
    await user.type(editor, 'Updated note')
    await user.click(screen.getByRole('button', { name: 'Save comment' }))

    expect(onEdit).toHaveBeenCalledWith('c-1', 'Updated note')

    await user.click(screen.getByRole('button', { name: 'Delete comment' }))
    expect(onDelete).toHaveBeenCalledWith('c-1')
  })

  it('lets an admin moderate another author’s comment', () => {
    render(
      <CommentThread
        comments={[comment]}
        currentUserId="u-admin"
        canModerate
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Delete comment' })).toBeInTheDocument()
  })
})
