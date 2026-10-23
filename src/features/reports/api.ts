import { supabase } from '../../lib/supabase'

export type Gap = { student_id: string; description: string }

export type Report = {
  id: string
  teacher_id: string
  week_start: string
  taught: string
  mood: number | null
  notes: string
  is_private: boolean
  submitted_at: string | null
  report_gaps: Gap[]
}

export type Student = { id: string; full_name: string }

export type FeedItem = Report & {
  profiles: { full_name: string; avatar_emoji: string } | null
}

const REPORT_COLS = 'id, teacher_id, week_start, taught, mood, notes, is_private, submitted_at'

export async function fetchMyReport(teacherId: string, week: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select(`${REPORT_COLS}, report_gaps(student_id, description)`)
    .eq('teacher_id', teacherId)
    .eq('week_start', week)
    .maybeSingle()
  if (error) throw error
  return data as Report | null
}

export async function fetchStudents(groupId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name')
    .eq('group_id', groupId)
    .eq('active', true)
    .order('full_name')
  if (error) throw error
  return data
}

export type ReportDraft = {
  taught: string
  mood: number | null
  notes: string
  is_private: boolean
  gaps: Gap[]
  submit?: boolean
}

/** Upsert the report for the week and replace its gaps. Keeps submitted_at unless `submit` is set. */
export async function saveReport(teacherId: string, week: string, d: ReportDraft): Promise<Report> {
  const row: Record<string, unknown> = {
    teacher_id: teacherId,
    week_start: week,
    taught: d.taught,
    mood: d.mood,
    notes: d.notes,
    is_private: d.is_private,
  }
  if (d.submit) row.submitted_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('weekly_reports')
    .upsert(row, { onConflict: 'teacher_id,week_start' })
    .select(REPORT_COLS)
    .single()
  if (error) throw error

  const gaps = d.gaps
    .filter((g) => g.student_id && g.description.trim())
    .map((g) => ({ report_id: data.id, student_id: g.student_id, description: g.description.trim() }))
  const del = await supabase.from('report_gaps').delete().eq('report_id', data.id)
  if (del.error) throw del.error
  if (gaps.length) {
    const ins = await supabase.from('report_gaps').insert(gaps)
    if (ins.error) throw ins.error
  }
  return { ...(data as Omit<Report, 'report_gaps'>), report_gaps: gaps }
}

/** Submitted, public reports of the teacher's group for a week (RLS limits to own group), excluding own. */
export async function fetchFeed(week: string, myId: string): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select(`${REPORT_COLS}, report_gaps(student_id, description), profiles(full_name, avatar_emoji)`)
    .eq('week_start', week)
    .eq('is_private', false)
    .not('submitted_at', 'is', null)
    .neq('teacher_id', myId)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return data as unknown as FeedItem[]
}

export async function fetchMyScheduleExists(teacherId: string, week: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('weekly_schedules')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacherId)
    .eq('week_start', week)
  if (error) throw error
  return (count ?? 0) > 0
}
