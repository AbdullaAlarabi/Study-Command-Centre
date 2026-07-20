import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-navy/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <section
        aria-describedby="confirm-dialog-description"
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-lift sm:rounded-2xl"
        role="dialog"
      >
        <div className="flex items-start gap-4">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${destructive ? 'bg-risk-50 text-risk' : 'bg-gold-50 text-gold-600'}`}
          >
            <AlertTriangle aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-lg font-bold text-navy">
              {title}
            </h2>
            <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-muted">
              {description}
            </p>
          </div>
          <button
            aria-label="Close dialog"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-navy-50 hover:text-navy"
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            ref={cancelRef}
            className="min-h-11 rounded-xl border border-navy/15 px-4 text-sm font-semibold text-navy hover:bg-navy-50"
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60 ${destructive ? 'bg-risk hover:bg-risk-700' : 'bg-navy hover:bg-navy-800'}`}
            type="button"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
