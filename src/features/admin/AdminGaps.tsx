import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { weekLabel } from '../../lib/week'
import { fetchGaps, type GapRow } from './api'
import { ErrorNote, GroupSelect, Loading } from './ui'

export function AdminGaps() {
  const [groupId, setGroupId] = useState('')
  const gaps = useQuery({ queryKey: ['admin-gaps'], queryFn: fetchGaps })

  const byStudent = new Map<string, { name: string; rows: GapRow[] }>()
  for (const g of gaps.data ?? []) {
    if (!g.students || (groupId && g.students.group_id !== groupId)) continue
    const e = byStudent.get(g.students.id) ?? { name: g.students.full_name, rows: [] }
    e.rows.push(g)
    byStudent.set(g.students.id, e)
  }
  const list = [...byStudent.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, 'he'))
  const week = (g: GapRow) => g.weekly_reports?.week_start ?? ''
  for (const [, s] of list) s.rows.sort((a, b) => week(b).localeCompare(week(a)))

  return (
    <div className="space-y-4">
      <h1 className="text-center text-xl font-semibold text-blush-700">🧩 פערים</h1>
      <GroupSelect value={groupId} onChange={setGroupId} allLabel="כל הקבוצות" />
      {gaps.error && <ErrorNote error={gaps.error} />}
      {gaps.isPending && <Loading />}
      {gaps.data && list.length === 0 && <Card className="text-center text-sm text-ink-soft">אין פערים שדווחו.</Card>}
      {list.map(([id, s]) => (
        <Card key={id}>
          <div className="font-medium">🎓 {s.name} <span className="text-xs text-ink-soft">({s.rows.length})</span></div>
          <ul className="mt-2 space-y-1 text-sm">
            {s.rows.map((g) => (
              <li key={g.id} className="rounded-xl bg-lilac-100 px-3 py-2">
                <div className="text-xs text-ink-soft">
                  {g.weekly_reports && weekLabel(g.weekly_reports.week_start)} · {g.weekly_reports?.profiles?.full_name}
                </div>
                {g.description}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}
