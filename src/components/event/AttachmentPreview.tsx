import type { EventAttachment } from '../../types/domain'
import { Dialog } from '../ui/Dialog'

export function AttachmentPreview({
  attachment,
  url,
  onOpenChange,
}: {
  attachment: EventAttachment | null
  url: string | null
  onOpenChange: (open: boolean) => void
}) {
  const isImage = attachment?.mimeType.startsWith('image/')
  const isPdf = attachment?.mimeType === 'application/pdf'

  return (
    <Dialog
      open={Boolean(attachment && url)}
      onOpenChange={onOpenChange}
      title={attachment?.fileName ?? 'Attachment'}
      description="Signed preview link, valid for 60 seconds."
      size="lg"
    >
      {isImage && url ? (
        <img src={url} alt={attachment?.fileName ?? ''} className="max-h-[70dvh] w-full object-contain" />
      ) : isPdf && url ? (
        <iframe src={url} title={attachment?.fileName ?? 'PDF preview'} className="h-[70dvh] w-full border-0" />
      ) : (
        <p className="text-sm text-ink-3">
          This file type does not have an inline preview. Open the signed link instead.
        </p>
      )}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium text-accent underline underline-offset-3"
        >
          Open in a new tab
        </a>
      ) : null}
    </Dialog>
  )
}
