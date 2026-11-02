import { format } from 'date-fns'
import { useState } from 'react'
import type { EventComment } from '../../types/domain'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'

export function CommentThread({
  comments,
  currentUserId,
  canModerate = false,
  onEdit,
  onDelete,
}: {
  comments: EventComment[]
  currentUserId: string
  canModerate?: boolean
  onEdit: (commentId: string, body: string) => void
  onDelete: (commentId: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  if (comments.length === 0) {
    return (
      <p className="text-sm leading-6 text-ink-3">
        No comments yet. Add the context the next person will need.
      </p>
    )
  }

  return (
    <div className="grid gap-4">
      {comments.map((comment) => {
        const authorName = comment.author?.fullName ?? 'Former member'
        const own = comment.authorId === currentUserId
        const editing = editingId === comment.id

        return (
          <article key={comment.id} className="flex gap-2.5">
            <Avatar name={authorName} src={comment.author?.avatarUrl} size="sm" decorative />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-[12px] font-medium text-ink">{authorName}</p>
                <time className="font-mono text-[9px] text-ink-3" dateTime={comment.createdAt}>
                  {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                </time>
              </div>

              {editing ? (
                <div className="mt-1.5 grid gap-2">
                  <Textarea
                    aria-label="Edit comment body"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (!draft.trim()) return
                        onEdit(comment.id, draft.trim())
                        setEditingId(null)
                      }}
                    >
                      Save comment
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-ink-2">
                  {comment.body}
                </p>
              )}

              {!editing && (own || canModerate) ? (
                <div className="mt-1 flex items-center gap-2">
                  {own ? (
                    <button
                      type="button"
                      aria-label="Edit comment"
                      onClick={() => {
                        setEditingId(comment.id)
                        setDraft(comment.body)
                      }}
                      className="text-[10px] font-medium text-ink-3 hover:text-ink"
                    >
                      Edit
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Delete comment"
                    onClick={() => onDelete(comment.id)}
                    className="text-[10px] font-medium text-ink-3 hover:text-danger"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
