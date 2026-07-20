import { AppShell } from './AppShell'
import { useAuth } from '../features/auth/AuthProvider'

export function RoleAwareAppShell() {
  const { profile } = useAuth()
  if (!profile) return null
  return <AppShell role={profile.role} />
}
