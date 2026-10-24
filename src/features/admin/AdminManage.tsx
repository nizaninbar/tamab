import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { InstallCard } from '../install/InstallCard'
import { PushCard } from '../push/PushCard'
import { useAuth } from '../auth/AuthProvider'
import { addWeeks, currentWeek } from '../../lib/week'
import {
  addGroup, addStudent, cleanupBefore, deleteGroup, deleteStudent, fetchAdmins, fetchAllStudents, fetchSettings,
  fetchTeachers, invite, renameGroup, saveSettings, sendTestPush, updateStudent, updateTeacher,
} from './api'
import { btnCls, ErrorNote, GroupSelect, inputCls, Loading, softBtnCls, useGroups } from './ui'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

function TeachersSection() {
  const qc = useQueryClient()
  const { name: groupName } = useGroups()
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: fetchTeachers })
  const [fullName, setFullName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [link, setLink] = useState<{ id: string; url: string } | null>(null)
  const [msg, setMsg] = useState('')

  const run = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onError: (e: Error) => setMsg(e.message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  })

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setMsg('הקישור הועתק ✅')
    } catch {
      setMsg('לא הצלחתי להעתיק, אפשר להעתיק ידנית מהשדה')
    }
  }

  const create = () =>
    run.mutate(async () => {
      setMsg('')
      const r = await invite({ action: 'create', full_name: fullName.trim(), group_id: groupId || null })
      setFullName('')
      setLink({ id: r.user_id, url: r.url! })
    })

  const regenerate = (id: string) =>
    run.mutate(async () => {
      if (!window.confirm('ליצור קישור חדש? הקישור הישן יפסיק לעבוד.')) return
      setMsg('')
      const r = await invite({ action: 'regenerate', user_id: id })
      setLink({ id, url: r.url! })
    })

  const revoke = (id: string) =>
    run.mutate(async () => {
      if (!window.confirm('לבטל את הקישור? המורה לא תוכל להיכנס מחדש.')) return
      await invite({ action: 'revoke', user_id: id })
      setLink(null)
      setMsg('הקישור בוטל')
    })

  const remove = (id: string, name: string) =>
    run.mutate(async () => {
      if (!window.confirm(`למחוק את ${name}? כל הדוחות, הפערים והמערכות שלה יימחקו, והקישור שלה יפסיק לעבוד.`)) return
      setMsg('')
      await invite({ action: 'remove', user_id: id })
      setLink(null)
      qc.invalidateQueries({ queryKey: ['admin-reports'] })
      qc.invalidateQueries({ queryKey: ['admin-gaps'] })
      qc.invalidateQueries({ queryKey: ['all-schedules'] })
    })

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">👩‍🏫 מורות</h2>
      {teachers.isPending && <Loading />}
      {teachers.error && <ErrorNote error={teachers.error} />}
      {teachers.data?.map((t) => (
        <div key={t.id} className="space-y-2 rounded-2xl bg-lilac-100/50 p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t.avatar_emoji} {t.full_name}</span>
            <span className="text-xs text-ink-soft">{groupName(t.group_id)}</span>
          </div>
          <GroupSelect
            value={t.group_id ?? ''}
            onChange={(v) => run.mutate(() => updateTeacher(t.id, { group_id: v || null }))}
          />
          <div className="flex gap-2">
            <button className={`${softBtnCls} flex-1`} onClick={() => regenerate(t.id)}>🔗 קישור חדש</button>
            <button className={`${softBtnCls} flex-1`} onClick={() => revoke(t.id)}>🚫 ביטול</button>
            <button className={`${softBtnCls} flex-1`} onClick={() => remove(t.id, t.full_name)}>🗑 מחיקה</button>
          </div>
          {link?.id === t.id && (
            <div className="space-y-2">
              <input className={`${inputCls} text-xs`} dir="ltr" readOnly value={link.url} onFocus={(e) => e.target.select()} />
              <button className={`${btnCls} w-full`} onClick={() => copy(link.url)}>העתקת קישור</button>
              <p className="text-xs text-ink-soft">הקישור מוצג רק עכשיו. אפשר לשלוח בוואטסאפ.</p>
            </div>
          )}
        </div>
      ))}

      <div className="space-y-2 border-t border-lilac-100 pt-3">
        <h3 className="text-sm font-medium">הוספת מורה</h3>
        <input className={inputCls} placeholder="שם מלא" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <GroupSelect value={groupId} onChange={setGroupId} />
        <button className={`${btnCls} w-full`} disabled={!fullName.trim() || run.isPending} onClick={create}>
          יצירה וקישור אישי
        </button>
      </div>
      {msg && <p className="text-sm text-ink-soft">{msg}</p>}
    </Card>
  )
}

