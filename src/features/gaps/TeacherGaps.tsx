import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { fetchGroupGaps } from './api'
import { GapsList } from './GapsList'

export function TeacherGaps() {
  const gaps = useQuery({ queryKey: ['group-gaps'], queryFn: fetchGroupGaps })

  return (
    <div className="space-y-4">
      <h1 className="text-center text-xl font-semibold text-blush-700">🧩 פערים</h1>
      {gaps.isPending && <div className="py-16 text-center text-4xl">🌸</div>}
      {gaps.error && <Card className="text-center text-sm text-red-600">הטעינה נכשלה, נסי שוב</Card>}
      {gaps.data && <GapsList rows={gaps.data} />}
    </div>
  )
}
