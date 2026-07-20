import { NavLink } from 'react-router-dom'
import type { NavigationItem } from './navigation'

export function MobileBottomNav({ items }: { items: NavigationItem[] }) {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(18,35,63,0.08)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-[3.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition ${
                  isActive ? 'bg-navy-50 text-navy' : 'text-muted hover:bg-navy-50/60 hover:text-navy'
                }`
              }
              to={item.to}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={2.1} />
              <span className="w-full truncate text-center">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
