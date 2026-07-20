import { ArrowRight, CalendarCheck2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'

export function TodayTaskCard({
  title,
  description,
  meta,
  actionLabel = 'Open task',
  to,
  placeholder = false,
}: {
  title: string
  description: string
  meta?: string
  actionLabel?: string
  to?: string
  placeholder?: boolean
}) {
  return (
    <article className="relative overflow-hidden rounded-card bg-navy p-6 text-white shadow-lift sm:p-7">
      <div className="absolute -right-16 -top-16 size-48 rounded-full border-[28px] border-white/5" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-white/75">
            <CalendarCheck2 aria-hidden="true" size={18} />
            Today’s task
          </p>
          {placeholder && <StatusBadge status="pending" label="Preview only" />}
        </div>
        <h2 className="mt-5 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-white/75">{description}</p>
        {meta && <p className="mt-4 text-sm font-semibold text-gold-100">{meta}</p>}
        {to && (
          <Link
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 font-bold text-navy transition hover:bg-gold-50 sm:w-fit"
            to={to}
          >
            {actionLabel}
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        )}
      </div>
    </article>
  )
}
