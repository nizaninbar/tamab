import { NavLink } from 'react-router-dom'

export type NavItem = { to: string; emoji: string; label: string }

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-120 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ul className="flex rounded-3xl bg-white/90 p-1.5 shadow-soft backdrop-blur">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-medium transition-colors ${
                  isActive ? 'bg-blush-100 text-blush-700' : 'text-ink-soft'
                }`
              }
            >
              <span className="text-xl leading-none">{item.emoji}</span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
