import { Outlet } from 'react-router-dom'
import { BottomNav, type NavItem } from './BottomNav'

const teacherNav: NavItem[] = [
  { to: '/', emoji: '🏡', label: 'בית' },
  { to: '/report', emoji: '📝', label: 'דוח' },
  { to: '/schedule', emoji: '🗓️', label: 'מערכת' },
  { to: '/profile', emoji: '🌸', label: 'פרופיל' },
]

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-120 flex-col">
      <main className="flex-1 px-4 pt-6 pb-28">
        <Outlet />
      </main>
      <BottomNav items={teacherNav} />
    </div>
  )
}
