import { CalendarBlank, ListBullets, SquaresFour } from '@phosphor-icons/react'
import { SegmentedControl } from '../ui/SegmentedControl'

export type CalendarView = 'week' | 'month' | 'agenda'

export function ViewSwitcher({
  value,
  onChange,
  size = 'md',
}: {
  value: CalendarView
  onChange: (view: CalendarView) => void
  size?: 'sm' | 'md'
}) {
  return (
    <SegmentedControl
      ariaLabel="Calendar view"
      value={value}
      onChange={onChange}
      size={size}
      options={[
        {
          value: 'week',
          label: 'Week',
          icon: <CalendarBlank size={13} aria-hidden />,
        },
        {
          value: 'month',
          label: 'Month',
          icon: <SquaresFour size={13} aria-hidden />,
        },
        {
          value: 'agenda',
          label: 'Agenda',
          icon: <ListBullets size={13} aria-hidden />,
        },
      ]}
    />
  )
}
