import { useEffect, useState } from 'react'

type InstallEvent = Event & { prompt: () => Promise<void> }

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

// Captured at module load: the event can fire before any component mounts.
let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallEvent
  listeners.forEach((l) => l())
})
window.addEventListener('appinstalled', () => {
  deferred = null
  listeners.forEach((l) => l())
})

export function useInstall() {
  const [, rerender] = useState(0)
  useEffect(() => {
    const l = () => rerender((n) => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  return {
    installed: isStandalone(),
    ios: isIos(),
    canPrompt: deferred !== null,
    prompt: async () => {
      await deferred?.prompt()
      deferred = null
      listeners.forEach((l) => l())
    },
  }
}
