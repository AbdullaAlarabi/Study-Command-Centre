import { BarChart3 } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { PageContainer } from '../components/PageContainer'
import { useAuth } from '../features/auth/AuthProvider'

export function CoachShellPage() {
  const { profile } = useAuth()

  return (
    <PageContainer
      eyebrow="Coach dashboard"
      title={`Welcome back, ${profile?.display_name ?? 'Coach'}`}
      description="Monitor completion, readiness, attempts, essays, and recent activity from one focused workspace."
    >
      <EmptyState
        title="Analytics begin in Phase 8"
        description="The navigation and responsive shell are ready. No placeholder scores or invented student activity are shown here."
        icon={BarChart3}
      />
    </PageContainer>
  )
}
