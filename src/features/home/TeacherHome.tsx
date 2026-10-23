import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { moodEmoji } from '../../components/ui/EmojiScale'
import { addWeeks, currentWeek, weekLabel } from '../../lib/week'
import { useAuth } from '../auth/AuthProvider'
import { fetchFeed, fetchMyReport, fetchMyScheduleExists, fetchStudents } from '../reports/api'

function StatusCard({ to, emoji, title, done }: { to: string; emoji: string; title: string; done: boolean }) {
  return (
    <Link to={to} className="block flex-1">
      <Card className={`h-full text-center ${done ? 'bg-lilac-100' : 'bg-peach-100'}`}>
        <div className="text-3xl">{emoji}</div>
        <div className="mt-1 font-medium">{title}</div>
        <div className={`text-sm ${done ? 'text-lilac-600' : 'text-blush-700'}`}>{done ? 'נשלח ✓' : 'עוד לא ✗'}</div>
      </Card>
    </Link>
  )
}

export function TeacherHome() {
  const { profile } = useAuth()
  const id = profile!.id
  const groupId = profile!.group_id
  const week = currentWeek()
  const nextWeek = addWeeks(week, 1)

  const report = useQuery({ queryKey: ['my-report', id, week], queryFn: () => fetchMyReport(id, week) })
  const schedule = useQuery({ queryKey: ['my-schedule-exists', id, nextWeek], queryFn: () => fetchMyScheduleExists(id, nextWeek) })
  const feed = useQuery({ queryKey: ['feed', id, week], queryFn: () => fetchFeed(week, id) })
  const students = useQuery({
    queryKey: ['students', groupId],
    queryFn: () => fetchStudents(groupId!),
    enabled: !!groupId,
  })
  const names = new Map((students.data ?? []).map((s) => [s.id, s.full_name]))

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-blush-700">
          {profile!.avatar_emoji} שלום {profile!.full_name}
        </h1>
        <p className="text-sm text-ink-soft">השבוע: {weekLabel(week)}</p>
      </div>

      <div className="flex gap-3">
        <StatusCard to="/report" emoji="📝" title="דוח שבועי" done={!!report.data?.submitted_at} />
        <StatusCard to="/schedule" emoji="🗓️" title="מערכת לשבוע הבא" done={!!schedule.data} />
      </div>

      <h2 className="px-1 font-semibold">💬 מהקבוצה</h2>
      {feed.isPending && <div className="py-6 text-center text-3xl">🌸</div>}
      {feed.data?.length === 0 && (
        <Card className="text-center text-sm text-ink-soft">עדיין אין דוחות ציבוריים השבוע.</Card>
      )}
      {feed.data?.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center justify-between">
            <div className="font-medium">
              {r.profiles?.avatar_emoji} {r.profiles?.full_name}
            </div>
            <div className="text-3xl">{moodEmoji(r.mood)}</div>
          </div>
          {r.taught && <p className="mt-2 whitespace-pre-wrap text-sm">📚 {r.taught}</p>}
          {r.report_gaps.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {r.report_gaps.map((g, i) => (
                <li key={i} className="rounded-xl bg-lilac-100 px-3 py-2">
                  <b>{names.get(g.student_id) ?? 'תלמידה'}:</b> {g.description}
                </li>
              ))}
            </ul>
          )}
          {r.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">💭 {r.notes}</p>}
        </Card>
      ))}
    </div>
  )
}
