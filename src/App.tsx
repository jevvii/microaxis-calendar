import {
  Bell,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Moon,
  Plus,
  Sun,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { MobileNav } from './components/layout/MobileNav'
import { Sidebar, type SidebarCalendar, type SidebarTeam } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { Avatar } from './components/ui/Avatar'
import { Badge } from './components/ui/Badge'
import { Button } from './components/ui/Button'
import { IconButton } from './components/ui/IconButton'
import { SegmentedControl } from './components/ui/SegmentedControl'
import { ThemeProvider } from './providers/ThemeProvider'
import { ToastProvider, useToast } from './providers/ToastProvider'
import { useTheme } from './hooks/useTheme'

const calendars: SidebarCalendar[] = [
  { id: 'personal', name: 'Mara’s calendar', color: '#0C7A43', kind: 'personal' },
  { id: 'product', name: 'Product', color: '#2F5D78', kind: 'team' },
  { id: 'delivery', name: 'Client delivery', color: '#8B4039', kind: 'team' },
  { id: 'studio', name: 'Studio', color: '#8A651A', kind: 'workspace' },
]

const teams: SidebarTeam[] = [
  { id: 'product', name: 'Product', memberCount: 4 },
  { id: 'delivery', name: 'Client delivery', memberCount: 5 },
  { id: 'operations', name: 'Operations', memberCount: 3 },
]

const week = [
  { day: 'Mon', date: '2', events: [] },
  {
    day: 'Tue',
    date: '3',
    events: [
      { time: '09:30', title: 'OceanJet release review', color: '#2F5D78', owner: 'Ivo Santos' },
      { time: '14:00', title: 'Milksha sprint planning', color: '#3F5C3A', owner: 'Mara Velasco' },
    ],
  },
  {
    day: 'Wed',
    date: '4',
    events: [{ time: '11:00', title: 'DBM accessibility audit', color: '#8B4039', owner: 'Rin Takahashi' }],
  },
  { day: 'Thu', date: '5', events: [] },
  {
    day: 'Fri',
    date: '6',
    events: [
      { time: '10:00', title: 'Studio review', color: '#8A651A', owner: 'Bea Ocampo' },
      { time: '15:30', title: 'Flying Tigers handoff', color: '#3F5C3A', owner: 'Ivo Santos' },
    ],
  },
  { day: 'Sat', date: '7', events: [] },
  { day: 'Sun', date: '8', events: [] },
]

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  return (
    <IconButton
      label={dark ? 'Use light theme' : 'Use dark theme'}
      size="sm"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
    </IconButton>
  )
}

function ShellPreview() {
  const [view, setView] = useState<'week' | 'month' | 'agenda'>('week')
  const [mobileActive, setMobileActive] = useState<'today' | 'calendar' | 'inbox' | 'more'>('calendar')
  const [activeCalendar, setActiveCalendar] = useState('personal')
  const { toast } = useToast()

  return (
    <AppShell
      sidebar={
        <Sidebar
          workspaceName="MicroAxis Studio"
          userName="Mara Velasco"
          calendars={calendars}
          teams={teams}
          activeCalendarId={activeCalendar}
          unreadCount={3}
          onSelectCalendar={setActiveCalendar}
          onNewEvent={() =>
            toast({
              title: 'Event composer ready',
              description: 'The full editor arrives with the calendar data layer.',
              tone: 'info',
            })
          }
        />
      }
      topbar={
        <Topbar
          left={
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1 sm:flex">
                <IconButton label="Previous week" size="sm">
                  <CaretLeft size={15} weight="bold" aria-hidden />
                </IconButton>
                <IconButton label="Next week" size="sm">
                  <CaretRight size={15} weight="bold" aria-hidden />
                </IconButton>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold tracking-[-0.01em]">
                  November 2–8, 2026
                </p>
                <p className="hidden font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 sm:block">
                  Asia/Manila · Week 45
                </p>
              </div>
            </div>
          }
          center={
            <SegmentedControl
              ariaLabel="Calendar view"
              value={view}
              onChange={setView}
              options={[
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'agenda', label: 'Agenda' },
              ]}
            />
          }
          right={
            <>
              <IconButton label="Search" size="sm">
                <MagnifyingGlass size={15} aria-hidden />
              </IconButton>
              <IconButton label="Notifications" size="sm" className="relative">
                <Bell size={15} aria-hidden />
                <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" />
              </IconButton>
              <ThemeToggle />
              <Avatar name="Mara Velasco" size="sm" />
            </>
          }
        />
      }
      mobileNav={
        <MobileNav
          active={mobileActive}
          unreadCount={3}
          onSelect={setMobileActive}
        />
      }
    >
      <div className="flex h-full min-h-[calc(100dvh-3.5rem)] flex-col">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-4 py-5 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              Week 45 / 2026
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">This week</h1>
            <p className="mt-1 text-sm text-ink-3">
              6 events across 4 calendars. Two need your response.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="accent" dot>
              3 unread
            </Badge>
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Plus size={14} weight="bold" aria-hidden />}
              onClick={() =>
                toast({
                  title: 'New event',
                  description: 'The event editor will open here.',
                  tone: 'success',
                })
              }
            >
              New event
            </Button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-7 border-b border-line">
          {week.map((day, index) => (
            <div
              key={day.date}
              className={`min-h-0 border-r border-line last:border-r-0 ${
                index === 1 ? 'bg-accent-wash/35' : ''
              }`}
            >
              <div className="flex items-baseline justify-between border-b border-line px-2 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                  {day.day}
                </span>
                <span
                  className={`font-mono text-xs ${
                    index === 1 ? 'font-medium text-accent' : 'text-ink-2'
                  }`}
                >
                  {day.date}
                </span>
              </div>
              <div className="grid gap-1.5 p-1.5">
                {day.events.map((event) => (
                  <div
                    key={event.title}
                    className="rounded-[5px] border border-line bg-surface px-2 py-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-3 w-0.5 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                      <span className="font-mono text-[9px] text-ink-3">{event.time}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium leading-4 tracking-[-0.01em] text-ink">
                      {event.title}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Avatar name={event.owner} size="xs" decorative />
                      <span className="truncate text-[9px] text-ink-3">{event.owner}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-[11px] text-ink-3 sm:px-6">
          <CalendarBlank size={13} aria-hidden />
          <span>Calendar canvas scaffold</span>
          <span className="text-line-strong">/</span>
          <span>Dense week grid, month, and agenda views land next.</span>
        </div>
      </div>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <ShellPreview />
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
