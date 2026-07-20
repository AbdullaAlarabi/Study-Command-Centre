import { LayoutDashboard } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { PageContainer } from '../components/PageContainer'
import { TodayTaskCard } from '../components/TodayTaskCard'
import { useAuth } from '../features/auth/AuthProvider'

export function StudentShellPage() {
  const { profile } = useAuth()

  return (
    <PageContainer
      eyebrow="Student dashboard"
      title={`Welcome back, ${profile?.display_name ?? 'Student'}`}
      description="One clear place for today’s work, assessment progress, readiness, and what comes next."
    >
      <div className="space-y-6">
        <TodayTaskCard
          title="Your approved study schedule will appear here"
          description="This is a clearly labeled shell preview. No task, score, or progress has been invented; live dashboard data arrives in Phase 4."
          meta="Platform shell ready · Schedule connection pending"
          placeholder
        />
        <EmptyState
          title="Dashboard data starts in Phase 4"
          description="Assessment progress, readiness, upcoming tasks, and the next-exam countdown will use the seeded database—not placeholder scores."
          icon={LayoutDashboard}
        />
      </div>
    </PageContainer>
  )
}
