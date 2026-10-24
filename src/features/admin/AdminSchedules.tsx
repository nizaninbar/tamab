import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { WeekPicker } from '../../components/ui/WeekPicker'
import { addWeeks, currentWeek } from '../../lib/week'
import { byDayStart, coversDay, DAYS, fetchAllSchedules, slotLabel } from '../schedule/api'
import { deleteSchedule, fetchTeachers } from './api'
import { ErrorNote, Loading } from './ui'

/** Combined view: one card per day listing every teacher's slots in time order. */
export function AdminSchedules() {
  const [week, setWeek] = useState(addWeeks(currentWeek(), 1))
  const schedules = useQuery({ queryKey: ['all-schedules', week], queryFn: () => fetchAllSchedules(week) })
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: fetchTeachers })
  const qc = useQueryClient()
  const remove = useMutation({
    mutationFn: (teacherId: string) => deleteSchedule(teacherId, week),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-schedules'] }),
  })

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
      {remove.error && <ErrorNote error={remove.error} />}
      {schedules.data && (
        <>
          {schedules.data.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {schedules.data.map((s) => (
                <span key={s.teacher_id} className="flex items-center gap-1 rounded-full bg-white py-1 ps-3 pe-1 text-sm shadow-soft">
                  {s.profiles?.avatar_emoji} {s.profiles?.full_name}
                  <button
                    className="grid size-8 place-items-center rounded-full"
                    aria-label="מחיקת המערכת"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`למחוק את המערכת של ${s.profiles?.full_name ?? ''} לשבוע הזה? כל המשבצות שלה יימחקו.`)) remove.mutate(s.teacher_id)
                    }}
                  >
                    🗑️
                  </button>
                </span>
              ))}
            </div>
          )}
          {missing.length > 0 && (
            <Card className="bg-peach-100 text-sm">עוד לא שלחו: {missing.map((t) => t.full_name).join(', ')}</Card>
          )}
          {DAYS.map((d, day) => {
            const items = rows.filter((r) => coversDay(r, day)).sort(byDayStart)
            if (!items.length) return null
            return (
              <Card key={day}>
                <h2 className="font-semibold text-lilac-700">יום {d}</h2>
                <ul className="mt-2 space-y-1 text-sm">
                  {items.map((s, i) => (
                    <li key={i} className="rounded-xl bg-lilac-100 px-3 py-2">
                      <div className="flex flex-wrap justify-between gap-x-2">
                        <b>{s.who}</b>
                        <span dir={s.day === s.end_day ? 'ltr' : undefined}>{slotLabel(s)}</span>
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
