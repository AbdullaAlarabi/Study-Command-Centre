import { BookOpenCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { UserRole } from '../types/auth'
import { roleMeta, type NavigationItem } from './navigation'

export function DesktopSidebar({
  role,
  items,
}: {
  role: UserRole
  items: NavigationItem[]
}) {
  const RoleIcon = roleMeta[role].icon

  return (
    <aside className="sticky top-0 hidden h-dvh border-r border-navy/10 bg-navy px-4 py-5 text-white lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-2 py-2">
        <span className="grid size-11 place-items-center rounded-xl bg-white text-navy shadow-sm">
          <BookOpenCheck aria-hidden="true" size={23} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-100">
            Study
          </p>
          <p className="truncate text-sm font-bold">Command Centre</p>
        </div>
      </div>

      <nav aria-label={`${role} navigation`} className="mt-8 space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
              to={item.to}
            >
              <Icon aria-hidden="true" size={20} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-teal text-white">
            <RoleIcon aria-hidden="true" size={18} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
              Signed in as
            </p>
            <p className="mt-0.5 text-xs font-semibold text-white/85">{roleMeta[role].label}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
