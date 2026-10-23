import { useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

// Personal link: /#/join?t=<token>. Exchanges the token for a session.
export function JoinPage() {
  const [params] = useSearchParams()
  const token = params.get('t')
  const { session } = useAuth()
  const [error, setError] = useState(token ? '' : 'הקישור לא תקין')
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    supabase.functions
      .invoke('redeem-link', { body: { token } })
      .then(async ({ data, error: err }) => {
        if (err || !data?.access_token) {
          setError('הקישור לא תקין או שבוטל. בקשי קישור חדש מהמנהלת')
          return
        }
        const { error: sErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        })
        if (sErr) setError('משהו השתבש, נסי שוב')
      })
  }, [token])

  if (session && !error) return <Navigate to="/" replace />

  return (
    <div className="mx-auto flex min-h-dvh max-w-120 items-center px-4">
      <Card className="w-full text-center">
        <div className="text-5xl">{error ? '🥺' : '🌸'}</div>
        <p className="mt-3 text-ink">{error || 'מתחברת...'}</p>
      </Card>
    </div>
  )
}
