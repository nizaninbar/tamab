import { supabase } from '../../lib/supabase'

export type Slot = { day: number; start_time: string; end_time: string; note: string }

export type TeacherSchedule = {
  teacher_id: string
  profiles: { full_name: string; avatar_emoji: string } | null
  schedule_slots: Slot[]
}

export const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

/** Postgres returns time as HH:MM:SS; inputs want HH:MM. */
const hm = (t: string) => t.slice(0, 5)
const normalize = (s: Slot): Slot => ({ ...s, start_time: hm(s.start_time), end_time: hm(s.end_time) })
const byTime = (a: Slot, b: Slot) => a.day - b.day || a.start_time.localeCompare(b.start_time)

/** The teacher's slots for a week, or null if no schedule was saved for it. */
export async function fetchMySchedule(teacherId: string, week: string): Promise<Slot[] | null> {
  const { data, error } = await supabase
    .from('weekly_schedules')
    .select('schedule_slots(day, start_time, end_time, note)')
    .eq('teacher_id', teacherId)
    .eq('week_start', week)
    .maybeSingle()
  if (error) throw error
  return data ? data.schedule_slots.map(normalize).sort(byTime) : null
}

/** Upsert the schedule for the week and replace its slots. */
export async function saveSchedule(teacherId: string, week: string, slots: Slot[]): Promise<Slot[]> {
  const { data, error } = await supabase
    .from('weekly_schedules')
    .upsert({ teacher_id: teacherId, week_start: week }, { onConflict: 'teacher_id,week_start' })
    .select('id')
    .single()
  if (error) throw error

  const clean = slots.map((s) => ({ day: s.day, start_time: s.start_time, end_time: s.end_time, note: s.note.trim() }))
  const del = await supabase.from('schedule_slots').delete().eq('schedule_id', data.id)
  if (del.error) throw del.error
  if (clean.length) {
    const ins = await supabase.from('schedule_slots').insert(clean.map((s) => ({ ...s, schedule_id: data.id })))
    if (ins.error) throw ins.error
  }
  return clean.sort(byTime)
}

/** Everyone's schedule for a week (readable by all signed-in users). */
export async function fetchAllSchedules(week: string): Promise<TeacherSchedule[]> {
  const { data, error } = await supabase
    .from('weekly_schedules')
    .select('teacher_id, profiles(full_name, avatar_emoji), schedule_slots(day, start_time, end_time, note)')
    .eq('week_start', week)
  if (error) throw error
  return (data as unknown as TeacherSchedule[]).map((t) => ({
    ...t,
    schedule_slots: t.schedule_slots.map(normalize).sort(byTime),
  }))
}
