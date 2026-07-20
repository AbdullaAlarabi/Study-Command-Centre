import { LogOut } from 'lucide-react'
import type { UserRole } from '../types/auth'
import { roleMeta } from './navigation'

export function AppHeader({
  displayName,
  role,
  title,
  logoutPending,
  onLogout,
}: {
  displayName: string
  role: UserRole
  title: string
  logoutPending?: boolean
  onLogout: () => void
}) {
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-30 border-b border-navy/10 bg-canvas/90 backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:min-h-[4.5rem] lg:px-8">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700 lg:hidden">
            Study Command Centre
          </p>
          <p className="truncate text-base font-bold text-navy sm:text-lg">{title}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-3 border-l border-navy/10 pl-3 sm:flex">
            <span className="grid size-10 place-items-center rounded-xl bg-navy font-bold text-white">
              {initials || role[0].toUpperCase()}
            </span>
            <div className="hidden xl:block">
              <p className="max-w-36 truncate text-sm font-bold text-navy">{displayName}</p>
              <p className="text-xs text-muted">{roleMeta[role].label}</p>
            </div>
          </div>
          <button
            aria-label="Log out"
            className="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-white hover:text-risk disabled:opacity-50"
            title="Log out"
            type="button"
            disabled={logoutPending}
            onClick={onLogout}
          >
            <LogOut aria-hidden="true" size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
