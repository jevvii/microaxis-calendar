import { cn } from '../../lib/cn'

type AvatarProps = {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  decorative?: boolean
}

const sizeClasses = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-[11px]',
  lg: 'size-10 text-xs',
}

const palette = [
  'bg-cat-meeting-bg text-cat-meeting',
  'bg-cat-milestone-bg text-cat-milestone',
  'bg-cat-leave-bg text-cat-leave',
  'bg-cat-deadline-bg text-cat-deadline',
  'bg-cat-focus-bg text-cat-focus',
]

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function paletteIndex(name: string) {
  return [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % palette.length
}

export function Avatar({ name, src, size = 'md', className, decorative = false }: AvatarProps) {
  const base = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line font-mono font-medium tracking-[0.02em]',
    sizeClasses[size],
    !src && palette[paletteIndex(name)],
    className,
  )

  if (src) {
    return (
      <span className={base} title={name}>
        <img
          src={src}
          alt={decorative ? '' : name}
          className="size-full object-cover"
          loading="lazy"
        />
      </span>
    )
  }

  return (
    <span
      className={base}
      title={name}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
    >
      {initials(name)}
    </span>
  )
}
