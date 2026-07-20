import { BookOpenCheck, LockKeyhole } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { isSupabaseConfigured } from '../lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, profile, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user && profile) navigate(`/${profile.role}`, { replace: true })
  }, [navigate, profile, user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const nextProfile = await signIn(email.trim(), password)
      navigate(`/${nextProfile.role}`, { replace: true })
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Login failed. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-5 py-10 sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-navy/10 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-navy text-white">
            <BookOpenCheck aria-hidden="true" size={25} />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal">
              Study Command Centre
            </p>
            <h1 className="text-2xl font-bold text-navy">Welcome back</h1>
          </div>
        </div>

        <p className="mb-6 text-sm leading-6 text-slate-600">
          Sign in with the student or coach account created by the administrator.
        </p>

        {!isSupabaseConfigured && (
          <div className="mb-5 rounded-xl border border-gold/30 bg-amber-50 p-4 text-sm text-amber-900">
            Add the Supabase URL and anon key to <code>.env.local</code> before
            testing login.
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-navy">
            Email
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base font-normal outline-none transition focus:border-teal"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-semibold text-navy">
            Password
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base font-normal outline-none transition focus:border-teal"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}

          <button
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 font-semibold text-white transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={submitting || !isSupabaseConfigured}
          >
            <LockKeyhole aria-hidden="true" size={18} />
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Private access only. There is no public registration.
        </p>
      </section>
    </main>
  )
}
