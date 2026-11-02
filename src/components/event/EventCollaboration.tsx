import { ChatCircle, Paperclip, ClockCounterClockwise } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { useDataProvider } from '../../data/provider'
import { useComments, useCreateComment, useDeleteComment, useEventActivity, useUpdateComment } from '../../hooks/useComments'
import { useAttachments, useDeleteAttachment, useUploadAttachment } from '../../hooks/useAttachments'
import { useToast } from '../../providers/ToastProvider'
import type { Event, EventAttachment, WorkspaceMembership } from '../../types/domain'
import { ActivityLog } from './ActivityLog'
import { AttachmentList } from './AttachmentList'
import { AttachmentPreview } from './AttachmentPreview'
import { AttachmentUploader } from './AttachmentUploader'
import { CommentComposer } from './CommentComposer'
import { CommentThread } from './CommentThread'

function SectionHeading({
  icon,
  title,
  count,
}: {
  icon: ReactNode
  title: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-ink-3">{icon}</span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {typeof count === 'number' ? (
        <span className="font-mono text-[10px] text-ink-3">{count}</span>
      ) : null}
    </div>
  )
}

export function EventCollaboration({
  event,
  currentUserId,
  canModerate,
  canManage,
  members,
}: {
  event: Event
  currentUserId: string
  canModerate: boolean
  canManage: boolean
  members: WorkspaceMembership[]
}) {
  const provider = useDataProvider()
  const { toast } = useToast()
  const commentsQuery = useComments(event.id)
  const attachmentsQuery = useAttachments(event.id)
  const activityQuery = useEventActivity(event.id)
  const createComment = useCreateComment(event.id)
  const updateComment = useUpdateComment(event.id)
  const deleteComment = useDeleteComment(event.id)
  const uploadAttachment = useUploadAttachment(event.id)
  const deleteAttachment = useDeleteAttachment(event.id)
  const [preview, setPreview] = useState<{ attachment: EventAttachment; url: string } | null>(null)

  const comments = commentsQuery.data ?? []
  const attachments = attachmentsQuery.data ?? []
  const activity = activityQuery.data ?? []

  async function openAttachment(attachment: EventAttachment) {
    try {
      const url = await provider.getAttachmentUrl(attachment.storagePath)
      if (!url) {
        toast({
          title: 'Preview unavailable',
          description: 'Demo attachments do not carry file bytes. Open a Supabase-backed workspace to preview.',
          tone: 'info',
        })
        return
      }
      setPreview({ attachment, url })
    } catch (reason) {
      toast({
        title: 'Could not open the attachment',
        description: reason instanceof Error ? reason.message : 'Try again.',
        tone: 'error',
      })
    }
  }

  return (
    <div className="grid gap-7 border-t border-line pt-6">
      <section>
        <SectionHeading
          icon={<ChatCircle size={15} aria-hidden />}
          title="Comments"
          count={comments.length}
        />
        <div className="mt-3">
          {commentsQuery.isLoading ? (
            <p className="text-sm text-ink-3">Loading comments…</p>
          ) : (
            <CommentThread
              comments={comments}
              currentUserId={currentUserId}
              canModerate={canModerate}
              onEdit={(commentId, body) =>
                updateComment.mutate({ commentId, body })
              }
              onDelete={(commentId) => deleteComment.mutate(commentId)}
            />
          )}
        </div>
        <div className="mt-4">
          <CommentComposer
            members={members}
            submitting={createComment.isPending}
            onSubmit={(body) =>
              createComment.mutate(body, {
                onError: (reason) =>
                  toast({
                    title: 'Could not post the comment',
                    description: reason instanceof Error ? reason.message : 'Try again.',
                    tone: 'error',
                  }),
              })
            }
          />
        </div>
      </section>

      <section>
        <SectionHeading
          icon={<Paperclip size={15} aria-hidden />}
          title="Attachments"
          count={attachments.length}
        />
        <div className="mt-3 grid gap-3">
          <AttachmentUploader
            uploading={uploadAttachment.isPending}
            onUpload={(file) =>
              uploadAttachment.mutate(
                { workspaceId: event.workspaceId, eventId: event.id, file },
                {
                  onError: (reason) =>
                    toast({
                      title: 'Could not upload the file',
                      description: reason instanceof Error ? reason.message : 'Try again.',
                      tone: 'error',
                    }),
                },
              )
            }
          />
          <AttachmentList
            attachments={attachments}
            canManage={canManage}
            onOpen={openAttachment}
            onDelete={(attachmentId) => deleteAttachment.mutate(attachmentId)}
          />
        </div>
      </section>

      <section>
        <SectionHeading
          icon={<ClockCounterClockwise size={15} aria-hidden />}
          title="Activity"
        />
        <div className="mt-3">
          <ActivityLog activity={activity} />
        </div>
      </section>

      <AttachmentPreview
        attachment={preview?.attachment ?? null}
        url={preview?.url ?? null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      />
    </div>
  )
}
