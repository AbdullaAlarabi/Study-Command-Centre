import { ArrowRight, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProgressBar } from './ProgressBar'
import { StatusBadge, type StatusTone } from './StatusBadge'

export function AssessmentCard({
  courseCode,
  title,
  examDate,
  progress,
  readiness,
  status = 'pending',
  to,
}: {
  courseCode: string
  title: string
  examDate: string
  progress?: number
  readiness?: number
  status?: StatusTone
  to: string
}) {
  return (
    <article className="rounded-card border border-navy/10 bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
            {courseCode}
          </p>
          <h3 className="mt-1 text-lg font-bold text-navy">{title}</h3>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm text-muted">
        <CalendarDays aria-hidden="true" size={16} />
        {examDate}
      </p>
      <div className="mt-5 space-y-4">
        <ProgressBar value={progress} label="Completion" />
        <ProgressBar value={readiness} label="Readiness" tone="gold" />
      </div>
      <Link
        className="mt-5 flex min-h-11 items-center justify-between rounded-xl border border-navy/10 px-4 text-sm font-semibold text-navy transition hover:border-teal/30 hover:bg-teal-50"
        to={to}
      >
        Open assessment
        <ArrowRight aria-hidden="true" size={17} />
      </Link>
    </article>
  )
}
