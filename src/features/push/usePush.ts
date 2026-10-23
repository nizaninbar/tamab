import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { isIos, isStandalone } from '../install/useInstall'

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function keyToBytes(b64: string) {
  const raw = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const currentSub = async () => (await navigator.serviceWorker.ready).pushManager.getSubscription()

export function usePush() {
  const { session } = useAuth()
  const userId = session?.user.id
  const [state, setState] = useState<PushState>('off')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID) {
      setState(isIos() && !isStandalone() ? 'needs-install' : 'unsupported')
      return
    }
    if (Notification.permission === 'denied') return setState('denied')
    setState((await currentSub()) ? 'on' : 'off')
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const enable = async () => {
    setBusy(true)
    setError('')
    try {
      if (await Notification.requestPermission() !== 'granted') return await refresh()
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID!) }))
      const j = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        { user_id: userId, endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth },
        { onConflict: 'endpoint' },
      )
      if (error) throw error
      setState('on')
    } catch {
      setError('לא הצלחנו להפעיל התראות')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    setError('')
    try {
      const sub = await currentSub()
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setState('off')
    } catch {
      setError('הכיבוי נכשל')
    } finally {
      setBusy(false)
    }
  }

  return { state, busy, error, enable, disable }
}
