import { supabase } from '../../lib/supabase'

export type Group = { id: string; name: string }
export type Teacher = { id: string; full_name: string; avatar_emoji: string; group_id: string | null }
export type AdminStudent = { id: string; full_name: string; group_id: string; active: boolean }

export type AdminReport = {
  id: string
  teacher_id: string
  week_start: string
  taught: string
  mood: number | null
  notes: string
  is_private: boolean
  submitted_at: string | null
  report_gaps: { student_id: string; description: string }[]
  profiles: { full_name: string; avatar_emoji: string; group_id: string | null } | null
}

export type GapRow = {
  id: string
  description: string
  students: { id: string; full_name: string; group_id: string } | null
  weekly_reports: { week_start: string; teacher_id: string; profiles: { full_name: string } | null } | null
}

export type Settings = { reminder_day: number; reminder_time: string }

const ok = <T>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

export const fetchGroups = async (): Promise<Group[]> =>
  ok(await supabase.from('groups').select('id, name').order('name'))

export const fetchTeachers = async (): Promise<Teacher[]> =>
  ok(await supabase.from('profiles').select('id, full_name, avatar_emoji, group_id').eq('role', 'teacher').order('full_name'))

export const fetchAdmins = async (): Promise<Teacher[]> =>
  ok(await supabase.from('profiles').select('id, full_name, avatar_emoji, group_id').eq('role', 'admin').order('full_name'))

export const fetchAllStudents = async (): Promise<AdminStudent[]> =>
  ok(await supabase.from('students').select('id, full_name, group_id, active').order('full_name'))

export const fetchWeekReports = async (week: string): Promise<AdminReport[]> =>
  ok(
    await supabase
      .from('weekly_reports')
      .select('id, teacher_id, week_start, taught, mood, notes, is_private, submitted_at, report_gaps(student_id, description), profiles(full_name, avatar_emoji, group_id)')
      .eq('week_start', week),
  ) as unknown as AdminReport[]

export async function fetchGaps(): Promise<GapRow[]> {
  const data = ok(
    await supabase
      .from('report_gaps')
      .select('id, description, students(id, full_name, group_id), weekly_reports!inner(week_start, teacher_id, submitted_at, profiles(full_name))')
      .not('weekly_reports.submitted_at', 'is', null),
  )
  return data as unknown as GapRow[]
}

export const fetchSettings = async (): Promise<Settings> =>
  ok(await supabase.from('settings').select('reminder_day, reminder_time').eq('id', 1).single())

export async function saveSettings(s: Settings) {
  ok(await supabase.from('settings').update(s).eq('id', 1).select('id'))
}

export async function addGroup(name: string) {
  ok(await supabase.from('groups').insert({ name }).select('id'))
}
export async function renameGroup(id: string, name: string) {
  ok(await supabase.from('groups').update({ name }).eq('id', id).select('id'))
}
export async function addStudent(group_id: string, full_name: string) {
  ok(await supabase.from('students').insert({ group_id, full_name }).select('id'))
}
export async function updateStudent(id: string, patch: Partial<Pick<AdminStudent, 'active' | 'group_id' | 'full_name'>>) {
  ok(await supabase.from('students').update(patch).eq('id', id).select('id'))
}
export async function updateTeacher(id: string, patch: Partial<Pick<Teacher, 'group_id' | 'full_name'>>) {
  ok(await supabase.from('profiles').update(patch).eq('id', id).select('id'))
}

export const joinUrl = (token: string) =>
  `${window.location.origin}${import.meta.env.BASE_URL}#/join?t=${token}`

type InviteBody =
  | { action: 'create'; full_name: string; group_id: string | null; role?: 'admin' | 'teacher' }
  | { action: 'regenerate' | 'revoke' | 'remove_admin'; user_id: string }

/** Calls the invite-teacher Edge Function. Returns the one-time link (not for revoke). */
export async function invite(body: InviteBody): Promise<{ user_id: string; url?: string }> {
  const { data, error } = await supabase.functions.invoke('invite-teacher', { body })
  if (error) throw new Error(error.message)
  return { user_id: data.user_id, url: data.token ? joinUrl(data.token) : undefined }
}

/** Sends a test push via the send-reminders Edge Function. `userId` null = myself. Returns the number of devices reached. */
export async function sendTestPush(userId: string | null): Promise<number> {
  const { data, error } = await supabase.functions.invoke('send-reminders', { body: { action: 'test', user_id: userId } })
  if (error) throw new Error(error.message)
  return data.sent as number
}
