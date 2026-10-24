import { Card } from '../../components/ui/Card'
import { weekLabel } from '../../lib/week'

export type GapItem = {
  id: string
  studentId: string
  studentName: string
  groupId?: string
  week: string
  teacher: string
  description: string
}

// Gaps grouped per student (by Hebrew name), newest week first.
export function GapsList({ rows, onDelete }: { rows: GapItem[]; onDelete?: (id: string) => void }) {
  const byStudent = new Map<string, { name: string; rows: GapItem[] }>()
  for (const g of rows) {
    const e = byStudent.get(g.studentId) ?? { name: g.studentName, rows: [] }
    e.rows.push(g)
    byStudent.set(g.studentId, e)
  }
  const list = [...byStudent.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, 'he'))
  for (const [, s] of list) s.rows.sort((a, b) => b.week.localeCompare(a.week))

  if (list.length === 0) return <Card className="text-center text-sm text-ink-soft">אין פערים שדווחו.</Card>

  return (
    <>
      {list.map(([id, s]) => (
        <Card key={id}>
          <div className="font-medium">🎓 {s.name} <span className="text-xs text-ink-soft">({s.rows.length})</span></div>
          <ul className="mt-2 space-y-1 text-sm">
            {s.rows.map((g) => (
              <li key={g.id} className="flex items-start gap-2 rounded-xl bg-lilac-100 px-3 py-2">
                <div className="flex-1">
                  <div className="text-xs text-ink-soft">
                    {g.week && weekLabel(g.week)} · {g.teacher}
                  </div>
                  {g.description}
                </div>
                {onDelete && (
                  <button onClick={() => onDelete(g.id)} aria-label="מחיקה" className="min-h-8 px-2 text-ink-soft">✕</button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  )
}