function AdminsSection() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  const admins = useQuery({ queryKey: ['admins'], queryFn: fetchAdmins })
  const [fullName, setFullName] = useState('')
  const [link, setLink] = useState<{ id: string; url: string } | null>(null)
  const [msg, setMsg] = useState('')

  const run = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onError: (e: Error) => setMsg(e.message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
  })

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setMsg('הקישור הועתק ✅')
    } catch {
      setMsg('לא הצלחתי להעתיק, אפשר להעתיק ידנית מהשדה')
    }
  }

  const create = () =>
    run.mutate(async () => {
      setMsg('')
      const r = await invite({ action: 'create', role: 'admin', full_name: fullName.trim(), group_id: null })
      setFullName('')
      setLink({ id: r.user_id, url: r.url! })
    })

  const regenerate = (id: string) =>
    run.mutate(async () => {
      if (!window.confirm('ליצור קישור חדש? הקישור הישן יפסיק לעבוד.')) return
      setMsg('')
      const r = await invite({ action: 'regenerate', user_id: id })
      setLink({ id, url: r.url! })
    })

  const revoke = (id: string) =>
    run.mutate(async () => {
      if (!window.confirm('לבטל את הקישור? המנהלת לא תוכל להיכנס מחדש.')) return
      await invite({ action: 'revoke', user_id: id })
      setLink(null)
      setMsg('הקישור בוטל')
    })

  const remove = (id: string) =>
    run.mutate(async () => {
      if (!window.confirm('להסיר את המנהלת? החשבון שלה יימחק.')) return
      setMsg('')
      await invite({ action: 'remove', user_id: id })
      setLink(null)
    })

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">👑 מנהלות</h2>
      {admins.isPending && <Loading />}
      {admins.error && <ErrorNote error={admins.error} />}
      {admins.data?.map((a) => (
        <div key={a.id} className="space-y-2 rounded-2xl bg-lilac-100/50 p-3">
          <span className="font-medium">{a.avatar_emoji} {a.full_name}</span>
          {a.id !== profile?.id && (
            <div className="flex gap-2">
              <button className={`${softBtnCls} flex-1`} onClick={() => regenerate(a.id)}>🔗 קישור חדש</button>
              <button className={`${softBtnCls} flex-1`} onClick={() => revoke(a.id)}>🚫 ביטול</button>
              <button className={`${softBtnCls} flex-1`} onClick={() => remove(a.id)}>🗑 הסרה</button>
            </div>
          )}
          {link?.id === a.id && (
            <div className="space-y-2">
              <input className={`${inputCls} text-xs`} dir="ltr" readOnly value={link.url} onFocus={(e) => e.target.select()} />
              <button className={`${btnCls} w-full`} onClick={() => copy(link.url)}>העתקת קישור</button>
              <p className="text-xs text-ink-soft">הקישור מוצג רק עכשיו. אפשר לשלוח בוואטסאפ.</p>
            </div>
          )}
        </div>
      ))}

      <div className="space-y-2 border-t border-lilac-100 pt-3">
        <h3 className="text-sm font-medium">הוספת מנהלת</h3>
        <input className={inputCls} placeholder="שם מלא" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <button className={`${btnCls} w-full`} disabled={!fullName.trim() || run.isPending} onClick={create}>
          יצירה וקישור אישי
        </button>
      </div>
      {msg && <p className="text-sm text-ink-soft">{msg}</p>}
    </Card>
  )
}

