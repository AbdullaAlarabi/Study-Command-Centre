import { Activity, Filter } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { useCoachStudentOverview } from '../features/coach/useCoachStudentOverview'

function label(value: string) { return value.replace(/_/g, ' ').replace(/^./, (letter: string) => letter.toUpperCase()) }

export function CoachActivityPage() {
  const { student, overview, loading, error } = useCoachStudentOverview()
  const [actionType, setActionType] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [throughDate, setThroughDate] = useState('')
  const actionTypes = useMemo(() => [...new Set(overview.activity.map((entry) => entry.action_type))].sort(), [overview.activity])
  const filtered = overview.activity.filter((entry) => {
    if (actionType !== 'all' && entry.action_type !== actionType) return false
    const date = entry.created_at.slice(0, 10)
    if (fromDate && date < fromDate) return false
    if (throughDate && date > throughDate) return false
    return true
  })

  if (loading) return <PageContainer eyebrow="Coach" title="Loading activity"><LoadingState /></PageContainer>
  if (error) return <PageContainer eyebrow="Coach" title="Activity unavailable"><ErrorState message={error} /></PageContainer>
  return (
    <PageContainer eyebrow="Activity" title="Recent student activity" description={`Starts, submissions, completions, reviews, resets, and unlocks for ${student?.display_name ?? 'the student'}.`}>
      <div className="space-y-6">
        <section className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><div className="flex items-center gap-2"><Filter size={18} className="text-teal-700" /><h2 className="font-bold text-navy">Activity filters</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">Action<select className="min-h-11 rounded-xl border border-navy/15 bg-white px-3 text-sm text-navy" value={actionType} onChange={(event) => setActionType(event.target.value)}><option value="all">All actions</option>{actionTypes.map((action) => <option key={action} value={action}>{label(action)}</option>)}</select></label><label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">From<input className="min-h-11 rounded-xl border border-navy/15 bg-white px-3 text-sm text-navy" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-muted">Through<input className="min-h-11 rounded-xl border border-navy/15 bg-white px-3 text-sm text-navy" type="date" value={throughDate} onChange={(event) => setThroughDate(event.target.value)} /></label></div></section>
        {filtered.length === 0 ? <EmptyState title="No activity matches these filters" description="Activity appears after saved student or coach actions." icon={Activity} /> : <ol className="space-y-3">{filtered.map((entry) => <li key={entry.id} className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Activity size={18} /></span><div><h2 className="font-bold text-navy">{label(entry.action_type)}</h2><p className="mt-1 text-sm text-muted">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.created_at))}</p>{entry.entity_type && <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-teal-700">{label(entry.entity_type)}</p>}</div></div></li>)}</ol>}
      </div>
    </PageContainer>
  )
}
