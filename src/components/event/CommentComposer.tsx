import { PaperPlaneTilt } from '@phosphor-icons/react'
import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { WorkspaceMembership } from '../../types/domain'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'

export function CommentComposer({
  members,
  onSubmit,
  submitting = false,
  disabled = false,
}: {
  members: WorkspaceMembership[]
  onSubmit: (body: string) => void
  submitting?: boolean
  disabled?: boolean
}) {
  const [value, setValue] = useState('')

  const suggestions = useMemo(() => {
    const match = value.match(/(^|\s)@([A-Za-z ]{0,30})$/)
    if (!match) return []
    const query = match[2].toLowerCase()
    return members
      .map((member) => member.profile?.fullName)
      .filter((name): name is string => Boolean(name))
      .filter((name) => name.toLowerCase().includes(query))
      .slice(0, 4)
  }, [members, value])

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const body = value.trim()
    if (!body) return
    onSubmit(body)
    setValue('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  function mention(name: string) {
    setValue((current) => current.replace(/(^|\s)@[A-Za-z ]{0,30}$/, `$1@${name} `))
  }

  return (
    <form className="grid gap-2" onSubmit={submit}>
      <Textarea
        aria-label="Add a comment"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder="Add context or @mention a teammate."
        rows={3}
      />
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => mention(name)}
              className="rounded-full border border-line bg-surface px-2 py-1 text-[10px] text-ink-2 hover:border-line-strong hover:text-ink"
            >
              @{name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.05em] text-ink-3">
          Cmd + Enter to post
        </p>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          loading={submitting}
          disabled={disabled || !value.trim()}
          leadingIcon={<PaperPlaneTilt size={13} aria-hidden />}
        >
          Comment
        </Button>
      </div>
    </form>
  )
}
