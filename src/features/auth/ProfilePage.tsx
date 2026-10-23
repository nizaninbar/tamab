import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

export function ProfilePage() {
  const { profile, session, signOut } = useAuth()
  const [msg, setMsg] = useState('')
  const hasGoogle = session?.user.identities?.some((i) => i.provider === 'google')

  const linkGoogle = async () => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    if (error) setMsg('החיבור ל-Google נכשל')
  }

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="text-5xl">{profile?.avatar_emoji}</div>
        <h1 className="mt-2 text-xl font-semibold text-blush-700">{profile?.full_name}</h1>
      </Card>
      <Card>
        <h2 className="font-medium text-ink">התחברות עם Google</h2>
        {hasGoogle ? (
          <p className="mt-1 text-sm text-ink-soft">החשבון מחובר ✅</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-soft">אפשר לחבר חשבון Google ולהיכנס איתו בלי הקישור האישי.</p>
            <button onClick={linkGoogle} className="mt-3 min-h-12 w-full rounded-2xl bg-lilac-100 font-medium text-lilac-700">
              חיבור Google
            </button>
          </>
        )}
        {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
      </Card>
      <button onClick={signOut} className="min-h-12 w-full rounded-2xl bg-white font-medium text-ink-soft shadow-soft">
        התנתקות
      </button>
    </div>
  )
}
