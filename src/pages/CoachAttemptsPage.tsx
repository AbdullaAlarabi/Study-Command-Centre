import { ClipboardList, Filter, MessageSquareText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { StatusBadge } from '../components/StatusBadge'
import { useCoachStudentOverview } from '../features/coach/useCoachStudentOverview'

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

const fieldClass = 'min-h-11 rounded-xl border border-navy/15 bg-white px-3 text-sm text-navy outline-none focus:border-teal'

export function CoachAttemptsPage({ essaysOnly = false }: { essaysOnly?: boolean }) {
  const { student, overview, loading, error } = useCoachStudentOverview()
  const [courseId, setCourseId] = useState('all')
  const [assessmentId, setAssessmentId] = useState('all')
  const [unitType, setUnitType] = useState('all')
  const [status, setStatus] = useState(essaysOnly ? 'pending-essay' : 'all')
  const [fromDate, setFromDate] = useState('')
  const [throughDate, setThroughDate] = useState('')

  const assessmentById = useMemo(() => new Map(overview.assessments.map((assessment) => [assessment.id, assessment])), [overview.assessments])
  const unitById = useMemo(() => new Map(overview.units.map((unit) => [unit.id, unit])), [overview.units])
  const filteredAttempts = useMemo(() => overview.attempts.filter((attempt) => {
    if (attempt.status === 'in_progress') return false
    if (essaysOnly && attempt.essay_word_count === 0) return false
    const unit = unitById.get(attempt.learning_unit_id)
    const assessment = assessmentById.get(attempt.assessment_id)
    if (courseId !== 'all' && assessment?.course_id !== courseId) return false
    if (assessmentId !== 'all' && attempt.assessment_id !== assessmentId) return false
    if (unitType !== 'all' && unit?.unit_type !== unitType) return false
    if (status === 'pending-essay' && !(attempt.essay_word_count > 0 && attempt.essay_score === null)) return false
    if (status === 'reviewed' && attempt.essay_score === null) return false
    if (!['all', 'pending-essay', 'reviewed'].includes(status) && attempt.status !== status) return false
    const date = (attempt.submitted_at ?? attempt.started_at).slice(0, 10)
    if (fromDate && date < fromDate) return false
    if (throughDate && date > throughDate) return false
    return true
  }), [assessmentById, assessmentId, courseId, essaysOnly, fromDate, overview.attempts, status, throughDate, unitById, unitType])

  if (loading) return <PageContainer eyebrow="Coach" title="Loading attempts"><LoadingState /></PageContainer>
  if (error) return <PageContainer eyebrow="Coach" title="Attempts unavailable"><ErrorState message={error} /></PageContainer>

  return (
    <PageContainer eyebrow={essaysOnly ? 'Essay review' : 'Quiz and mock attempts'} title={essaysOnly ? 'Essays awaiting review' : 'Attempt history'} description={`Submitted academic evidence for ${student?.display_name ?? 'the student'}.`}>
      <div className="space-y-6">
        <section className="rounded-card border border-navy/10 bg-surface p-5 shadow-card">
          <div className="flex items-center gap-2"><Filter size={18} className="text-teal-700" /><h2 className="font-bold text-navy">Filters</h2></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">Course<select className={fieldClass} value={courseId} onChange={(event) => { setCourseId(event.target.value); setAssessmentId('all') }}><option value="all">All courses</option>{overview.courses.map((course) => <option key={course.id} value={course.id}>{course.code}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">Assessment<select className={fieldClass} value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)}><option value="all">All assessments</option>{overview.assessments.filter((assessment) => courseId === 'all' || assessment.course_id === courseId).map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">Unit type<select className={fieldClass} value={unitType} onChange={(event) => setUnitType(event.target.value)}><option value="all">All unit types</option><option value="chapter">Chapter</option><option value="revision">Revision</option><option value="mock">Mock</option></select></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">Status<select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="pending-essay">Essay pending</option><option value="reviewed">Essay reviewed</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="submitted">Submitted</option></select></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">From<input className={fieldClass} type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">Through<input className={fieldClass} type="date" value={throughDate} onChange={(event) => setThroughDate(event.target.value)} /></label>
          </div>
          <p className="mt-4 text-sm text-muted">Showing {filteredAttempts.length} of {overview.attempts.filter((attempt) => attempt.status !== 'in_progress').length} submitted attempts.</p>
        </section>

        {filteredAttempts.length === 0 ? <EmptyState title={essaysOnly ? 'No essays match these filters' : 'No attempts match these filters'} description="This is a live empty state; no placeholder results are shown." icon={essaysOnly ? MessageSquareText : ClipboardList} /> : <div className="space-y-4">{filteredAttempts.map((attempt) => { const unit = unitById.get(attempt.learning_unit_id); const pending = attempt.essay_word_count > 0 && attempt.essay_score === null; return <Link key={attempt.id} className="block rounded-card border border-navy/10 bg-surface p-5 shadow-card hover:border-teal/30" to={`/coach/attempts/${attempt.id}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{unit?.unit_type ?? 'Attempt'} · Attempt {attempt.attempt_number}</p><h2 className="mt-2 text-lg font-bold text-navy">{unit?.title ?? 'Saved attempt'}</h2><p className="mt-2 text-sm text-muted">{formatDateTime(attempt.submitted_at ?? attempt.started_at)} · {attempt.mcq_correct}/{attempt.mcq_total} objective ({attempt.objective_percentage}%) · {attempt.duration_seconds === null ? 'No duration' : `${Math.floor(attempt.duration_seconds / 60)}m ${attempt.duration_seconds % 60}s`}</p></div><StatusBadge status={pending ? 'pending' : attempt.status === 'failed' ? 'needs-attention' : 'complete'} label={pending ? 'Essay marking pending' : attempt.total_percentage === null ? attempt.status : `${attempt.total_percentage}% total`} /></div>{attempt.weak_topics_json.length > 0 && <p className="mt-4 text-sm text-gold-600"><strong>Weak topics:</strong> {attempt.weak_topics_json.join(', ')}</p>}</Link>})}</div>}
      </div>
    </PageContainer>
  )
}
