import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { addWeeks, currentWeek, weekLabel } from '../../lib/week'
import { useAuth } from '../auth/AuthProvider'
import { DAYS, fetchAllSchedules, fetchMySchedule, saveSchedule, type Slot } from './api'

type Row = Slot & { key: string }
type Tab = 'mine' | 'all'

const newKey = () => crypto.randomUUID()
const toRows = (slots: Slot[]): Row[] => slots.map((s) => ({ ...s, key: newKey() }))
const field = 'min-h-12 rounded-2xl border border-lilac-200 bg-white px-3 text-base outline-none focus:border-blush-300'

/** The schedule form is for next week. */
export const scheduleWeek = () => addWeeks(currentWeek(), 1)

export function SchedulePage() {
  const [tab, setTab] = useState<Tab>('mine')
  const week = scheduleWeek()

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-blush-700">🗓️ מערכת שבועית</h1>
        <p className="text-sm text-ink-soft">השבוע הבא: {weekLabel(week)}</p>
      </div>

      <div className="flex gap-2 rounded-3xl bg-white p-1 shadow-soft">
        {([['mine', 'שלי'], ['all', 'כל המורות']] as const).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-12 flex-1 rounded-3xl font-medium ${tab === t ? 'bg-blush-500 text-white' : 'text-ink-soft'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'mine' ? <MySchedule week={week} /> : <AllSchedules week={week} />}
    </div>
  )
}

function MySchedule({ week }: { week: string }) {
  const { profile } = useAuth()
  const teacherId = profile!.id
  const mine = useQuery({ queryKey: ['my-schedule', teacherId, week], queryFn: () => fetchMySchedule(teacherId, week) })

  if (mine.isPending) return <div className="py-16 text-center text-4xl">🌸</div>
  if (mine.isError) return <Card className="text-center">שגיאה בטעינה. נסי לרענן.</Card>
  return <ScheduleForm initial={mine.data} teacherId={teacherId} week={week} />
}

