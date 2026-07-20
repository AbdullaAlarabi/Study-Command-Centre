import { ArrowRight, Check, LockKeyhole, NotebookTabs } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../features/auth/AuthProvider'
import { useStudentOverview } from '../features/student/useStudentOverview'
import { formatShortDate } from '../lib/date'
import { getRoadmapUnitStatuses } from '../lib/progress'

export function RevisionCentrePage() {
  const { user } = useAuth()
  const overview = useStudentOverview(user?.id)
  const courseById = new Map(overview.courses.map((course) => [course.id, course]))

  if (overview.loading) {
    return <PageContainer eyebrow="Revision centre" title="Loading revision packs"><LoadingState /></PageContainer>
  }

  if (overview.error) {
    return <PageContainer eyebrow="Revision centre" title="Revision centre unavailable"><ErrorState message={overview.error} onRetry={() => void overview.reload()} /></PageContainer>
  }

  return (
    <PageContainer
      eyebrow="Revision centre"
      title="Bring each assessment together"
      description="Revision unlocks after all three chapter quiz gates pass. Review the concise pack, practise weak topics, then complete revision to unlock Mock 1."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {overview.assessments.map((assessment) => {
          const course = courseById.get(assessment.course_id)
          const units = overview.units.filter((unit) => unit.assessment_id === assessment.id)
          const revisionUnit = units.find((unit) => unit.unit_type === 'revision')
          if (!revisionUnit) return null
          const status = getRoadmapUnitStatuses(units, overview.attempts, overview.manuallyCompletedUnitIds).get(revisionUnit.id) ?? 'locked'
          const navigable = status === 'current' || status === 'completed'

          return (
            <article key={revisionUnit.id} className={`rounded-card border p-5 shadow-card sm:p-6 ${status === 'completed' ? 'border-teal/20 bg-teal-50' : status === 'current' ? 'border-navy bg-surface' : 'border-navy/10 bg-slate-50/80'}`}>
              <div className="flex items-start justify-between gap-4">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${status === 'completed' ? 'bg-teal text-white' : status === 'current' ? 'bg-navy text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {status === 'completed' ? <Check aria-hidden="true" size={21} strokeWidth={3} /> : status === 'current' ? <NotebookTabs aria-hidden="true" size={21} /> : <LockKeyhole aria-hidden="true" size={19} />}
                </span>
                <StatusBadge status={status === 'completed' ? 'complete' : status === 'current' ? 'on-track' : 'locked'} label={status === 'current' ? 'Ready to revise' : undefined} />
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{course?.code ?? 'Course'} · {assessment.assessment_type}</p>
              <h2 className="mt-1 text-xl font-bold text-navy">{revisionUnit.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{revisionUnit.description}</p>
              <p className="mt-4 text-xs font-semibold text-muted">Exam: {formatShortDate(assessment.exam_date)}</p>
              {navigable ? (
                <Link className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy px-4 text-sm font-bold text-white hover:bg-navy-800" to={`/student/revision/${revisionUnit.id}`}>
                  {status === 'completed' ? 'Review revision' : 'Open revision pack'} <ArrowRight aria-hidden="true" size={17} />
                </Link>
              ) : (
                <div className="mt-6 rounded-xl border border-navy/10 bg-white/70 px-4 py-3 text-center text-sm font-semibold text-muted">Pass all three chapter gates first</div>
              )}
            </article>
          )
        })}
      </div>
    </PageContainer>
  )
}