function GroupsSection() {
  const qc = useQueryClient()
  const { groups } = useGroups()
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const done = () => qc.invalidateQueries({ queryKey: ['groups'] })
  const onError = (e: Error) => setErr(e.message)

  const add = useMutation({ mutationFn: () => addGroup(name.trim()), onSuccess: () => { setName(''); done() }, onError })
  const rename = useMutation({ mutationFn: (v: { id: string; name: string }) => renameGroup(v.id, v.name), onSuccess: done, onError })
  const remove = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      done()
      for (const k of ['admin-students', 'teachers', 'admin-gaps', 'admin-reports']) qc.invalidateQueries({ queryKey: [k] })
    },
    onError,
  })

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">👯 קבוצות</h2>
      {groups.map((g) => (
        <div key={g.id + g.name} className="flex gap-2">
          <input
            className={inputCls}
            defaultValue={g.name}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== g.name) rename.mutate({ id: g.id, name: v })
            }}
          />
          <button
            className={softBtnCls}
            aria-label="מחיקת הקבוצה"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`למחוק את ${g.name}? כל התלמידות שלה והפערים שלהן יימחקו, והמורות שלה יישארו בלי קבוצה.`)) remove.mutate(g.id)
            }}
          >
            🗑
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input className={inputCls} placeholder="קבוצה חדשה" value={name} onChange={(e) => setName(e.target.value)} />
        <button className={btnCls} disabled={!name.trim() || add.isPending} onClick={() => add.mutate()}>הוספה</button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </Card>
  )
}

function StudentsSection() {
  const qc = useQueryClient()
  const { groups, name: groupName } = useGroups()
  const students = useQuery({ queryKey: ['admin-students'], queryFn: fetchAllStudents })
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [err, setErr] = useState('')
  const done = () => qc.invalidateQueries({ queryKey: ['admin-students'] })
  const onError = (e: Error) => setErr(e.message)

  const gid = groupId || groups[0]?.id || ''
  const add = useMutation({ mutationFn: () => addStudent(gid, name.trim()), onSuccess: () => { setName(''); done() }, onError })
  const toggle = useMutation({ mutationFn: (s: { id: string; active: boolean }) => updateStudent(s.id, { active: s.active }), onSuccess: done, onError })
  const remove = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => { done(); qc.invalidateQueries({ queryKey: ['admin-gaps'] }); qc.invalidateQueries({ queryKey: ['admin-reports'] }) },
    onError,
  })

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">🎓 תלמידות</h2>
      {students.isPending && <Loading />}
      {students.error && <ErrorNote error={students.error} />}
      {groups.map((g) => {
        const list = (students.data ?? []).filter((s) => s.group_id === g.id)
        return (
          <div key={g.id}>
            <h3 className="mb-1 text-sm font-medium text-lilac-700">{g.name}</h3>
            {list.length === 0 && <p className="text-sm text-ink-soft">אין תלמידות.</p>}
            <ul className="space-y-1">
              {list.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl bg-lilac-100/50 px-3 py-2 text-sm">
                  <span className={s.active ? '' : 'text-ink-soft line-through'}>{s.full_name}</span>
                  <span className="flex">
                    <button className="min-h-10 px-2 text-lilac-700" onClick={() => toggle.mutate({ id: s.id, active: !s.active })}>
                      {s.active ? 'השבתה' : 'הפעלה'}
                    </button>
                    <button
                      className="min-h-10 px-2 text-red-600"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm(`למחוק את ${s.full_name}? כל הפערים שלה יימחקו גם הם.`)) remove.mutate(s.id)
                      }}
                    >
                      מחיקה
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <div className="space-y-2 border-t border-lilac-100 pt-3">
        <h3 className="text-sm font-medium">הוספת תלמידה ל{groupName(gid)}</h3>
        <select className={inputCls} value={gid} onChange={(e) => setGroupId(e.target.value)}>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)} />
          <button className={btnCls} disabled={!name.trim() || !gid || add.isPending} onClick={() => add.mutate()}>הוספה</button>
        </div>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </Card>
  )
}

