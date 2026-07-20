export type StatusTone =
  | 'on-track'
  | 'needs-attention'
  | 'behind'
  | 'high-risk'
  | 'complete'
  | 'locked'
  | 'pending'

const styles: Record<StatusTone, string> = {
  'on-track': 'border-teal/20 bg-teal-50 text-teal-700',
  'needs-attention': 'border-gold/25 bg-gold-50 text-gold-600',
  behind: 'border-risk/20 bg-risk-50 text-risk-700',
  'high-risk': 'border-risk/30 bg-risk-100 text-risk-700',
  complete: 'border-teal/20 bg-teal-50 text-teal-700',
  locked: 'border-slate-200 bg-slate-100 text-slate-600',
  pending: 'border-navy/10 bg-navy-50 text-navy-700',
}

const labels: Record<StatusTone, string> = {
  'on-track': 'On track',
  'needs-attention': 'Needs attention',
  behind: 'Behind',
  'high-risk': 'High risk',
  complete: 'Complete',
  locked: 'Locked',
  pending: 'Pending',
}

export function StatusBadge({ status, label }: { status: StatusTone; label?: string }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {label ?? labels[status]}
    </span>
  )
}
