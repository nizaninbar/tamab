import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider'
import { InstallCard } from '../../features/install/InstallCard'
import { BottomNav, type NavItem } from './BottomNav'
import { OfflineBanner } from './OfflineBanner'

const teacherNav: NavItem[] = [
  { to: '/', emoji: '🏡', label: 'בית' },
  { to: '/report', emoji: '📝', label: 'דוח' },
  { to: '/schedule', emoji: '🗓️', label: 'מערכת' },
  { to: '/profile', emoji: '🌸', label: 'פרופיל' },
]

const adminNav: NavItem[] = [
  { to: '/', emoji: '📊', label: 'דשבורד' },
  { to: '/reports', emoji: '📝', label: 'דוחות' },
  { to: '/gaps', emoji: '🧩', label: 'פערים' },
  { to: '/schedules', emoji: '🗓️', label: 'מערכות' },
  { to: '/manage', emoji: '⚙️', label: 'ניהול' },
]

// Auth guard + role-based shell.
export function Layout() {
  const { loading, session, profile, signOut } = useAuth()

  if (loading) return <div className="grid min-h-dvh place-items-center text-5xl">🌸</div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-120 place-items-center px-4 text-center">
        <div>
          <p className="text-ink">החשבון לא מוגדר. פני למנהלת.</p>
          <button onClick={signOut} className="mt-4 min-h-12 rounded-2xl bg-white px-6 shadow-soft">התנתקות</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-120 flex-col">
      <main className="flex-1 px-4 pt-6 pb-28">
        <OfflineBanner />
        {profile.role === 'teacher' && <div className="mb-4 empty:hidden"><InstallCard dismissible /></div>}
        <Outlet />
      </main>
      <BottomNav items={profile.role === 'admin' ? adminNav : teacherNav} />
    </div>
  )
}
