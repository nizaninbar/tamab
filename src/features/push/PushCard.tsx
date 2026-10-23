import { Card } from '../../components/ui/Card'
import { usePush } from './usePush'

const HINTS = {
  unsupported: 'הדפדפן הזה לא תומך בהתראות.',
  'needs-install': 'באייפון צריך קודם להוסיף את האפליקציה למסך הבית (שיתוף ← הוספה למסך הבית), ואז לפתוח אותה משם.',
  denied: 'ההתראות חסומות. אפשר לאפשר אותן בהגדרות הדפדפן או המכשיר.',
} as const

export function PushCard() {
  const { state, busy, error, enable, disable } = usePush()
  return (
    <Card>
      <h2 className="font-medium text-ink">🔔 התראות</h2>
      {state in HINTS ? (
        <p className="mt-1 text-sm text-ink-soft">{HINTS[state as keyof typeof HINTS]}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            {state === 'on' ? 'התראות מופעלות במכשיר הזה ✅' : 'קבלת תזכורת כשצריך למלא את הדוח השבועי.'}
          </p>
          <button
            disabled={busy}
            onClick={state === 'on' ? disable : enable}
            className={`mt-3 min-h-12 w-full rounded-2xl font-medium disabled:opacity-60 ${
              state === 'on' ? 'bg-white text-ink-soft shadow-soft' : 'bg-blush-100 text-blush-700'
            }`}
          >
            {state === 'on' ? 'כיבוי התראות' : 'הפעלת התראות'}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  )
}
