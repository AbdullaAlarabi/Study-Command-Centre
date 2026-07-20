import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { UserRole } from '../../types/auth'
import { useAuth } from './AuthProvider'

export function RequireRole({
  role,
  children,
}: {
  role: UserRole
  children: ReactNode
}) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-6">
        <p className="text-sm font-medium text-navy/70">Loading your workspace…</p>
      </main>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (profile.role !== role) {
    return <Navigate to={`/${profile.role}`} replace />
  }

  return children
}
