import { BarChart3, CheckCircle2, Clock3, FileText, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../features/auth/AuthProvider'
import { useCoachStudentOverview } from '../features/coach/useCoachStudentOverview'
import { calculateReadiness } from '../lib/progress'

export function CoachShellPage() {
  const { profile } = useAuth()
  const { student, overview, loading, error } = useCoachStudentOverview()

  if (loading) return <PageContainer eyebrow="Coach dashboard" title="Loading student evidence"><LoadingState /></PageContainer>
  if (error) return <PageContainer eyebrow="Coach dashboard" title="Dashboard unavailable"><ErrorState message={error} /></PageContainer>
  if (!student) return <PageContainer eyebrow="Coach dashboard" title={`Welcome back, ${profile?.display_name ?? 'Coach'}`}><EmptyState title="No student profile found" description="Create the student account before reviewing academic progress." /></PageContainer>

  const submitted = overview.attempts.filter((attempt) => attempt.status !== 'in_progress')
  const pendingEssays = submitted.filter((attempt) => attempt.essay_word_count > 0 && attempt.essay_score === null)
  const readiness = calculateReadiness(overview.units, overview.attempts)
  const weakTopics = [...new Set(submitted.flatMap((attempt) => attempt.weak_topics_json))]
  const mockProgressions = overview.assessments.map((assessment) => {
    const results = overview.units
      .filter((unit) => unit.assessment_id === assessment.id && unit.unit_type === 'mock')
      .sort((left, right) => Number(left.mock_number) - Number(right.mock_number))
      .flatMap((unit) => {
        const attempt = submitted.find((candidate) => candidate.learning_unit_id === unit.id)
        return attempt ? [{ unit, attempt }] : []
      })
    return { assessment, results }
  }).filter((item) => item.results.length > 0)

  return (
    <PageContainer eyebrow="Coach dashboard" title={`Welcome back, ${profile?.display_name ?? 'Coach'}`} description={`Live progress and readiness evidence for ${student.display_name ?? 'the student'}.`}>
      <div className="space-y-7">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Readiness" value={readiness === undefined ? '—' : `${Math.round(readiness)}%`} helper="Latest eligible results." icon={Target} tone="gold" />
          <StatCard label="Completed units" value={`${overview.completedUnitIds.size}/${overview.units.length}`} helper="Across four assessments." icon={CheckCircle2} tone="teal" />
          <StatCard label="Submitted attempts" value={String(submitted.length)} helper="Full answer history is available." icon={BarChart3} />
          <StatCard label="Essays pending" value={String(pendingEssays.length)} helper="Ready for coach marking." icon={Clock3} tone={pendingEssays.length ? 'gold' : 'teal'} />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-card border border-navy/10 bg-surface p-6 shadow-card"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Essay workflow</p><h2 className="mt-2 text-xl font-bold text-navy">Awaiting review</h2></div><StatusBadge status={pendingEssays.length ? 'pending' : 'complete'} label={`${pendingEssays.length} pending`} /></div><p className="mt-3 text-sm leading-6 text-muted">Open responses beside the supplied model answers, marking points, and mock maximum marks.</p><Link className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-navy px-4 text-sm font-bold text-white hover:bg-navy-800" to="/coach/essays">Review essays</Link></article>
          <article className="rounded-card border border-navy/10 bg-surface p-6 shadow-card"><p className="text-xs font-bold uppercase tracking-wider text-gold-600">Weak-topic evidence</p><h2 className="mt-2 text-xl font-bold text-navy">Current priorities</h2>{weakTopics.length ? <div className="mt-4 flex flex-wrap gap-2">{weakTopics.slice(0, 8).map((topic) => <span key={topic} className="rounded-full bg-gold-50 px-3 py-1.5 text-sm font-semibold text-gold-600">{topic}</span>)}</div> : <p className="mt-3 text-sm leading-6 text-muted">No incorrect-topic evidence has been recorded yet.</p>}</article>
        </section>

        {mockProgressions.length > 0 && <section><h2 className="mb-4 text-xl font-bold text-navy">Mock 1–3 improvement</h2><div className="grid gap-4 lg:grid-cols-2">{mockProgressions.map(({ assessment, results }) => <article key={assessment.id} className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><h3 className="font-bold text-navy">{assessment.title}</h3><div className="mt-4 flex flex-wrap gap-3">{results.map(({ unit, attempt }, index) => { const score = attempt.total_percentage ?? attempt.objective_percentage; const previous = index > 0 ? results[index - 1].attempt.total_percentage ?? results[index - 1].attempt.objective_percentage : undefined; return <div key={attempt.id} className="min-w-28 flex-1 rounded-xl bg-navy-50 p-3"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Mock {unit.mock_number}</p><p className="mt-1 text-xl font-bold text-navy">{score}%</p><p className="mt-1 text-xs text-muted">{attempt.total_percentage === null ? 'Objective pending essays' : previous === undefined ? 'Starting point' : `${score - previous >= 0 ? '+' : ''}${Math.round((score - previous) * 100) / 100} points`}</p></div>})}</div></article>)}</div></section>}

        {submitted.length > 0 && <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-navy">Recent attempts</h2><Link className="text-sm font-bold text-teal-700 hover:text-teal-800" to="/coach/attempts">View all</Link></div><div className="space-y-3">{submitted.slice(0, 4).map((attempt) => { const unit = overview.units.find((candidate) => candidate.id === attempt.learning_unit_id); return <Link key={attempt.id} to={`/coach/attempts/${attempt.id}`} className="flex items-center justify-between gap-4 rounded-card border border-navy/10 bg-surface p-4 shadow-card hover:border-teal/30"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy"><FileText size={19} /></span><div className="min-w-0"><p className="truncate font-bold text-navy">{unit?.title ?? 'Attempt'}</p><p className="mt-1 text-xs text-muted">Attempt {attempt.attempt_number} · {attempt.mcq_correct}/{attempt.mcq_total} objective</p></div></div><StatusBadge status={attempt.essay_word_count > 0 && attempt.essay_score === null ? 'pending' : 'complete'} label={attempt.essay_word_count > 0 && attempt.essay_score === null ? 'Marking pending' : 'Reviewed'} /></Link> })}</div></section>}
      </div>
    </PageContainer>
  )
}
