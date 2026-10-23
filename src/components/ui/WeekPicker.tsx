import { addWeeks, currentWeek, weekLabel } from '../../lib/week'

export function WeekPicker({ week, onChange }: { week: string; onChange: (w: string) => void }) {
  const btn = 'grid size-12 place-items-center rounded-2xl bg-white text-xl shadow-soft'
  return (
    <div className="flex items-center gap-2">
      <button className={btn} onClick={() => onChange(addWeeks(week, -1))} aria-label="שבוע קודם">→</button>
      <button
        className="min-h-12 flex-1 rounded-2xl bg-white text-center font-medium shadow-soft"
        onClick={() => onChange(currentWeek())}
      >
        {weekLabel(week)}
        {week === currentWeek() && <span className="ms-2 text-xs text-ink-soft">(השבוע)</span>}
      </button>
      <button className={btn} onClick={() => onChange(addWeeks(week, 1))} aria-label="שבוע הבא">←</button>
    </div>
  )
}
