interface ProgressBarProps {
  value?: number
  label?: string
  showValue?: boolean
  tone?: 'teal' | 'gold' | 'risk'
}

const fills = {
  teal: 'bg-teal',
  gold: 'bg-gold',
  risk: 'bg-risk',
}

export function ProgressBar({
  value,
  label,
  showValue = true,
  tone = 'teal',
}: ProgressBarProps) {
  const normalized = value === undefined ? 0 : Math.min(100, Math.max(0, value))

  return (
    <div>
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          {label && <span className="font-medium text-navy">{label}</span>}
          {showValue && (
            <span className="ml-auto tabular-nums text-muted">
              {value === undefined ? 'Not available' : `${Math.round(normalized)}%`}
            </span>
          )}
        </div>
      )}
      <div
        className="h-2.5 overflow-hidden rounded-full bg-navy/10"
        role="progressbar"
        aria-label={label ?? 'Progress'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === undefined ? undefined : normalized}
        aria-valuetext={value === undefined ? 'Not available' : `${Math.round(normalized)} percent`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${fills[tone]}`}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  )
}
