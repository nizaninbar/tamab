import { useQuery } from '@tanstack/react-query'
import { moodEmoji } from '../../components/ui/EmojiScale'
import { Card } from '../../components/ui/Card'
import { fetchGroups, type AdminReport, type AdminStudent } from './api'

export const inputCls = 'min-h-12 w-full rounded-2xl border border-lilac-100 bg-white px-4 text-ink'
export const btnCls = 'min-h-12 rounded-2xl bg-blush-500 px-5 font-medium text-white disabled:opacity-50'
export const softBtnCls = 'min-h-12 rounded-2xl bg-lilac-100 px-4 font-medium text-lilac-700 disabled:opacity-50'

export function useGroups() {
  const q = useQuery({ queryKey: ['groups'], queryFn: fetchGroups })
  const name = (id: string | null) => q.data?.find((g) => g.id === id)?.name ?? '—'
  return { groups: q.data ?? [], name }
}

export function GroupSelect({
  value,
  onChange,
  allLabel,
}: {
  value: string
  onChange: (v: string) => void
  allLabel?: string
}) {
  const { groups } = useGroups()
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{allLabel ?? 'ללא קבוצה'}</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>{g.name}</option>
      ))}
    </select>
  )
}

export function Loading() {
  return <div className="py-6 text-center text-3xl">🌸</div>
}

export function ErrorNote({ error }: { error: unknown }) {
  return <Card className="text-center text-sm text-red-600">{error instanceof Error ? error.message : 'שגיאה'}</Card>
}

export function ReportDetail({ r, students }: { r: AdminReport; students: AdminStudent[] }) {
  const names = new Map(students.map((s) => [s.id, s.full_name]))
  return (
    <div className="space-y-2 text-sm">
      {r.taught && <p className="whitespace-pre-wrap">📚 {r.taught}</p>}
      {r.report_gaps.length > 0 && (
        <ul className="space-y-1">
          {r.report_gaps.map((g, i) => (
            <li key={i} className="rounded-xl bg-lilac-100 px-3 py-2">
              <b>{names.get(g.student_id) ?? 'תלמידה'}:</b> {g.description}
            </li>
          ))}
        </ul>
      )}
      {r.notes && <p className="whitespace-pre-wrap text-ink-soft">💭 {r.notes}</p>}
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <span>{moodEmoji(r.mood)} {r.mood ? `${r.mood}/10` : ''}</span>
        <span>{r.is_private ? '🔒 פרטי' : '🌍 ציבורי'}</span>
      </div>
    </div>
  )
}
