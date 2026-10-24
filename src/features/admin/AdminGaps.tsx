import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GapsList, type GapItem } from '../gaps/GapsList'
import { deleteGap, fetchGaps } from './api'
import { ErrorNote, GroupSelect, Loading } from './ui'

export function AdminGaps() {
  const [groupId, setGroupId] = useState('')
  const gaps = useQuery({ queryKey: ['admin-gaps'], queryFn: fetchGaps })
  const qc = useQueryClient()
  const remove = useMutation({
    mutationFn: deleteGap,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-gaps'] })
      qc.invalidateQueries({ queryKey: ['admin-reports'] })
    },
  })
  const onDelete = (id: string) => {
    if (window.confirm('למחוק את הפער? הוא יימחק גם מהדוח.')) remove.mutate(id)
  }

  const rows: GapItem[] = []
  for (const g of gaps.data ?? []) {
    if (!g.students || (groupId && g.students.group_id !== groupId)) continue
    rows.push({
      id: g.id,
      studentId: g.students.id,
      studentName: g.students.full_name,
      groupId: g.students.group_id,
      week: g.weekly_reports?.week_start ?? '',
      teacher: g.weekly_reports?.profiles?.full_name ?? '',
      description: g.description,
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-center text-xl font-semibold text-blush-700">🧩 פערים</h1>
      <GroupSelect value={groupId} onChange={setGroupId} allLabel="כל הקבוצות" />
      {gaps.error && <ErrorNote error={gaps.error} />}
      {remove.error && <ErrorNote error={remove.error} />}
      {gaps.isPending && <Loading />}
      {gaps.data && <GapsList rows={rows} onDelete={onDelete} />}
    </div>
  )
}
