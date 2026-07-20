import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5">
      <section className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal">
          404
        </p>
        <h1 className="mt-2 text-3xl font-bold text-navy">Page not found</h1>
        <p className="mt-3 leading-7 text-slate-600">
          This route does not exist in the Study Command Centre.
        </p>
        <Link
          className="mx-auto mt-7 flex min-h-11 w-fit items-center gap-2 rounded-lg bg-navy px-5 font-semibold text-white"
          to="/"
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Return home
        </Link>
      </section>
    </main>
  )
}
