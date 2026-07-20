interface ProgressRingProps {
  value?: number
  label: string
  size?: number
  tone?: 'teal' | 'gold' | 'risk'
}

const strokes = {
  teal: '#167d78',
  gold: '#b28a43',
  risk: '#c4473a',
}

export function ProgressRing({
  value,
  label,
  size = 116,
  tone = 'teal',
}: ProgressRingProps) {
  const strokeWidth = 9
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const normalized = value === undefined ? 0 : Math.min(100, Math.max(0, value))
  const offset = circumference - (normalized / 100) * circumference

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(18, 35, 63, 0.09)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokes[tone]}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-xl font-bold tabular-nums text-navy">
          {value === undefined ? '—' : `${Math.round(normalized)}%`}
        </span>
      </div>
      <span className="text-sm font-medium text-muted">{label}</span>
    </div>
  )
}