function ScheduleForm({ initial, teacherId, week }: { initial: Slot[] | null; teacherId: string; week: string }) {
  const qc = useQueryClient()
  const [rows, setRows] = useState<Row[]>(() => toRows(initial ?? []))
  const [saved, setSaved] = useState(initial !== null)
  const [everSaved, setEverSaved] = useState(initial !== null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')

  const change = (next: Row[]) => {
    setRows(next)
    setSaved(false)
  }
  const patch = (key: string, p: Partial<Slot>) => change(rows.map((r) => (r.key === key ? { ...r, ...p } : r)))

  const rowOk = (r: Row) => r.start_time && r.end_time && r.end_time > r.start_time && r.note.trim()
  const valid = rows.every(rowOk)

  const copyLast = async () => {
    setCopyMsg('')
    try {
      const prev = await fetchMySchedule(teacherId, addWeeks(week, -1))
      if (!prev?.length) {
        setCopyMsg('אין מערכת בשבוע הנוכחי להעתקה.')
        return
      }
      change([...rows, ...toRows(prev)])
    } catch {
      setCopyMsg('ההעתקה נכשלה, נסי שוב.')
    }
  }

  const submit = async () => {
    if (!valid) {
      setShowErrors(true)
      return
    }
    setBusy(true)
    setError(false)
    try {
      const slots = await saveSchedule(teacherId, week, rows)
      qc.setQueryData(['my-schedule', teacherId, week], slots)
      qc.invalidateQueries({ queryKey: ['all-schedules', week] })
      qc.invalidateQueries({ queryKey: ['my-schedule-exists'] })
      setSaved(true)
      setEverSaved(true)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <Card className="text-center text-sm text-ink-soft">עוד לא הוספת זמנים. אפשר להוסיף או להעתיק מהשבוע הנוכחי.</Card>
      )}
      {rows.map((r) => (
        <Card key={r.key} className="space-y-2">
          <div className="flex gap-2">
            <select
              value={r.day}
              onChange={(e) => patch(r.key, { day: Number(e.target.value) })}
              className={`${field} flex-1`}
            >
              {DAYS.map((d, i) => (
                <option key={i} value={i}>יום {d}</option>
              ))}
            </select>
            <button
              type="button"
              aria-label="הסרה"
              onClick={() => change(rows.filter((x) => x.key !== r.key))}
              className="min-h-12 min-w-12 rounded-2xl bg-blush-100 text-lg"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={r.start_time}
              onChange={(e) => patch(r.key, { start_time: e.target.value })}
              className={`${field} flex-1`}
              aria-label="התחלה"
            />
            <span>–</span>
            <input
              type="time"
              value={r.end_time}
              onChange={(e) => patch(r.key, { end_time: e.target.value })}
              className={`${field} flex-1`}
              aria-label="סיום"
            />
          </div>
          <input
            type="text"
            placeholder="למה / מה בזמן הזה?"
            value={r.note}
            onChange={(e) => patch(r.key, { note: e.target.value })}
            className={`${field} w-full`}
          />
          {showErrors && !rowOk(r) && (
            <p className="text-sm text-blush-700">יש למלא שעות (סיום אחרי התחלה) והערה</p>
          )}
        </Card>
      ))}

      <button
        type="button"
        onClick={() => change([...rows, { key: newKey(), day: 0, start_time: '16:00', end_time: '17:00', note: '' }])}
        className="min-h-12 w-full rounded-2xl bg-blush-100 font-medium text-blush-700"
      >
        ＋ הוספת זמן
      </button>
      <button
        type="button"
        onClick={copyLast}
        className="min-h-12 w-full rounded-2xl bg-lilac-100 font-medium text-lilac-600"
      >
        📋 העתקה מהשבוע הנוכחי
      </button>
      {copyMsg && <p className="text-center text-sm text-ink-soft">{copyMsg}</p>}

      <p className="text-center text-xs text-ink-soft">
        {busy && 'שומרת…'}
        {!busy && error && 'השמירה נכשלה, נסי שוב'}
        {!busy && !error && saved && 'המערכת נשמרה ✓'}
        {!busy && !error && !saved && 'יש שינויים שלא נשמרו'}
      </p>
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="min-h-14 w-full rounded-3xl bg-blush-500 text-lg font-semibold text-white shadow-soft disabled:opacity-60"
      >
        {everSaved ? 'עדכון המערכת 💌' : 'שמירת המערכת 💌'}
      </button>
    </div>
  )
}

function AllSchedules({ week }: { week: string }) {
  const all = useQuery({ queryKey: ['all-schedules', week], queryFn: () => fetchAllSchedules(week) })

  if (all.isPending) return <div className="py-16 text-center text-4xl">🌸</div>
  if (all.isError) return <Card className="text-center">שגיאה בטעינה. נסי לרענן.</Card>
  if (all.data.length === 0) return <Card className="text-center text-sm text-ink-soft">עדיין אף מורה לא הגישה מערכת.</Card>

  return (
    <>
      {DAYS.map((name, day) => {
        const items = all.data.flatMap((t) =>
          t.schedule_slots.filter((s) => s.day === day).map((s) => ({ t, s })),
        )
        if (!items.length) return null
        items.sort((a, b) => a.s.start_time.localeCompare(b.s.start_time))
        return (
          <Card key={day}>
            <div className="font-semibold text-blush-700">יום {name}</div>
            <ul className="mt-2 space-y-2">
              {items.map(({ t, s }, i) => (
                <li key={i} className="rounded-2xl bg-lilac-100 px-3 py-2 text-sm">
                  <div className="font-medium">
                    {t.profiles?.avatar_emoji} {t.profiles?.full_name}
                    <span className="ms-2 text-ink-soft" dir="ltr">{s.start_time}–{s.end_time}</span>
                  </div>
                  <div>{s.note}</div>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </>
  )
}
