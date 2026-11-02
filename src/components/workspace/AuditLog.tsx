import { MagnifyingGlass } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import type { WorkspaceAuditEntry } from '../../types/domain'
import { CreatorMark } from '../calendar/CreatorMark'
import { Input } from '../ui/Input'

const actionLabels: Record<string, string> = {
  insert: 'added',
  update: 'updated',
  delete: 'removed',
}

export function AuditLog({
  entries,
  loading = false,
}: {
  entries: WorkspaceAuditEntry[]
  loading?: boolean
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter((entry) =>
      [entry.actor?.fullName, entry.action, entry.targetType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [entries, query])

  if (loading) {
    return <p className="py-6 text-sm text-ink-3">Loading audit log…</p>
  }

  return (
    <div>
      <div className="relative max-w-xs">
        <MagnifyingGlass
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
          aria-hidden
        />
        <Input
          aria-label="Filter audit log"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by person or action"
          className="h-9 pl-8 text-[12px]"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-sm text-ink-3">No audit entries match.</p>
      ) : (
        <div className="mt-4 divide-y divide-line border-y border-line">
          {filtered.map((entry) => {
            const actorName = entry.actor?.fullName ?? 'System'
            return (
              <div key={entry.id} className="flex flex-wrap items-start gap-3 py-3">
                <CreatorMark name={actorName} avatarUrl={entry.actor?.avatarUrl} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] leading-5 text-ink-2">
                    <span className="font-medium text-ink">{actorName}</span>{' '}
                    {actionLabels[entry.action] ?? entry.action} a{' '}
                    {entry.targetType.replaceAll('_', ' ')}
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-ink-3">
                    {format(new Date(entry.createdAt), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
