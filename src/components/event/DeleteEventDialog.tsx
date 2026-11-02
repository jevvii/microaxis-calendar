import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

export function DeleteEventDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
  loading = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onConfirm: () => void
  loading?: boolean
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this event?"
      description={`“${title}” will be removed from the calendar. This can be undone from the workspace audit log for 30 days.`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Keep event
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            Delete event
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-ink-3">
        Participants will no longer see the event. Attachments and comments are removed with it.
      </p>
    </Dialog>
  )
}
