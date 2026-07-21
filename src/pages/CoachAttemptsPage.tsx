import { ClipboardList, MessageSquareText } from 'lucide-react'
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

export function CoachAttemptsPage({ essaysOnly = false }: { essaysOnly?: boolean }) {
  const { student, overview, loading, error } = useCoachStudentOverview()
  if (loading) return <PageContainer eyebrow="Coach" title="Loading attempts"><LoadingState /></PageContainer>
  if (error) return <PageContainer eyebrow="Coach" title="Attempts unavailable"><ErrorState message={error} /></PageContainer>

  const attempts = overview.attempts.filter((attempt) => attempt.status !== 'in_progress' && (!essaysOnly || attempt.essay_word_count > 0))
  const unitById = new Map(overview.units.map((unit) => [unit.id, unit]))
  return (
    <PageContainer eyebrow={essaysOnly ? 'Essay review' : 'Quiz and mock attempts'} title={essaysOnly ? 'Essays awaiting review' : 'Attempt history'} description={`Submitted academic evidence for ${student?.display_name ?? 'the student'}.`}>
      {attempts.length === 0 ? <EmptyState title={essaysOnly ? 'No essays submitted' : 'No attempts submitted'} description="This is a live empty state; no placeholder results are shown." icon={essaysOnly ? MessageSquareText : ClipboardList} /> : <div className="space-y-4">{attempts.map((attempt) => { const unit = unitById.get(attempt.learning_unit_id); const pending = attempt.essay_word_count > 0 && attempt.essay_score === null; return <Link key={attempt.id} className="block rounded-card border border-navy/10 bg-surface p-5 shadow-card hover:border-teal/30" to={`/coach/attempts/${attempt.id}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{unit?.unit_type ?? 'Attempt'} · Attempt {attempt.attempt_number}</p><h2 className="mt-2 text-lg font-bold text-navy">{unit?.title ?? 'Saved attempt'}</h2><p className="mt-2 text-sm text-muted">{formatDateTime(attempt.submitted_at ?? attempt.started_at)} · {attempt.mcq_correct}/{attempt.mcq_total} objective ({attempt.objective_percentage}%)</p></div><StatusBadge status={pending ? 'pending' : attempt.status === 'failed' ? 'needs-attention' : 'complete'} label={pending ? 'Essay marking pending' : attempt.total_percentage === null ? attempt.status : `${attempt.total_percentage}% total`} /></div>{attempt.weak_topics_json.length > 0 && <p className="mt-4 text-sm text-gold-600"><strong>Weak topics:</strong> {attempt.weak_topics_json.join(', ')}</p>}</Link>})}</div>}
    </PageContainer>
  )
}
