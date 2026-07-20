import { AlertCircle, RefreshCw } from 'lucide-react'

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return (
    <section role="alert" className="rounded-card border border-risk/20 bg-risk-50 p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-risk shadow-sm">
          <AlertCircle aria-hidden="true" size={22} />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-risk-700">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-risk-700/80">{message}</p>
          {onRetry && (
            <button
              className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-risk px-4 text-sm font-semibold text-white hover:bg-risk-700"
              type="button"
              onClick={onRetry}
            >
              <RefreshCw aria-hidden="true" size={17} />
              Try again
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
