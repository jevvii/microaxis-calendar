import { ArrowClockwise, Check, X } from '@phosphor-icons/react'
import { useState } from 'react'
import type {
  Event,
  EventOccurrence,
  ScheduleRequest,
} from '../../types/domain'
import { useRespondScheduleRequest, useScheduleRequests } from '../../hooks/useScheduleRequests'
import { eventTimeLabel, fromDateTimeLocal, toDateTimeLocal } from '../../lib/date'
import { adjustEndAfterStart } from '../../lib/dateTimePicker'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { DateTimeFields } from './DateTimeFields'

const statusTone = {
  pending: 'warning',
  accepted: 'accent',
  declined: 'danger',
  countered: 'info',
  withdrawn: 'neutral',
  superseded: 'neutral',
} as const

export function ScheduleRequestPanel({
  event,
  events,
  currentUserId,
  timeZone,
  clock24h,
  weekStartsOn,
  onEdit,
}: {
  event: Event
  events: EventOccurrence[]
  currentUserId: string
  timeZone: string
  clock24h: boolean
  weekStartsOn: 0 | 1
  onEdit: () => void
}) {
  const { data: requests = [] } = useScheduleRequests(event.workspaceId)
  const respond = useRespondScheduleRequest()
  const [counterRequest, setCounterRequest] = useState<ScheduleRequest | null>(null)
  const [counterStart, setCounterStart] = useState('')
  const [counterEnd, setCounterEnd] = useState('')

  const relevant = requests.filter(
    (request) => request.eventId === event.id || request.conflictEventId === event.id,
  )

  if (relevant.length === 0) return null

  function openCounter(request: ScheduleRequest) {
    const requestingEvent = events.find((item) => item.id === request.eventId)
    const start = requestingEvent
      ? toDateTimeLocal(requestingEvent.startsAt, timeZone)
      : toDateTimeLocal(new Date().toISOString(), timeZone)
    const end = requestingEvent
      ? toDateTimeLocal(requestingEvent.endsAt, timeZone)
      : adjustEndAfterStart(start, start, '', false)
    setCounterStart(start)
    setCounterEnd(end)
    setCounterRequest(request)
  }

  function submitCounter() {
    if (!counterRequest || !counterStart || !counterEnd) return
    respond.mutate(
      {
        requestId: counterRequest.id,
        action: 'counter',
        proposedStartsAt: fromDateTimeLocal(counterStart, timeZone),
        proposedEndsAt: fromDateTimeLocal(counterEnd, timeZone),
      },
      { onSuccess: () => setCounterRequest(null) },
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Schedule requests</h3>
        <Badge tone="neutral">{relevant.length}</Badge>
      </div>

      <div className="mt-2 grid gap-2">
        {relevant.map((request) => {
          const isRecipient = request.recipientId === currentUserId
          const isRequester = request.requesterId === currentUserId
          const onConflictSide = event.id === request.conflictEventId
          const onRequestingSide = event.id === request.eventId
          const otherPerson = isRecipient ? request.requester : request.recipient
          const proposed =
            request.proposedStartsAt && request.proposedEndsAt
              ? eventTimeLabel(
                  {
                    ...event,
                    startsAt: request.proposedStartsAt,
                    endsAt: request.proposedEndsAt,
                  },
                  timeZone,
                  clock24h,
                )
              : null

          return (
            <div
              key={request.id}
              className="rounded-panel border border-line bg-surface-2/60 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone[request.status]}>{request.status}</Badge>
                <span className="min-w-0 flex-1 truncate text-xs text-ink-2">
                  {isRecipient
                    ? `${request.requester?.fullName ?? 'A teammate'} asked about ${
                        request.conflictEventId === event.id ? 'this event' : 'their event'
                      }`
                    : `${request.recipient?.fullName ?? 'A teammate'} was asked about a conflict`}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.05em] text-ink-3">
                  {isRecipient ? 'Incoming' : 'Outgoing'}
                </span>
              </div>

              {proposed ? (
                <p className="mt-2 font-mono text-[11px] text-info">
                  Proposed: {proposed}
                </p>
              ) : null}

              {request.message ? (
                <p className="mt-2 text-xs leading-5 text-ink-2">{request.message}</p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {isRecipient &&
                onConflictSide &&
                request.status === 'pending' ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      leadingIcon={<Check size={13} aria-hidden />}
                      onClick={() =>
                        respond.mutate({ requestId: request.id, action: 'accept' })
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      leadingIcon={<X size={13} aria-hidden />}
                      onClick={() =>
                        respond.mutate({ requestId: request.id, action: 'decline' })
                      }
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      leadingIcon={<ArrowClockwise size={13} aria-hidden />}
                      onClick={() => openCounter(request)}
                    >
                      Counter
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onEdit}>
                      Move my event
                    </Button>
                  </>
                ) : null}

                {isRequester &&
                onRequestingSide &&
                request.status === 'countered' ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        respond.mutate({
                          requestId: request.id,
                          action: 'accept_counter',
                        })
                      }
                    >
                      Accept new time
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        respond.mutate({
                          requestId: request.id,
                          action: 'decline_counter',
                        })
                      }
                    >
                      Decline
                    </Button>
                  </>
                ) : null}

                {isRequester &&
                onRequestingSide &&
                request.status === 'pending' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      respond.mutate({ requestId: request.id, action: 'withdraw' })
                    }
                  >
                    Withdraw request
                  </Button>
                ) : null}
              </div>

              {otherPerson ? (
                <p className="mt-2 text-[10px] text-ink-3">
                  {isRecipient ? 'Requested by' : 'Waiting on'} {otherPerson.fullName}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      <Dialog
        open={Boolean(counterRequest)}
        onOpenChange={(open) => {
          if (!open) setCounterRequest(null)
        }}
        title="Propose another time"
        description="Offer a time that works for the requesting event. The requester can accept or decline."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCounterRequest(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={respond.isPending}
              onClick={submitCounter}
            >
              Send proposal
            </Button>
          </div>
        }
      >
        <DateTimeFields
          allDay={false}
          startValue={counterStart}
          endValue={counterEnd}
          timeZone={timeZone}
          clock24h={clock24h}
          weekStartsOn={weekStartsOn}
          onChange={(field, value) => {
            if (field === 'startValue') {
              setCounterStart(value)
              setCounterEnd(adjustEndAfterStart(counterStart, value, counterEnd, false))
            } else {
              setCounterEnd(value)
            }
          }}
        />
      </Dialog>
    </section>
  )
}
