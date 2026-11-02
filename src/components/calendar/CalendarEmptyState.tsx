import { CalendarBlank, Plus } from '@phosphor-icons/react'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

export function CalendarEmptyState({ onNewEvent }: { onNewEvent: () => void }) {
  return (
    <EmptyState
      title="The week is still open."
      description="Add the first event, or choose a different calendar from the left rail."
      icon={<CalendarBlank size={18} aria-hidden />}
      action={
        <Button
          variant="primary"
          leadingIcon={<Plus size={15} weight="bold" aria-hidden />}
          onClick={onNewEvent}
        >
          New event
        </Button>
      }
    />
  )
}
