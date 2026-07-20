export function LoadingState({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="h-36 animate-pulse rounded-card bg-navy/10" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-card bg-navy/10" />
        ))}
      </div>
    </div>
  )
}
