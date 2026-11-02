import { FilePdf, FileText, Image, Trash } from '@phosphor-icons/react'
import { format } from 'date-fns'
import type { EventAttachment } from '../../types/domain'
import { CreatorMark } from '../calendar/CreatorMark'

function fileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') return FilePdf
  if (mimeType.startsWith('image/')) return Image
  return FileText
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentList({
  attachments,
  canManage,
  onOpen,
  onDelete,
}: {
  attachments: EventAttachment[]
  canManage: boolean
  onOpen: (attachment: EventAttachment) => void
  onDelete: (attachmentId: string) => void
}) {
  if (attachments.length === 0) {
    return <p className="text-sm text-ink-3">No files attached yet.</p>
  }

  return (
    <div className="divide-y divide-line border-y border-line">
      {attachments.map((attachment) => {
        const Icon = fileIcon(attachment.mimeType)
        return (
          <div key={attachment.id} className="flex items-center gap-3 py-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-control border border-line bg-surface-2 text-ink-3">
              <Icon size={15} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onOpen(attachment)}
                className="block max-w-full truncate text-left text-[12px] font-medium text-ink hover:text-accent"
              >
                {attachment.fileName}
              </button>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-ink-3">
                <span className="font-mono">{fileSize(attachment.sizeBytes)}</span>
                <span>·</span>
                <time dateTime={attachment.createdAt}>
                  {format(new Date(attachment.createdAt), 'MMM d')}
                </time>
                {attachment.uploader ? (
                  <>
                    <span>·</span>
                    <CreatorMark
                      name={attachment.uploader.fullName}
                      avatarUrl={attachment.uploader.avatarUrl}
                      size="xs"
                      showName
                    />
                  </>
                ) : null}
              </div>
            </div>
            {canManage ? (
              <button
                type="button"
                aria-label={`Delete ${attachment.fileName}`}
                onClick={() => onDelete(attachment.id)}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-control text-ink-3 hover:bg-danger-wash hover:text-danger"
              >
                <Trash size={13} aria-hidden />
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
