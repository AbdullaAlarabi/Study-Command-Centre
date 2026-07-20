import { ArrowRight, BookOpenCheck, Check, LockKeyhole, ShieldCheck } from 'lucide-react'
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
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-navy/10 bg-surface shadow-lift lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden bg-navy p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-20 -top-20 size-72 rounded-full border-[42px] border-white/[0.04]" />
          <div className="absolute -bottom-28 -left-28 size-80 rounded-full border-[48px] border-teal/15" />

          <div className="relative flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-white text-navy">
              <BookOpenCheck aria-hidden="true" size={25} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100">Study</p>
              <p className="font-bold">Command Centre</p>
            </div>
          </div>

          <div className="relative my-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-100">
              MKT112 · MGT112
            </p>
            <h1 className="mt-5 max-w-md text-4xl font-bold leading-tight tracking-tight">
              One task at a time. Finish it. Prove it. Move forward.
            </h1>
            <div className="mt-8 space-y-3 text-sm text-white/70">
              {['A clear task for today', 'Progress that must be earned', 'One view for student and coach'].map(
                (item) => (
                  <p key={item} className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-teal/20 text-teal-100">
                      <Check aria-hidden="true" size={14} strokeWidth={3} />
                    </span>
                    {item}
                  </p>
                ),
              )}
            </div>
          </div>

          <p className="relative text-xs leading-5 text-white/45">
            Private access for one student and one coach.
          </p>
        </div>

        <div className="p-6 sm:p-9 lg:p-11">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-navy text-white">
                <BookOpenCheck aria-hidden="true" size={23} />
              </span>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-teal-700">
                Study Command Centre
              </p>
            </div>
            <p className="mt-5 max-w-sm text-xl font-bold leading-8 text-navy">
              One task at a time. Finish it. Prove it. Move forward.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-600">Private access</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-navy">Welcome back</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Sign in with your student or coach account.
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mt-6 rounded-xl border border-gold/30 bg-gold-50 p-4 text-sm text-gold-600">
              Add the Supabase URL and anon key to <code>.env.local</code> before testing login.
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-navy">
              Email address
              <input
                className="mt-2 min-h-12 w-full rounded-xl border border-navy/15 bg-white px-4 text-base font-normal text-navy outline-none transition placeholder:text-slate-400 focus:border-teal focus:ring-4 focus:ring-teal/10"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="block text-sm font-semibold text-navy">
              Password
              <input
                className="mt-2 min-h-12 w-full rounded-xl border border-navy/15 bg-white px-4 text-base font-normal text-navy outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-risk/20 bg-risk-50 p-3 text-sm text-risk-700">
                {error}
              </p>
            )}

            <button
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={submitting || !isSupabaseConfigured}
            >
              {submitting ? (
                <>
                  <LockKeyhole aria-hidden="true" size={18} />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight aria-hidden="true" size={18} />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted">
            <ShieldCheck aria-hidden="true" size={16} className="text-teal-700" />
            Private access only. No public registration.
          </p>
        </div>
      </section>
    </main>
  )
}
