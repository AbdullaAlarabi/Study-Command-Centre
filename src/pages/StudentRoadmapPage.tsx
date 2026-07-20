import {
  ArrowRight,
  Check,
  CircleDot,
  Clock3,
  LockKeyhole,
  Map as RouteMap,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { ProgressBar } from '../components/ProgressBar'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../features/auth/AuthProvider'
import { useStudentOverview } from '../features/student/useStudentOverview'
import { formatShortDate } from '../lib/date'
import {
  calculateReadiness,
  calculateWeightedAssessmentCompletion,
  getRoadmapUnitStatuses,
  type RoadmapUnitStatus,
} from '../lib/progress'
import type { LearningUnit } from '../types/database'

const unitStateStyle: Record<
  RoadmapUnitStatus,
  { card: string; icon: string; label: string }
> = {
  completed: {
    card: 'border-teal/25 bg-teal-50',
    icon: 'bg-teal text-white',
    label: 'Complete',
  },
  current: {
    card: 'border-navy bg-white shadow-card',
    icon: 'bg-navy text-white',
    label: 'Current',
  },
  upcoming: {
    card: 'border-gold/25 bg-gold-50',
    icon: 'bg-gold text-white',
    label: 'Up next · locked',
  },
  locked: {
    card: 'border-navy/10 bg-slate-50/80',
    icon: 'bg-slate-200 text-slate-500',
    label: 'Locked',
  },
}

function unitPath(unit: LearningUnit) {
  if (unit.unit_type === 'chapter') return `/student/chapter/${unit.id}`
  if (unit.unit_type === 'revision') return `/student/revision/${unit.id}`
  return `/student/mock/${unit.id}`
}

function UnitIcon({ status }: { status: RoadmapUnitStatus }) {
  if (status === 'completed') return <Check aria-hidden="true" size={19} strokeWidth={3} />
  if (status === 'current') return <CircleDot aria-hidden="true" size={19} />
  if (status === 'upcoming') return <Clock3 aria-hidden="true" size={18} />
  return <LockKeyhole aria-hidden="true" size={17} />
}

export function StudentRoadmapPage() {
  const { assessmentId } = useParams()
  const { user, profile } = useAuth()
  const overview = useStudentOverview(user?.id)
  const courseById = new Map(overview.courses.map((course) => [course.id, course]))
  const visibleAssessments = assessmentId
    ? overview.assessments.filter((assessment) => assessment.id === assessmentId)
    : overview.assessments

  if (overview.loading) {
    return (
      <PageContainer eyebrow="Assessment roadmap" title="Loading your exam paths">
        <LoadingState />
      </PageContainer>
    )
  }

  if (overview.error && overview.assessments.length === 0) {
    return (
      <PageContainer eyebrow="Assessment roadmap" title="Roadmap unavailable">
        <ErrorState message={overview.error} onRetry={() => void overview.reload()} />
      </PageContainer>
    )
  }

  return (
    <PageContainer
      eyebrow="Assessment roadmap"
      title={assessmentId ? 'Assessment learning path' : 'Your route to each exam'}
      description="Finish each step in order. A chapter unlocks only after its quiz gate passes; revision and mocks follow sequentially."
      actions={
        assessmentId ? (
          <Link
            className="flex min-h-11 items-center rounded-xl border border-navy/15 bg-white px-4 text-sm font-semibold text-navy hover:bg-navy-50"
            to="/student/roadmap"
          >
            All assessments
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {overview.error && <ErrorState message={overview.error} onRetry={() => void overview.reload()} />}
        {visibleAssessments.map((assessment) => {
          const course = courseById.get(assessment.course_id)
          const units = overview.units
            .filter((unit) => unit.assessment_id === assessment.id)
            .sort((a, b) => a.unlock_order - b.unlock_order)
          const statuses = getRoadmapUnitStatuses(
            units,
            overview.attempts,
            overview.manuallyCompletedUnitIds,
          )
          const completion = calculateWeightedAssessmentCompletion(
            units,
            overview.attempts,
            overview.manuallyCompletedUnitIds,
          )
          const readiness = calculateReadiness(units, overview.attempts)

          return (
            <section
              key={assessment.id}
              className="overflow-hidden rounded-card border border-navy/10 bg-surface shadow-card"
            >
              <div className="border-b border-navy/10 p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                      {course?.code ?? 'Course'} · {assessment.assessment_type}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-navy sm:text-2xl">
                      {assessment.title}
                    </h2>
                    <p className="mt-2 text-sm text-muted">
                      Exam: {formatShortDate(assessment.exam_date)}
                    </p>
                  </div>
                  <div className="grid min-w-56 gap-3 sm:w-64">
                    <ProgressBar value={completion} label="Completion" />
                    <ProgressBar value={readiness} label="Readiness" tone="gold" />
                  </div>
                </div>
              </div>

              <ol className="grid gap-3 p-4 sm:p-6 md:grid-cols-7 md:gap-2" aria-label={`${assessment.title} learning units`}>
                {units.map((unit, index) => {
                  const status = statuses.get(unit.id) ?? 'locked'
                  const navigable =
                    profile?.role === 'coach' ||
                    status === 'completed' ||
                    status === 'current'
                  const style = unitStateStyle[status]
                  const content = (
                    <>
                      <div className="flex items-center gap-3 md:flex-col md:items-start">
                        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${style.icon}`}>
                          <UnitIcon status={status} />
                        </span>
                        <div className="min-w-0 flex-1 md:w-full">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                            Step {index + 1}
                          </p>
                          <h3 className="mt-1 text-sm font-bold leading-5 text-navy">
                            {unit.short_title}
                          </h3>
                        </div>
                        {navigable && (
                          <ArrowRight
                            aria-hidden="true"
                            className="ml-auto shrink-0 text-teal-700 md:hidden"
                            size={18}
                          />
                        )}
                      </div>
                      <div className="mt-3 md:mt-4">
                        <StatusBadge
                          status={
                            status === 'completed'
                              ? 'complete'
                              : status === 'current'
                                ? 'on-track'
                                : status === 'upcoming'
                                  ? 'pending'
                                  : 'locked'
                          }
                          label={
                            profile?.role === 'coach' &&
                            (status === 'locked' || status === 'upcoming')
                              ? 'Coach access'
                              : style.label
                          }
                        />
                      </div>
                    </>
                  )

                  return (
                    <li key={unit.id} className="relative">
                      {index < units.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute left-5 top-12 h-[calc(100%+0.75rem)] w-px bg-navy/10 md:left-[calc(50%+1.5rem)] md:top-5 md:h-px md:w-[calc(100%-1.25rem)]"
                        />
                      )}
                      {navigable ? (
                        <Link
                          className={`relative block min-h-full rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-card ${style.card}`}
                          to={unitPath(unit)}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          aria-disabled="true"
                          className={`relative min-h-full rounded-xl border p-4 ${style.card}`}
                        >
                          {content}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}

        {visibleAssessments.length === 0 && (
          <div className="rounded-card border border-dashed border-navy/20 bg-white/60 p-10 text-center">
            <RouteMap className="mx-auto text-muted" aria-hidden="true" />
            <p className="mt-4 font-bold text-navy">Assessment not found</p>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
