const tokens = [
  ['Canvas', 'bg-canvas'],
  ['Surface', 'bg-surface'],
  ['Ink', 'bg-ink'],
  ['Accent', 'bg-accent'],
  ['Sage', 'bg-cat-milestone-bg'],
  ['Sky', 'bg-cat-meeting-bg'],
  ['Amber', 'bg-cat-leave-bg'],
  ['Rose', 'bg-cat-deadline-bg'],
] as const

export default function App() {
  return (
    <main className="min-h-[100dvh] bg-canvas px-6 py-16 text-ink">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <img src="/microaxis-mark.svg" alt="" className="size-8" />
          <div>
            <p className="font-serif text-3xl leading-none tracking-tight">MicroAxis Calendar</p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
              The working ledger
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-4">
          {tokens.map(([label, className]) => (
            <div key={label} className="bg-surface p-4">
              <div className={`h-12 rounded-control border border-line ${className}`} />
              <p className="mt-3 text-sm text-ink-2">{label}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-lg text-ink-2">
          Scaffold is ready. The calendar, workspace, and collaboration surfaces are built next.
        </p>
      </div>
    </main>
  )
}