function CleanupSection() {
  const qc = useQueryClient()
  const [cutoff, setCutoff] = useState(() => addWeeks(currentWeek(), -26))
  const [msg, setMsg] = useState('')
  const clean = useMutation({
    mutationFn: () => cleanupBefore(cutoff),
    onSuccess: (n) => {
      setMsg(`נמחקו ${n.reports} דוחות ו־${n.schedules} מערכות`)
      for (const k of ['admin-reports', 'admin-gaps', 'all-schedules']) qc.invalidateQueries({ queryKey: [k] })
    },
    onError: (e: Error) => setMsg(e.message),
  })

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">🧹 ניקוי נתונים ישנים</h2>
      <p className="text-sm text-ink-soft">מחיקת כל הדוחות (כולל הפערים) והמערכות של שבועות שהתחילו לפני התאריך.</p>
      <input type="date" dir="ltr" className={inputCls} value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
      <button
        className={`${btnCls} w-full`}
        disabled={!cutoff || clean.isPending}
        onClick={() => {
          setMsg('')
          if (window.confirm(`למחוק את כל הדוחות, הפערים והמערכות לפני ${cutoff.split('-').reverse().join('.')}? אי אפשר לשחזר.`)) clean.mutate()
        }}
      >
        מחיקת דוחות ומערכות לפני התאריך
      </button>
      {msg && <p className="text-sm text-ink-soft">{msg}</p>}
    </Card>
  )
}

function ReminderSection() {
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  const qc = useQueryClient()
  const [day, setDay] = useState<number | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const save = useMutation({
    mutationFn: () =>
      saveSettings({
        reminder_day: day ?? settings.data!.reminder_day,
        reminder_time: time ?? settings.data!.reminder_time.slice(0, 5),
      }),
    onSuccess: () => { setMsg('נשמר ✅'); qc.invalidateQueries({ queryKey: ['settings'] }) },
    onError: (e: Error) => setMsg(e.message),
  })

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">⏰ תזכורת שבועית</h2>
      {settings.isPending && <Loading />}
      {settings.error && <ErrorNote error={settings.error} />}
      {settings.data && (
        <>
          <p className="text-sm text-ink-soft">מורות שלא שלחו דוח יקבלו תזכורת ביום ובשעה הבאים (שעון ישראל).</p>
          <select className={inputCls} value={day ?? settings.data.reminder_day} onChange={(e) => setDay(Number(e.target.value))}>
            {DAY_NAMES.map((d, i) => <option key={i} value={i}>יום {d}</option>)}
          </select>
          <input
            type="time"
            dir="ltr"
            className={inputCls}
            value={time ?? settings.data.reminder_time.slice(0, 5)}
            onChange={(e) => setTime(e.target.value)}
          />
          <button className={`${btnCls} w-full`} disabled={save.isPending} onClick={() => { setMsg(''); save.mutate() }}>שמירה</button>
          {msg && <p className="text-sm text-ink-soft">{msg}</p>}
        </>
      )}
    </Card>
  )
}

function TestPushSection() {
  const teachers = useQuery({ queryKey: ['teachers'], queryFn: fetchTeachers })
  const [target, setTarget] = useState('')
  const [msg, setMsg] = useState('')
  const send = useMutation({
    mutationFn: () => sendTestPush(target || null),
    onSuccess: (n) => setMsg(n ? `נשלח ל-${n} מכשירים ✅` : 'אין מכשירים רשומים להתראות'),
    onError: (e: Error) => setMsg(e.message),
  })
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">📣 שליחת התראת ניסיון</h2>
      <select className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">אני</option>
        {teachers.data?.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
      </select>
      <button className={`${btnCls} w-full`} disabled={send.isPending} onClick={() => { setMsg(''); send.mutate() }}>שליחה</button>
      {msg && <p className="text-sm text-ink-soft">{msg}</p>}
    </Card>
  )
}

export function AdminManage() {
  const { signOut } = useAuth()
  return (
    <div className="space-y-4">
      <h1 className="text-center text-xl font-semibold text-blush-700">⚙️ ניהול</h1>
      <TeachersSection />
      <AdminsSection />
      <GroupsSection />
      <StudentsSection />
      <ReminderSection />
      <CleanupSection />
      <InstallCard />
      <PushCard />
      <TestPushSection />
      <button onClick={signOut} className="min-h-12 w-full rounded-2xl bg-white font-medium text-ink-soft shadow-soft">
        התנתקות
      </button>
    </div>
  )
}
