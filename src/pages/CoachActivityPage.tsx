import { Activity } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { useCoachStudentOverview } from '../features/coach/useCoachStudentOverview'

function label(value: string) { return value.replace(/_/g, ' ').replace(/^./, (letter: string) => letter.toUpperCase()) }

export function CoachActivityPage() {
  const { student, overview, loading, error } = useCoachStudentOverview()
  if (loading) return <PageContainer eyebrow="Coach" title="Loading activity"><LoadingState /></PageContainer>
  if (error) return <PageContainer eyebrow="Coach" title="Activity unavailable"><ErrorState message={error} /></PageContainer>
  return <PageContainer eyebrow="Activity" title="Recent student activity" description={`Starts, submissions, completions, and reviews for ${student?.display_name ?? 'the student'}.`}>{overview.activity.length === 0 ? <EmptyState title="No activity to show" description="Activity will appear after the first saved student action." icon={Activity} /> : <ol className="space-y-3">{overview.activity.map((entry) => <li key={entry.id} className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Activity size={18} /></span><div><h2 className="font-bold text-navy">{label(entry.action_type)}</h2><p className="mt-1 text-sm text-muted">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.created_at))}</p>{entry.entity_type && <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-teal-700">{label(entry.entity_type)}</p>}</div></div></li>)}</ol>}</PageContainer>
}
