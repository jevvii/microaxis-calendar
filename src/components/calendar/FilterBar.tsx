import { FunnelSimple, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useState } from 'react'
import type {
  Calendar,
  EventCategory,
  EventPriority,
  EventStatus,
  Team,
  WorkspaceMembership,
} from '../../types/domain'
import { Button } from '../ui/Button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover'

export type FilterState = {
  calendarIds: string[]
  teamIds: string[]
  categoryIds: string[]
  priorities: EventPriority[]
  creatorIds: string[]
  statuses: EventStatus[]
  query: string
}

export const emptyFilters: FilterState = {
  calendarIds: [],
  teamIds: [],
  categoryIds: [],
  priorities: [],
  creatorIds: [],
  statuses: [],
  query: '',
}

const priorities: Array<{ value: EventPriority; label: string }> = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]

const statuses: Array<{ value: EventStatus; label: string }> = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'tentative', label: 'Tentative' },
  { value: 'cancelled', label: 'Cancelled' },
]

function countActive(filters: FilterState) {
  return (
    filters.calendarIds.length +
    filters.teamIds.length +
    filters.categoryIds.length +
    filters.priorities.length +
    filters.creatorIds.length +
    filters.statuses.length +
    (filters.query ? 1 : 0)
  )
}

function toggle<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function CheckRow({
  label,
  checked,
  onChange,
  color,
}: {
  label: string
  checked: boolean
  onChange: () => void
  color?: string
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-control px-2 text-[12px] text-ink-2 hover:bg-surface-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-3.5 accent-[var(--accent)]"
      />
      {color ? (
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      ) : null}
      <span>{label}</span>
    </label>
  )
}

export function FilterBar({
  filters,
  onChange,
  categories,
  members,
  calendars,
  teams = [],
}: {
  filters: FilterState
  onChange: (filters: FilterState) => void
  categories: EventCategory[]
  members: WorkspaceMembership[]
  calendars: Calendar[]
  teams?: Team[]
}) {
  const [open, setOpen] = useState(false)
  const activeCount = countActive(filters)

  return (
    <div className="border-b border-line bg-canvas px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <MagnifyingGlass
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Search events"
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            placeholder="Search events"
            className="h-9 w-full rounded-control border border-line bg-surface pl-8 pr-3 text-[12px] text-ink placeholder:text-ink-3/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={activeCount > 0 ? 'secondary' : 'ghost'}
              size="sm"
              leadingIcon={<FunnelSimple size={14} aria-hidden />}
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3">
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Filter calendar
              </p>
              {activeCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onChange(emptyFilters)}
                  className="inline-flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink"
                >
                  <X size={11} aria-hidden />
                  Clear
                </button>
              ) : null}
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              <p className="px-2 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
                Priority
              </p>
              {priorities.map((priority) => (
                <CheckRow
                  key={priority.value}
                  label={priority.label}
                  checked={filters.priorities.includes(priority.value)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      priorities: toggle(filters.priorities, priority.value),
                    })
                  }
                />
              ))}

              <p className="px-2 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
                Status
              </p>
              {statuses.map((status) => (
                <CheckRow
                  key={status.value}
                  label={status.label}
                  checked={filters.statuses.includes(status.value)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      statuses: toggle(filters.statuses, status.value),
                    })
                  }
                />
              ))}

              {calendars.length > 0 ? (
                <>
                  <p className="px-2 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
                    Calendars
                  </p>
                  {calendars.map((calendar) => (
                    <CheckRow
                      key={calendar.id}
                      label={calendar.name}
                      color={calendar.color}
                      checked={filters.calendarIds.includes(calendar.id)}
                      onChange={() =>
                        onChange({
                          ...filters,
                          calendarIds: toggle(filters.calendarIds, calendar.id),
                        })
                      }
                    />
                  ))}
                </>
              ) : null}

              {teams.length > 0 ? (
                <>
                  <p className="px-2 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
                    Teams
                  </p>
                  {teams.map((team) => (
                    <CheckRow
                      key={team.id}
                      label={team.name}
                      color={team.color}
                      checked={filters.teamIds.includes(team.id)}
                      onChange={() =>
                        onChange({
                          ...filters,
                          teamIds: toggle(filters.teamIds, team.id),
                        })
                      }
                    />
                  ))}
                </>
              ) : null}

              {categories.length > 0 ? (
                <>
                  <p className="px-2 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
                    Categories
                  </p>
                  {categories.map((category) => (
                    <CheckRow
                      key={category.id}
                      label={category.name}
                      color={category.color}
                      checked={filters.categoryIds.includes(category.id)}
                      onChange={() =>
                        onChange({
                          ...filters,
                          categoryIds: toggle(filters.categoryIds, category.id),
                        })
                      }
                    />
                  ))}
                </>
              ) : null}

              {members.length > 0 ? (
                <>
                  <p className="px-2 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
                    Created by
                  </p>
                  {members.map((member) => (
                    <CheckRow
                      key={member.userId}
                      label={member.profile?.fullName ?? 'Member'}
                      checked={filters.creatorIds.includes(member.userId)}
                      onChange={() =>
                        onChange({
                          ...filters,
                          creatorIds: toggle(filters.creatorIds, member.userId),
                        })
                      }
                    />
                  ))}
                </>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>

        {filters.query ? (
          <span className="font-mono text-[10px] text-ink-3">
            Searching “{filters.query}”
          </span>
        ) : null}
      </div>
    </div>
  )
}
