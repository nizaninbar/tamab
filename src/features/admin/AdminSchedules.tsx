import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { WeekPicker } from '../../components/ui/WeekPicker'
import { addWeeks, currentWeek } from '../../lib/week'
import { DAYS, fetchAllSchedules } from '../schedule/api'
import { fetchTeachers } from './api'
import { ErrorNote, Loading } from './ui'

/** Combined view: one card per day listing every teacher's slots in time order. */
export function AdminSchedules() {
  const [week, setWeek] = useState(addWeeks(currentWeek(), 1))
  const schedules = useQuery({ queryKey: ['all-schedules', week], queryFn: () => fetchAllSchedules(week) })
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: fetchTeachers })

  const rows = (schedules.data ?? []).flatMap((s) =>
    s.schedule_slots.map((sl) => ({ ...sl, who: `${s.profiles?.avatar_emoji ?? ''} ${s.profiles?.full_name ?? ''}` })),
  )
  const submitted = new Set((schedules.data ?? []).map((s) => s.teacher_id))
  const missing = (teachers.data ?? []).filter((t) => !submitted.has(t.id))

  return (
    <div className="space-y-4">
      <h1 className="text-center text-xl font-semibold text-blush-700">🗓️ מערכות</h1>
      <WeekPicker week={week} onChange={setWeek} />
      {schedules.error && <ErrorNote error={schedules.error} />}
      {schedules.isPending && <Loading />}
      {schedules.data && (
        <>
          {missing.length > 0 && (
            <Card className="bg-peach-100 text-sm">עוד לא שלחו: {missing.map((t) => t.full_name).join(', ')}</Card>
          )}
          {DAYS.map((d, day) => {
            const items = rows.filter((r) => r.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
            if (!items.length) return null
            return (
              <Card key={day}>
                <h2 className="font-semibold text-lilac-700">יום {d}</h2>
                <ul className="mt-2 space-y-1 text-sm">
                  {items.map((s, i) => (
                    <li key={i} className="rounded-xl bg-lilac-100 px-3 py-2">
                      <div className="flex justify-between">
                        <b>{s.who}</b>
                        <span dir="ltr">{s.start_time}–{s.end_time}</span>
                      </div>
                      <div className="text-ink-soft">{s.note}</div>
                    </li>
                  ))}
                </ul>
              </Card>
            )
          })}
          {rows.length === 0 && <Card className="text-center text-sm text-ink-soft">אין מערכות לשבוע הזה.</Card>}
        </>
      )}
    </div>
  )
}
