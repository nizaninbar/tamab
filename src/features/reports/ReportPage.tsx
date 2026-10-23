import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { EmojiScale } from '../../components/ui/EmojiScale'
import { Switch } from '../../components/ui/Switch'
import { currentWeek, weekLabel } from '../../lib/week'
import { useAuth } from '../auth/AuthProvider'
import { fetchMyReport, fetchStudents, saveReport, type Gap, type Report } from './api'

type Form = { taught: string; mood: number | null; notes: string; is_private: boolean; gaps: (Gap & { key: string })[] }
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const newKey = () => crypto.randomUUID()
const field = 'mt-2 w-full rounded-2xl border border-lilac-200 bg-white p-3 text-base outline-none focus:border-blush-300'

function toForm(r: Report | null): Form {
  return {
    taught: r?.taught ?? '',
    mood: r?.mood ?? null,
    notes: r?.notes ?? '',
    is_private: r?.is_private ?? true,
    gaps: (r?.report_gaps ?? []).map((g) => ({ ...g, key: newKey() })),
  }
}

export function ReportPage() {
  const { profile } = useAuth()
  const teacherId = profile!.id
  const groupId = profile!.group_id
  const week = currentWeek()
  const qc = useQueryClient()

  const report = useQuery({ queryKey: ['my-report', teacherId, week], queryFn: () => fetchMyReport(teacherId, week) })
  const students = useQuery({
    queryKey: ['students', groupId],
    queryFn: () => fetchStudents(groupId!),
    enabled: !!groupId,
  })

  if (report.isPending) return <div className="py-16 text-center text-4xl">🌸</div>
  if (report.isError) return <Card className="text-center">שגיאה בטעינה. נסי לרענן.</Card>

  return (
    <ReportForm
      key={week}
      initial={report.data}
      students={students.data ?? []}
      teacherId={teacherId}
      week={week}
      onSaved={(r) => {
        qc.setQueryData(['my-report', teacherId, week], r)
        qc.invalidateQueries({ queryKey: ['feed'] })
      }}
    />
  )
}

function ReportForm({
  initial,
  students,
  teacherId,
  week,
  onSaved,
}: {
  initial: Report | null
  students: { id: string; full_name: string }[]
  teacherId: string
  week: string
  onSaved: (r: Report) => void
}) {
  const [form, setForm] = useState<Form>(() => toForm(initial))
  const [submitted, setSubmitted] = useState(!!initial?.submitted_at)
  const [state, setState] = useState<SaveState>('idle')
  const [showErrors, setShowErrors] = useState(false)

  // Serialized saves: a new save starts only after the previous one ends.
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const dirty = useRef(false)
  const latest = useRef(form)
  latest.current = form

  const save = (submit = false) => {
    const run = async () => {
      setState('saving')
      try {
        const f = latest.current
        const r = await saveReport(teacherId, week, { ...f, gaps: f.gaps, submit })
        if (submit) setSubmitted(true)
        onSaved(r)
        setState('saved')
        return true
      } catch {
        setState('error')
        return false
      }
    }
    const p = chain.current.then(run)
    chain.current = p
    return p as Promise<boolean>
  }

  // Debounced autosave on edits.
  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(() => save(), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  const update = (patch: Partial<Form>) => {
    dirty.current = true
    setForm((f) => ({ ...f, ...patch }))
  }
  const updateGap = (key: string, patch: Partial<Gap>) =>
    update({ gaps: form.gaps.map((g) => (g.key === key ? { ...g, ...patch } : g)) })

  const gapsValid = form.gaps.every((g) => g.student_id && g.description.trim())
  const valid = form.taught.trim() && form.mood !== null && gapsValid

  const submit = async () => {
    if (!valid) {
      setShowErrors(true)
      return
    }
    dirty.current = false
    await save(true)
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-blush-700">📝 דוח שבועי</h1>
        <p className="text-sm text-ink-soft">{weekLabel(week)}</p>
        <p className="mt-1 text-xs text-ink-soft">
          {state === 'saving' && 'שומרת…'}
          {state === 'saved' && (submitted ? 'הדוח נשלח ✓' : 'טיוטה נשמרה ✓')}
          {state === 'error' && 'השמירה נכשלה, נסי שוב'}
          {state === 'idle' && submitted && 'הדוח נשלח ✓'}
        </p>
      </div>

      <Card>
        <label className="font-medium">📚 מה לימדתי השבוע</label>
        <textarea
          rows={4}
          value={form.taught}
          onChange={(e) => update({ taught: e.target.value })}
          className={field}
        />
        {showErrors && !form.taught.trim() && <p className="mt-1 text-sm text-blush-700">חובה למלא</p>}
      </Card>

      <Card>
        <div className="font-medium">🧩 פערי תלמידים</div>
        <div className="mt-2 space-y-3">
          {form.gaps.map((g) => (
            <div key={g.key} className="rounded-2xl bg-lilac-100 p-3">
              <div className="flex gap-2">
                <select
                  value={g.student_id}
                  onChange={(e) => updateGap(g.key, { student_id: e.target.value })}
                  className="min-h-12 flex-1 rounded-2xl border border-lilac-200 bg-white px-3"
                >
                  <option value="">בחרי תלמידה…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="הסרה"
                  onClick={() => update({ gaps: form.gaps.filter((x) => x.key !== g.key) })}
                  className="min-h-12 min-w-12 rounded-2xl bg-white text-lg"
                >
                  ✕
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="מה הפער?"
                value={g.description}
                onChange={(e) => updateGap(g.key, { description: e.target.value })}
                className={field}
              />
              {showErrors && (!g.student_id || !g.description.trim()) && (
                <p className="mt-1 text-sm text-blush-700">יש לבחור תלמידה ולכתוב תיאור</p>
              )}
            </div>
          ))}
        </div>
        {students.length === 0 && form.gaps.length === 0 && (
          <p className="mt-2 text-sm text-ink-soft">אין עדיין תלמידות בקבוצה.</p>
        )}
        <button
          type="button"
          disabled={students.length === 0}
          onClick={() => update({ gaps: [...form.gaps, { key: newKey(), student_id: '', description: '' }] })}
          className="mt-3 min-h-12 w-full rounded-2xl bg-blush-100 font-medium text-blush-700 disabled:opacity-50"
        >
          ＋ הוספת פער
        </button>
      </Card>

      <Card>
        <div className="font-medium">איך היה השבוע?</div>
        <div className="mt-2">
          <EmojiScale value={form.mood} onChange={(mood) => update({ mood })} />
        </div>
        {showErrors && form.mood === null && <p className="mt-1 text-sm text-blush-700">יש לבחור דירוג</p>}
      </Card>

      <Card>
        <label className="font-medium">💭 הערות ובקשות נוספות</label>
        <textarea rows={3} value={form.notes} onChange={(e) => update({ notes: e.target.value })} className={field} />
      </Card>

      <Card>
        <Switch checked={form.is_private} onChange={(is_private) => update({ is_private })} label="🔒 פרטי (רק למנהלת)" />
        <p className="text-sm text-ink-soft">
          {form.is_private ? 'רק המנהלת תראה את הדוח.' : 'מורות הקבוצה שלך יראו את הדוח (כולל הפערים).'}
        </p>
      </Card>

      <button
        type="button"
        onClick={submit}
        disabled={state === 'saving'}
        className="min-h-14 w-full rounded-3xl bg-blush-500 text-lg font-semibold text-white shadow-soft disabled:opacity-60"
      >
        {submitted ? 'עדכון הדוח 💌' : 'שליחת הדוח 💌'}
      </button>
    </div>
  )
}
