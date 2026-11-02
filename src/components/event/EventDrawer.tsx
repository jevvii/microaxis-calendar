import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Clock,
  MapPin,
  PencilSimple,
  Trash,
  Users,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type {
  Calendar,
  Event,
  EventCategory,
  EventInput,
  EventStatus,
  RsvpStatus,
  WorkspaceMembership,
} from '../../types/domain'
import { eventTimeLabel } from '../../lib/date'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { CreatorMark } from '../calendar/CreatorMark'
import { DeleteEventDialog } from './DeleteEventDialog'
import { EventCollaboration } from './EventCollaboration'
import { EventForm } from './EventForm'
import { EventStatusControl } from './EventStatusControl'
import { RsvpControl } from './RsvpControl'

function recurrenceLabel(rule: string | null) {
  if (!rule) return 'Does not repeat'
  if (rule.includes('FREQ=DAILY')) return 'Repeats daily'
  if (rule.includes('FREQ=WEEKLY')) return 'Repeats weekly'
  if (rule.includes('FREQ=MONTHLY')) return 'Repeats monthly'
  return 'Repeats'
}

export function EventDrawer({
  open,
  onOpenChange,
  mode,
  event,
  calendars,
  categories,
  members,
  currentUserId,
  canEdit,
  canModerate = false,
  saving = false,
  deleting = false,
  conflict,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onRsvp,
  onStatusChange,
  onReviewConflict,
  onKeepDraft,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'view' | 'create' | 'edit'
  event: Event | null
  calendars: Calendar[]
  categories: EventCategory[]
  members: WorkspaceMembership[]
  currentUserId: string
  canEdit: boolean
  canModerate?: boolean
  saving?: boolean
  deleting?: boolean
  conflict?: Event | null
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (input: EventInput) => void
  onDelete: () => void
  onRsvp: (status: RsvpStatus) => void
  onStatusChange: (status: EventStatus) => void
  onReviewConflict?: () => void
  onKeepDraft?: () => void
}) {
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      returnFocusRef.current?.focus()
    }
  }, [open])

  const editing = mode === 'create' || mode === 'edit'
  const participant = event?.participants?.find((item) => item.userId === currentUserId)
  const creatorName = event?.creator?.fullName ?? 'Unknown creator'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[1px]" />
        <DialogPrimitive.Content
          onOpenAutoFocus={() => {
            returnFocusRef.current = document.activeElement as HTMLElement | null
          }}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-surface text-ink outline-none sm:max-w-md"
        >
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4">
            <DialogPrimitive.Title className="min-w-0 truncate text-sm font-semibold tracking-[-0.01em]">
              {mode === 'create' ? 'New event' : mode === 'edit' ? 'Edit event' : event?.title ?? 'Event'}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Event details and collaboration controls.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close asChild>
              <IconButton label="Close event">
                <X size={16} weight="bold" aria-hidden />
              </IconButton>
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {conflict ? (
              <div className="mb-5 rounded-panel border border-warning/30 bg-warning-wash p-4">
                <div className="flex items-start gap-2.5">
                  <WarningCircle size={17} className="mt-0.5 text-warning" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-warning">
                      This event changed while you were editing.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-warning/90">
                      Your draft is still here. Review the newer version before replacing it.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={onReviewConflict}>
                        Review current version
                      </Button>
                      <Button variant="ghost" size="sm" onClick={onKeepDraft}>
                        Keep my draft
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editing ? (
              <EventForm
                mode={mode === 'create' ? 'create' : 'edit'}
                initial={event}
                calendars={calendars}
                categories={categories}
                members={members}
                onSubmit={onSave}
                onCancel={mode === 'edit' ? onCancelEdit : undefined}
                submitting={saving}
              />
            ) : event ? (
              <div className="grid gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: event.category?.color ?? '#67675E' }}
                      aria-hidden
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                      {event.category?.name ?? 'Event'}
                    </span>
                    {event.priority === 'urgent' ? <Badge tone="danger">Urgent</Badge> : null}
                    {event.priority === 'high' ? <Badge tone="warning">High</Badge> : null}
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{event.title}</h2>
                  <p className="mt-2 text-sm text-ink-3">
                    {event.allDay
                      ? 'All day'
                      : eventTimeLabel(event, event.timeZone, false)}
                  </p>
                </div>

                <div className="grid gap-2.5 border-y border-line py-4 text-sm text-ink-2">
                  <div className="flex items-center gap-2.5">
                    <Clock size={15} className="text-ink-3" aria-hidden />
                    <span>{recurrenceLabel(event.recurrenceRule)}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin size={15} className="text-ink-3" aria-hidden />
                    <span>{event.location || 'No location'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Users size={15} className="text-ink-3" aria-hidden />
                    <span>
                      {event.participants?.length
                        ? `${event.participants.length} participants`
                        : 'Everyone with calendar access'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CreatorMark
                      name={creatorName}
                      avatarUrl={event.creator?.avatarUrl}
                      size="sm"
                      showName
                    />
                    <span className="text-ink-3">created this event</span>
                  </div>
                </div>

                {event.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-7 text-ink-2">
                    {event.description}
                  </p>
                ) : (
                  <p className="text-sm italic text-ink-3">No description yet.</p>
                )}

                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Your response</h3>
                    <Badge tone={participant?.status === 'going' ? 'accent' : 'neutral'}>
                      {participant?.status?.replace('_', ' ') ?? 'No response'}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <RsvpControl
                      eventId={event.id}
                      userId={currentUserId}
                      value={participant?.status ?? 'no_response'}
                      onChange={onRsvp}
                    />
                  </div>
                </section>

                {event.participants?.length ? (
                  <section>
                    <h3 className="text-sm font-semibold">Participants</h3>
                    <div className="mt-2 divide-y divide-line border-y border-line">
                      {event.participants.map((item) => (
                        <div key={item.userId} className="flex items-center gap-2.5 py-2.5">
                          <CreatorMark
                            name={item.profile?.fullName ?? 'Member'}
                            avatarUrl={item.profile?.avatarUrl}
                            size="xs"
                            showName
                          />
                          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.05em] text-ink-3">
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {canEdit ? (
                  <section>
                    <h3 className="text-sm font-semibold">Event status</h3>
                    <div className="mt-2">
                      <EventStatusControl
                        value={event.status}
                        canEdit={canEdit}
                        onChange={onStatusChange}
                      />
                    </div>
                  </section>
                ) : null}

                <EventCollaboration
                  event={event}
                  currentUserId={currentUserId}
                  canModerate={canModerate}
                  canManage={canEdit}
                  members={members}
                />
              </div>
            ) : null}
          </div>

          {!editing && event ? (
            <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
              <div className="flex items-center gap-1.5">
                {canEdit ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      leadingIcon={<PencilSimple size={14} aria-hidden />}
                      onClick={onEdit}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leadingIcon={<Trash size={14} aria-hidden />}
                      onClick={() => setDeleteOpen(true)}
                    >
                      Delete
                    </Button>
                  </>
                ) : (
                  <p className="text-[11px] text-ink-3">Only the creator or a calendar manager can edit.</p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      {event ? (
        <DeleteEventDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={event.title}
          loading={deleting}
          onConfirm={() => {
            setDeleteOpen(false)
            onDelete()
          }}
        />
      ) : null}
    </DialogPrimitive.Root>
  )
}
