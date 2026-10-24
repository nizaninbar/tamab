import { supabase } from '../../lib/supabase'
import type { GapItem } from './GapsList'

type GroupGapRow = {
  id: string
  description: string
  student_id: string
  student_name: string
  week_start: string
  teacher_name: string
}

// All gaps of the teacher's group, also from private reports (security-definer RPC).
export async function fetchGroupGaps(): Promise<GapItem[]> {
  const { data, error } = await supabase.rpc('group_gaps')
  if (error) throw error
  return (data as GroupGapRow[]).map((g) => ({
    id: g.id,
    studentId: g.student_id,
    studentName: g.student_name,
    week: g.week_start,
    teacher: g.teacher_name,
    description: g.description,
  }))
}
