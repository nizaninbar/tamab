import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { moodEmoji } from '../../components/ui/EmojiScale'
import { WeekPicker } from '../../components/ui/WeekPicker'
import { addWeeks, currentWeek } from '../../lib/week'
import { fetchAllSchedules } from '../schedule/api'
import { fetchTeachers, fetchWeekReports } from './api'
import { ErrorNote, Loading, useGroups } from './ui'

export function AdminDashboard() {
  const [week, setWeek] = useState(currentWeek())
  const { name: groupName } = useGroups()
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: fetchTeachers })
  const reports = useQuery({ queryKey: ['admin-reports', week], queryFn: () => fetchWeekReports(week) })
  const schedules = useQuery({
    queryKey: ['all-schedules', addWeeks(week, 1)],
    queryFn: () => fetchAllSchedules(addWeeks(week, 1)),
  })

  const error = teachers.error ?? reports.error ?? schedules.error
  const byTeacher = new Map((reports.data ?? []).map((r) => [r.teacher_id, r]))
  const hasSchedule = new Set((schedules.data ?? []).map((s) => s.teacher_id))
  const moods = (reports.data ?? []).filter((r) => r.submitted_at && r.mood).map((r) => r.mood!)
  const avg = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null
  const submitted = (teachers.data ?? []).filter((t) => byTeacher.get(t.id)?.submitted_at).length

  return (
    <div className="space-y-4">
      <h1 className="text-center text-xl font-semibold text-blush-700">📊 דשבורד</h1>
      <WeekPicker week={week} onChange={setWeek} />
      {error && <ErrorNote error={error} />}
      {(teachers.isPending || reports.isPending) && !error && <Loading />}

      {teachers.data && reports.data && (
        <>
          <div className="flex gap-3">
            <Card className="flex-1 bg-lilac-100 text-center">
              <div className="text-3xl">📝</div>
              <div className="font-medium">{submitted}/{teachers.data.length}</div>
              <div className="text-sm text-ink-soft">דוחות נשלחו</div>
            </Card>
            <Card className="flex-1 bg-peach-100 text-center">
              <div className="text-3xl">{moodEmoji(avg ? Math.round(avg) : null)}</div>
              <div className="font-medium">{avg ? avg.toFixed(1) : '—'}</div>
              <div className="text-sm text-ink-soft">מצב רוח ממוצע</div>
            </Card>
          </div>

          {teachers.data.length === 0 && (
            <Card className="text-center text-sm text-ink-soft">עדיין אין מורות. אפשר להוסיף במסך ניהול.</Card>
          )}
          {teachers.data.map((t) => {
            const r = byTeacher.get(t.id)
            const state = r?.submitted_at ? 'נשלח ✓' : r ? 'טיוטה ✏️' : 'לא התחילה ✗'
            const pill = (ok: boolean) =>
              `rounded-xl px-3 py-1 ${ok ? 'bg-lilac-100 text-lilac-700' : 'bg-peach-100 text-blush-700'}`
            return (
              <Card key={t.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.avatar_emoji} {t.full_name}</div>
                    <div className="text-xs text-ink-soft">{groupName(t.group_id)}</div>
                  </div>
                  <div className="text-4xl">{moodEmoji(r?.submitted_at ? r.mood : null)}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className={pill(!!r?.submitted_at)}>דוח: {state}</span>
                  <span className={pill(hasSchedule.has(t.id))}>מערכת הבאה: {hasSchedule.has(t.id) ? '✓' : '✗'}</span>
                </div>
              </Card>
            )
          })}
        </>
      )}
    </div>
  )
}
