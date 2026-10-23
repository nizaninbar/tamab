import { Card } from '../../components/ui/Card'

export function Placeholder({ emoji, title }: { emoji: string; title: string }) {
  return (
    <Card className="text-center">
      <div className="text-5xl">{emoji}</div>
      <h1 className="mt-2 text-xl font-semibold text-blush-700">{title}</h1>
      <p className="mt-1 text-sm text-ink-soft">בקרוב ✨</p>
    </Card>
  )
}
