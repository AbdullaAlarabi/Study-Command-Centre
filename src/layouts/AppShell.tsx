import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { DesktopSidebar } from '../components/DesktopSidebar'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { roleNavigation } from '../components/navigation'
import { useAuth } from '../features/auth/AuthProvider'
import type { UserRole } from '../types/auth'

function getPageTitle(pathname: string, role: UserRole) {
  const exact = roleNavigation[role].find((item) => item.to === pathname)
  if (exact) return exact.label

  if (pathname.includes('/assessment/')) return 'Assessment overview'
  if (pathname.includes('/chapter/')) return 'Chapter study pack'
  if (pathname.includes('/quiz/')) return 'Chapter quiz'
  if (pathname.includes('/revision/')) return 'Full revision'
  if (pathname.includes('/mock/')) return 'Mock exam'
  if (pathname.includes('/attempts/')) return 'Attempt details'
  return role === 'student' ? 'Student workspace' : 'Coach workspace'
}

export function AppShell({ role }: { role: UserRole }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const [logoutPending, setLogoutPending] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const items = roleNavigation[role]
  const pageTitle = useMemo(
    () => getPageTitle(location.pathname, role),
    [location.pathname, role],
  )

  async function handleLogout() {
    setLogoutPending(true)
    setLogoutError('')
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Could not log out.')
    } finally {
      setLogoutPending(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <DesktopSidebar role={role} items={items} />
      <div className="min-w-0">
        <AppHeader
          displayName={profile?.display_name ?? (role === 'student' ? 'Student' : 'Coach')}
          role={role}
          title={pageTitle}
          logoutPending={logoutPending}
          onLogout={handleLogout}
        />
        {logoutError && (
          <p role="alert" className="border-b border-risk/20 bg-risk-50 px-5 py-3 text-sm text-risk-700">
            {logoutError}
          </p>
        )}
        <main className="pb-24 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav items={items} />
    </div>
  )
}
