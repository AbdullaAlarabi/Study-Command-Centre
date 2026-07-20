import type { LucideIcon } from 'lucide-react'

const iconStyles = {
  navy: 'bg-navy-50 text-navy',
  teal: 'bg-teal-50 text-teal-700',
  gold: 'bg-gold-50 text-gold-600',
  risk: 'bg-risk-50 text-risk-700',
}

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'navy',
}: {
  label: string
  value: string
  helper?: string
  icon: LucideIcon
  tone?: keyof typeof iconStyles
}) {
  return (
    <article className="rounded-card border border-navy/10 bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-navy">{value}</p>
        </div>
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${iconStyles[tone]}`}>
          <Icon aria-hidden="true" size={21} />
        </span>
      </div>
      {helper && <p className="mt-3 text-sm leading-5 text-muted">{helper}</p>}
    </article>
  )
}
