import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

const inputCls = 'w-full rounded-2xl border border-lilac-200 bg-white px-4 py-3 text-ink outline-none focus:border-blush-400'
const btnCls = 'min-h-12 w-full rounded-2xl bg-blush-500 font-medium text-white disabled:opacity-60'

export function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError('אימייל או סיסמה שגויים')
    setBusy(false)
  }

  const google = async () => {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    if (err) setError('התחברות עם Google נכשלה')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-120 items-center px-4">
      <Card className="w-full">
        <div className="text-center text-5xl">🌸</div>
        <h1 className="mt-2 text-center text-xl font-semibold text-blush-700">התחברות</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">מורות נכנסות דרך הקישור האישי שקיבלו</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input className={inputCls} type="email" dir="ltr" placeholder="אימייל" autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={inputCls} type="password" dir="ltr" placeholder="סיסמה" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className={btnCls} disabled={busy}>כניסה</button>
        </form>
        <button onClick={google} className="mt-3 min-h-12 w-full rounded-2xl bg-lilac-100 font-medium text-lilac-700">
          כניסה עם Google
        </button>
      </Card>
    </div>
  )
}
