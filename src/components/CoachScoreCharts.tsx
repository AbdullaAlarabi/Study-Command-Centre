import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ScoreTrendPoint } from '../lib/analytics'

function ChartEmpty({ message }: { message: string }) {
  return <div className="grid h-64 place-items-center rounded-xl border border-dashed border-navy/15 bg-navy-50/40 p-6 text-center text-sm leading-6 text-muted">{message}</div>
}

export function CoachScoreCharts({
  quizTrend,
  mockComparison,
}: {
  quizTrend: ScoreTrendPoint[]
  mockComparison: ScoreTrendPoint[]
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-2" aria-label="Score trends">
      <article className="min-w-0 overflow-hidden rounded-card border border-navy/10 bg-surface p-5 shadow-card sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Objective evidence</p>
        <h2 className="mt-2 text-xl font-bold text-navy">Chapter quiz trend</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Every submitted chapter attempt in chronological order.</p>
        <div className="mt-5 h-64 min-w-0 overflow-hidden">
          {quizTrend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={quizTrend} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                <CartesianGrid stroke="#dbe2ea" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#637083' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#637083' }} />
                <Tooltip formatter={(value) => [`${value}%`, 'Score']} labelFormatter={(_, payload) => payload[0]?.payload.unitTitle ?? ''} />
                <Line type="monotone" dataKey="score" stroke="#0f766e" strokeWidth={3} dot={{ fill: '#0f766e', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <ChartEmpty message="Chapter quiz scores will form a trend after submissions." />}
        </div>
      </article>

      <article className="min-w-0 overflow-hidden rounded-card border border-navy/10 bg-surface p-5 shadow-card sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-gold-600">Exam rehearsal</p>
        <h2 className="mt-2 text-xl font-bold text-navy">Mock score comparison</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Uses complete marked totals when available; otherwise objective scores.</p>
        <div className="mt-5 h-64 min-w-0 overflow-hidden">
          {mockComparison.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockComparison} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                <CartesianGrid stroke="#dbe2ea" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#637083' }} interval={0} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#637083' }} />
                <Tooltip formatter={(value) => [`${value}%`, 'Score']} labelFormatter={(_, payload) => payload[0]?.payload.unitTitle ?? ''} />
                <Bar dataKey="score" fill="#c6922f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmpty message="Mock results will appear here after the first submission." />}
        </div>
      </article>
    </section>
  )
}
