import { BarChart3, Clock3, Target, TrendingUp } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../features/auth/AuthProvider'
import { useStudentOverview } from '../features/student/useStudentOverview'
import { calculateReadiness } from '../lib/progress'

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return '—'
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}m ${remainder}s`
}

export function StudentResultsPage() {
  const { user } = useAuth()
  const overview = useStudentOverview(user?.id)
  const submitted = overview.attempts.filter((attempt) => attempt.status !== 'in_progress')
  const unitById = new Map(overview.units.map((unit) => [unit.id, unit]))
  const mockAttempts = submitted.filter((attempt) => unitById.get(attempt.learning_unit_id)?.unit_type === 'mock')
  const pendingEssays = submitted.filter((attempt) => attempt.essay_word_count > 0 && attempt.essay_score === null).length
  const readiness = calculateReadiness(overview.units, overview.attempts)
  const weakTopics = [...new Set(submitted.flatMap((attempt) => attempt.weak_topics_json))]
  const mockProgressions = overview.assessments.map((assessment) => {
    const mocks = overview.units.filter((unit) => unit.assessment_id === assessment.id && unit.unit_type === 'mock').sort((left, right) => Number(left.mock_number) - Number(right.mock_number))
    const results = mocks.flatMap((unit) => {
      const latest = mockAttempts.find((attempt) => attempt.learning_unit_id === unit.id)
      return latest ? [{ unit, attempt: latest }] : []
    })
    return { assessment, results }
  }).filter((item) => item.results.length > 0)

  if (overview.loading) return <PageContainer eyebrow="Results" title="Loading your evidence"><LoadingState /></PageContainer>
  if (overview.error) return <PageContainer eyebrow="Results" title="Results unavailable"><ErrorState message={overview.error} onRetry={() => void overview.reload()} /></PageContainer>

  return (
    <PageContainer eyebrow="Results and analytics" title="Your evidence of progress" description="Saved scores, duration, weak topics, and coach-marked totals from your real attempts.">
      {submitted.length === 0 ? (
        <EmptyState title="No submitted attempts yet" description="Complete a chapter quiz, mixed practice, or mock exam to create your first result." icon={BarChart3} actionLabel="Open roadmap" actionTo="/student/roadmap" />
      ) : (
        <div className="space-y-7">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Submitted attempts" value={String(submitted.length)} helper="Chapter quizzes, practice, and mocks." icon={BarChart3} tone="teal" />
            <StatCard label="Readiness" value={readiness === undefined ? '—' : `${Math.round(readiness)}%`} helper="Latest chapter and mock evidence." icon={Target} tone="gold" />
            <StatCard label="Mock attempts" value={String(mockAttempts.length)} helper="Across all four assessments." icon={TrendingUp} />
            <StatCard label="Essay marking pending" value={String(pendingEssays)} helper="Objective scores remain clearly separate." icon={Clock3} tone={pendingEssays ? 'gold' : 'teal'} />
          </section>

          {weakTopics.length > 0 && <section className="rounded-card border border-gold/20 bg-gold-50 p-5"><h2 className="font-bold text-navy">Weak topics from incorrect answers</h2><div className="mt-3 flex flex-wrap gap-2">{weakTopics.map((topic) => <span key={topic} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gold-600">{topic}</span>)}</div></section>}

          {mockProgressions.length > 0 && <section className="space-y-4"><h2 className="text-xl font-bold text-navy">Mock 1–3 progression</h2>{mockProgressions.map(({ assessment, results }) => <article key={assessment.id} className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><h3 className="font-bold text-navy">{assessment.title}</h3><div className="mt-4 grid gap-3 sm:grid-cols-3">{results.map(({ unit, attempt }, index) => { const score = attempt.total_percentage ?? attempt.objective_percentage; const previous = index > 0 ? results[index - 1].attempt.total_percentage ?? results[index - 1].attempt.objective_percentage : undefined; const delta = previous === undefined ? undefined : Math.round((score - previous) * 100) / 100; return <div key={attempt.id} className="rounded-xl bg-navy-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Mock {unit.mock_number}</p><p className="mt-2 text-2xl font-bold text-navy">{score}%</p><p className="mt-1 text-xs text-muted">{attempt.total_percentage === null && attempt.essay_word_count > 0 ? 'Objective only · essays pending' : delta === undefined ? 'Starting point' : `${delta >= 0 ? '+' : ''}${delta} points vs prior mock`}</p></div>})}</div></article>)}</section>}

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-navy">Attempt history</h2>
            {submitted.map((attempt) => {
              const unit = unitById.get(attempt.learning_unit_id)
              const hasEssay = attempt.essay_word_count > 0
              return (
                <article key={attempt.id} className="rounded-card border border-navy/10 bg-surface p-5 shadow-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{unit?.unit_type ?? 'Attempt'} · Attempt {attempt.attempt_number}</p><h3 className="mt-2 text-lg font-bold text-navy">{unit?.title ?? 'Saved attempt'}</h3><p className="mt-2 text-sm text-muted">{formatDateTime(attempt.submitted_at ?? attempt.started_at)} · {formatDuration(attempt.duration_seconds)}</p></div>
                    {hasEssay && attempt.essay_score === null ? <StatusBadge status="pending" label="Objective available · essays pending" /> : <StatusBadge status={attempt.status === 'failed' ? 'needs-attention' : 'complete'} label={attempt.total_percentage === null ? `${attempt.objective_percentage}% objective` : `${attempt.total_percentage}% total`} />}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3"><p className="rounded-xl bg-navy-50 p-3 text-sm text-slate-700"><strong>Objective:</strong> {attempt.mcq_correct}/{attempt.mcq_total} ({attempt.objective_percentage}%)</p><p className="rounded-xl bg-navy-50 p-3 text-sm text-slate-700"><strong>Essay:</strong> {attempt.essay_score === null ? (hasEssay ? 'Marking pending' : 'Not applicable') : `${attempt.essay_score}%`}</p><p className="rounded-xl bg-navy-50 p-3 text-sm text-slate-700"><strong>Total:</strong> {attempt.total_percentage === null ? 'Pending / not applicable' : `${attempt.total_percentage}%`}</p></div>
                </article>
              )
            })}
          </section>
        </div>
      )}
    </PageContainer>
  )
}
