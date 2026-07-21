import { LockKeyhole } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { PageContainer } from '../../components/PageContainer'
import { getRoadmapUnitStatuses } from '../../lib/progress'
import { useAuth } from '../auth/AuthProvider'
import { useParams } from 'react-router-dom'
import { useStudentOverview } from './useStudentOverview'

export function LearningUnitGate({ children }: { children: ReactNode }) {
  const { unitId } = useParams()
  const { user, profile } = useAuth()
  const overview = useStudentOverview(profile?.role === 'student' ? user?.id : undefined)

  useEffect(() => {
    if (profile?.role === 'student' && user?.id && unitId) void overview.reload()
    // A passed attempt is saved inside the child route. Refresh the outer gate
    // whenever the route advances so it never evaluates the next unit against
    // the pre-submission snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role, unitId, user?.id])

  if (profile?.role === 'coach') return children

  if (overview.loading) {
    return (
      <PageContainer eyebrow="Learning unit" title="Checking access">
        <LoadingState />
      </PageContainer>
    )
  }

  if (overview.error) {
    return (
      <PageContainer eyebrow="Learning unit" title="Access check unavailable">
        <ErrorState message={overview.error} onRetry={() => void overview.reload()} />
      </PageContainer>
    )
  }

  const unit = overview.units.find((candidate) => candidate.id === unitId)
  if (!unit) {
    return (
      <PageContainer eyebrow="Learning unit" title="Unit not found">
        <EmptyState
          title="This learning unit does not exist"
          description="Return to the roadmap and choose a valid unit."
          actionLabel="Open roadmap"
          actionTo="/student/roadmap"
        />
      </PageContainer>
    )
  }

  const assessmentUnits = overview.units.filter(
    (candidate) => candidate.assessment_id === unit.assessment_id,
  )
  const status = getRoadmapUnitStatuses(
    assessmentUnits,
    overview.attempts,
    overview.manuallyCompletedUnitIds,
  ).get(unit.id)

  if (status === 'locked' || status === 'upcoming') {
    return (
      <PageContainer eyebrow="Learning unit" title="This unit is locked">
        <EmptyState
          title="Finish the current step first"
          description="Study Command Centre unlocks chapters, revision, and mocks sequentially. The coach can bypass this lock if support is required."
          icon={LockKeyhole}
          actionLabel="Open roadmap"
          actionTo="/student/roadmap"
        />
      </PageContainer>
    )
  }

  return children
}
