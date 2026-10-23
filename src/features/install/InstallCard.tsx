import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { useInstall } from './useInstall'

const DISMISS_KEY = 'install-dismissed'
const wasDismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

// `dismissible` = banner mode (remembered); otherwise always shown until installed.
export function InstallCard({ dismissible = false }: { dismissible?: boolean }) {
  const { installed, ios, canPrompt, prompt } = useInstall()
  const [hidden, setHidden] = useState(dismissible && wasDismissed())
  if (installed || hidden) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setHidden(true)
  }

  return (
    <Card>
      <h2 className="font-medium text-ink">📲 התקנה על מסך הבית</h2>
      <p className="mt-1 text-sm text-ink-soft">כך האפליקציה נפתחת כמו אפליקציה רגילה, וההתראות עובדות.</p>
      {canPrompt ? (
        <button onClick={prompt} className="mt-3 min-h-12 w-full rounded-2xl bg-blush-100 font-medium text-blush-700">
          התקנה
        </button>
      ) : ios ? (
        <ol className="mt-3 list-decimal space-y-1 ps-5 text-sm text-ink">
          <li>פותחים את האתר ב-Safari.</li>
          <li>לוחצים על כפתור השיתוף ⬆️ בתחתית המסך.</li>
          <li>בוחרים "הוספה למסך הבית".</li>
          <li>פותחים את האפליקציה מהאייקון החדש.</li>
        </ol>
      ) : (
        <ol className="mt-3 list-decimal space-y-1 ps-5 text-sm text-ink">
          <li>פותחים את תפריט הדפדפן (⋮).</li>
          <li>בוחרים "התקנת אפליקציה" או "הוספה למסך הבית".</li>
        </ol>
      )}
      {dismissible && (
        <button onClick={dismiss} className="mt-3 min-h-10 w-full rounded-2xl text-sm text-ink-soft">
          לא עכשיו
        </button>
      )}
    </Card>
  )
}
