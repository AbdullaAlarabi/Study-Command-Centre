import { LogOut } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'

export function TemporaryRoleShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [error, setError] = useState('')

  async function handleLogout() {
    setError('')
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Could not log out.',
      )
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              Study Command Centre
            </p>
            <p className="font-semibold text-navy">{profile?.display_name ?? eyebrow}</p>
          </div>
          <button
            className="flex min-h-11 items-center gap-2 rounded-lg border border-navy/15 px-4 text-sm font-semibold text-navy hover:bg-slate-50"
            type="button"
            onClick={handleLogout}
          >
            <LogOut aria-hidden="true" size={17} />
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
        <section className="rounded-2xl border border-navy/10 bg-white p-7 shadow-sm sm:p-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-gold">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">{description}</p>
          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          <div className="mt-8">{children}</div>
        </section>
      </main>
    </div>
  )
}
