import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { CoachScoreCharts } from '../components/CoachScoreCharts'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { ProgressBar } from '../components/ProgressBar'
import { StatCard } from '../components/StatCard'
import { StatusBadge, type StatusTone } from '../components/StatusBadge'
import { useAuth } from '../features/auth/AuthProvider'
import { useCoachStudentOverview } from '../features/coach/useCoachStudentOverview'
import {
  calculateOverallCompletion,
  getDaysSinceLatestActivity,
  getMockScoreComparison,
  getQuizScoreTrend,
  getWeakTopicRanking,
} from '../lib/analytics'
import { getTodayString } from '../lib/date'
import {
  calculateOverdueTaskCount,
  calculateReadiness,
  calculateRiskStatus,
  calculateWeightedAssessmentCompletion,
  getDaysUntil,
  getNextAssessment,
  type RiskStatus,
} from '../lib/progress'

const riskTone: Record<RiskStatus, StatusTone> = {
  'on-track': 'on-track',
  'needs-attention': 'needs-attention',
  behind: 'behind',
  'high-risk': 'high-risk',
  'not-started': 'pending',
}

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
}

export function CoachShellPage() {
  const { profile } = useAuth()
  const { student, overview, loading, error } = useCoachStudentOverview()

  if (loading) return <PageContainer eyebrow="Coach dashboard" title="Loading student evidence"><LoadingState /></PageContainer>
  if (error) return <PageContainer eyebrow="Coach dashboard" title="Dashboard unavailable"><ErrorState message={error} /></PageContainer>
  if (!student) return <PageContainer eyebrow="Coach dashboard" title={`Welcome back, ${profile?.display_name ?? 'Coach'}`}><EmptyState title="No student profile found" description="Create the student account before reviewing academic progress." /></PageContainer>

  const today = getTodayString()
  const submitted = overview.attempts.filter((attempt) => attempt.status !== 'in_progress')
  const pendingEssays = submitted.filter((attempt) => attempt.essay_word_count > 0 && attempt.essay_score === null)
  const readiness = calculateReadiness(overview.units, overview.attempts)
  const overallCompletion = calculateOverallCompletion(overview.assessments, overview.units, overview.attempts, overview.manuallyCompletedUnitIds)
  const weakTopics = getWeakTopicRanking(submitted)
  const daysSinceActivity = getDaysSinceLatestActivity(overview.activity[0]?.created_at)
  const overdueTasks = calculateOverdueTaskCount(overview.tasks, overview.completedTaskIds, today)
  const nextAssessment = getNextAssessment(overview.assessments, today)
  const risk = calculateRiskStatus({
    readiness,
    overdueTaskCount: overdueTasks,
    daysUntilExam: nextAssessment ? getDaysUntil(nextAssessment.exam_date, today) : undefined,
    daysSinceActivity,
  })
  const courseById = new Map(overview.courses.map((course) => [course.id, course]))
  const quizTrend = getQuizScoreTrend(overview.attempts, overview.units)
  const mockComparison = getMockScoreComparison(overview.assessments, overview.attempts, overview.units)

  return (
    <PageContainer
      eyebrow="Coach dashboard"
      title={`Welcome back, ${profile?.display_name ?? 'Coach'}`}
      description={`Live completion, readiness, attempts, and activity for ${student.display_name ?? 'the student'}.`}
      actions={<StatusBadge status={riskTone[risk]} label={readable(risk)} />}
    >
      <div className="space-y-7">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Overall completion" value={`${Math.round(overallCompletion)}%`} helper="Equal average of four assessment paths." icon={CheckCircle2} tone="teal" />
          <StatCard label="Overall readiness" value={readiness === undefined ? '—' : `${Math.round(readiness)}%`} helper="Latest eligible chapter and mock evidence." icon={Target} tone="gold" />
          <StatCard label="Overdue tasks" value={String(overdueTasks)} helper="Approved schedule tasks before today." icon={AlertTriangle} tone={overdueTasks ? 'risk' : 'teal'} />
          <StatCard label="Days since activity" value={daysSinceActivity === undefined ? '—' : String(daysSinceActivity)} helper="Based on the latest recorded student action." icon={CalendarClock} tone={daysSinceActivity !== undefined && daysSinceActivity >= 3 ? 'risk' : 'navy'} />
          <StatCard label="Submitted attempts" value={String(submitted.length)} helper="Full answer history is available." icon={BarChart3} />
          <StatCard label="Essays awaiting review" value={String(pendingEssays.length)} helper="Objective scores remain separate until marked." icon={Clock3} tone={pendingEssays.length ? 'gold' : 'teal'} />
        </section>

        <section>
          <div className="mb-4"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Four assessment blocks</p><h2 className="mt-1 text-xl font-bold text-navy">Assessment progress</h2></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overview.assessments.map((assessment) => {
              const units = overview.units.filter((unit) => unit.assessment_id === assessment.id)
              const completion = calculateWeightedAssessmentCompletion(units, overview.attempts, overview.manuallyCompletedUnitIds)
              const assessmentReadiness = calculateReadiness(units, overview.attempts)
              return <article key={assessment.id} className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{courseById.get(assessment.course_id)?.code} · {assessment.assessment_type}</p><h3 className="mt-2 font-bold text-navy">{assessment.title}</h3><div className="mt-5 space-y-4"><ProgressBar label="Completion" value={completion} /><ProgressBar label="Readiness" value={assessmentReadiness} tone="gold" /></div></article>
            })}
          </div>
        </section>

        <CoachScoreCharts quizTrend={quizTrend} mockComparison={mockComparison} />

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-card border border-navy/10 bg-surface p-6 shadow-card"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Essay workflow</p><h2 className="mt-2 text-xl font-bold text-navy">Awaiting review</h2></div><StatusBadge status={pendingEssays.length ? 'pending' : 'complete'} label={`${pendingEssays.length} pending`} /></div><p className="mt-3 text-sm leading-6 text-muted">Open responses beside supplied model answers, marking points, and mock maximum marks.</p><Link className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-navy px-4 text-sm font-bold text-white hover:bg-navy-800" to="/coach/essays">Review essays</Link></article>
          <article className="rounded-card border border-navy/10 bg-surface p-6 shadow-card"><p className="text-xs font-bold uppercase tracking-wider text-gold-600">Weak-topic evidence</p><h2 className="mt-2 text-xl font-bold text-navy">Top weak topics</h2>{weakTopics.length ? <ol className="mt-4 space-y-2">{weakTopics.map((item, index) => <li key={item.topic} className="flex items-center justify-between gap-3 rounded-xl bg-gold-50 px-4 py-3 text-sm"><span className="font-semibold text-navy">{index + 1}. {item.topic}</span><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gold-600">{item.count}×</span></li>)}</ol> : <p className="mt-3 text-sm leading-6 text-muted">No incorrect-topic evidence has been recorded yet.</p>}</article>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-navy">Recent attempts</h2><Link className="text-sm font-bold text-teal-700 hover:text-teal-800" to="/coach/attempts">View all</Link></div>
          {submitted.length ? <div className="space-y-3">{submitted.slice(0, 4).map((attempt) => { const unit = overview.units.find((candidate) => candidate.id === attempt.learning_unit_id); return <Link key={attempt.id} to={`/coach/attempts/${attempt.id}`} className="flex items-center justify-between gap-4 rounded-card border border-navy/10 bg-surface p-4 shadow-card hover:border-teal/30"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy"><FileText size={19} /></span><div className="min-w-0"><p className="truncate font-bold text-navy">{unit?.title ?? 'Attempt'}</p><p className="mt-1 text-xs text-muted">Attempt {attempt.attempt_number} · {attempt.mcq_correct}/{attempt.mcq_total} objective</p></div></div><StatusBadge status={attempt.essay_word_count > 0 && attempt.essay_score === null ? 'pending' : 'complete'} label={attempt.essay_word_count > 0 && attempt.essay_score === null ? 'Marking pending' : 'Reviewed'} /></Link> })}</div> : <EmptyState title="No submitted attempts" description="Student submissions will appear here without placeholder scores." />}
        </section>

        <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-navy">Recent activity</h2><Link className="text-sm font-bold text-teal-700 hover:text-teal-800" to="/coach/activity">Full history</Link></div>{overview.activity.length ? <div className="overflow-x-auto rounded-card border border-navy/10 bg-surface shadow-card"><table className="w-full min-w-[42rem] text-left text-sm"><thead className="bg-navy-50 text-navy"><tr><th className="p-4">Action</th><th className="p-4">Entity</th><th className="p-4">Time</th></tr></thead><tbody>{overview.activity.slice(0, 8).map((entry) => <tr key={entry.id} className="border-t border-navy/10"><td className="p-4 font-semibold text-navy">{readable(entry.action_type)}</td><td className="p-4 text-muted">{readable(entry.entity_type)}</td><td className="p-4 text-muted">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.created_at))}</td></tr>)}</tbody></table></div> : <EmptyState title="No activity recorded" description="Starts, submissions, reviews, resets, unlocks, and task completions will appear here." />}</section>
      </div>
    </PageContainer>
  )
}
