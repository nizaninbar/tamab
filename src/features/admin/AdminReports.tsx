import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { moodEmoji } from '../../components/ui/EmojiScale'
import { WeekPicker } from '../../components/ui/WeekPicker'
import { currentWeek } from '../../lib/week'
import { fetchAllStudents, fetchTeachers, fetchWeekReports } from './api'
import { ErrorNote, GroupSelect, inputCls, Loading, ReportDetail } from './ui'

export function AdminReports() {
  const [week, setWeek] = useState(currentWeek())
  const [groupId, setGroupId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const teachers = useQuery({ queryKey: ['teachers'], queryFn: fetchTeachers })
  const reports = useQuery({ queryKey: ['admin-reports', week], queryFn: () => fetchWeekReports(week) })
  const students = useQuery({ queryKey: ['admin-students'], queryFn: fetchAllStudents })

  const shown = (reports.data ?? [])
    .filter((r) => r.submitted_at)
    .filter((r) => !groupId || r.profiles?.group_id === groupId)
    .filter((r) => !teacherId || r.teacher_id === teacherId)
    .sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''))

  return (
    <div className="space-y-4">
      <h1 className="text-center text-xl font-semibold text-blush-700">📝 דוחות</h1>
      <WeekPicker week={week} onChange={setWeek} />
      <div className="flex gap-2">
        <div className="flex-1"><GroupSelect value={groupId} onChange={setGroupId} allLabel="כל הקבוצות" /></div>
        <select className={`${inputCls} flex-1`} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="">כל המורות</option>
          {teachers.data?.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
      </div>

      {reports.error && <ErrorNote error={reports.error} />}
      {reports.isPending && <Loading />}
      {reports.data && shown.length === 0 && (
        <Card className="text-center text-sm text-ink-soft">אין דוחות שנשלחו לשבוע הזה.</Card>
      )}
      {shown.map((r) => (
        <Card key={r.id}>
          <button className="flex w-full items-center justify-between text-start" onClick={() => setOpen(open === r.id ? null : r.id)}>
            <span className="font-medium">
              {r.profiles?.avatar_emoji} {r.profiles?.full_name} {r.is_private && '🔒'}
            </span>
            <span className="text-3xl">{moodEmoji(r.mood)}</span>
          </button>
          {open === r.id && (
            <div className="mt-3 border-t border-lilac-100 pt-3">
              <ReportDetail r={r} students={students.data ?? []} />
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
