import { Inbox, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  actionTo,
}: {
  title: string
  description: string
  icon?: LucideIcon
  actionLabel?: string
  actionTo?: string
}) {
  return (
    <section className="rounded-card border border-dashed border-navy/20 bg-white/60 px-5 py-12 text-center sm:px-8 sm:py-16">
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-navy-50 text-navy">
        <Icon aria-hidden="true" size={23} />
      </span>
      <h2 className="mt-5 text-lg font-bold text-navy">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">{description}</p>
      {actionLabel && actionTo && (
        <Link
          className="mx-auto mt-6 flex min-h-11 w-fit items-center rounded-xl bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-800"
          to={actionTo}
        >
          {actionLabel}
        </Link>
      )}
    </section>
  )
}
