export function TimeSpine() {
  return (
    <div className="relative border-r border-line">
      {Array.from({ length: 24 }, (_, hour) => (
        <div
          key={hour}
          data-testid="week-hour-row"
          className="h-12 border-b border-line pr-2 text-right font-mono text-[9px] text-ink-3"
        >
          <span className="relative -top-1.5">{String(hour).padStart(2, '0')}:00</span>
        </div>
      ))}
    </div>
  )
}
