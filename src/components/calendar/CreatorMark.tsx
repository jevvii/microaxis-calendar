import { Avatar } from '../ui/Avatar'

export function CreatorMark({
  name,
  avatarUrl,
  size = 'xs',
  showName = false,
}: {
  name: string
  avatarUrl?: string | null
  size?: 'xs' | 'sm'
  showName?: boolean
}) {
  return (
    <span
      role="img"
      className="inline-flex min-w-0 items-center gap-1.5"
      aria-label={`Created by ${name}`}
      title={`Created by ${name}`}
    >
      <Avatar name={name} src={avatarUrl} size={size} decorative />
      {showName ? <span className="truncate text-[10px] text-ink-3">{name}</span> : null}
    </span>
  )
}
