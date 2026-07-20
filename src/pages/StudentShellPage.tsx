import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListChecks,
  Target,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AssessmentCard } from '../components/AssessmentCard'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { ProgressBar } from '../components/ProgressBar'
import { StatCard } from '../components/StatCard'
import type { StatusTone } from '../components/StatusBadge'
import { TodayTaskCard } from '../components/TodayTaskCard'
import { useAuth } from '../features/auth/AuthProvider'
import { useStudentOverview } from '../features/student/useStudentOverview'
import { formatRelativeDays, formatShortDate, getTodayString } from '../lib/date'
import {
  calculateOverdueTaskCount,
  calculatePercentage,
  calculateReadiness,
  calculateRiskStatus,
  calculateWeightedAssessmentCompletion,
  getDaysUntil,
  getNextAssessment,
  type RiskStatus,
} from '../lib/progress'
import type { LearningUnit, StudyTask } from '../types/database'

function taskPath(task: StudyTask, unit?: LearningUnit) {
  if (!task.learning_unit_id) return undefined
  if (task.task_type === 'mock' || unit?.unit_type === 'mock') {
    return `/student/mock/${task.learning_unit_id}`
  }
  if (task.task_type === 'revision' || unit?.unit_type === 'revision') {
    return `/student/revision/${task.learning_unit_id}`
  }
  if (task.task_type === 'chapter' || unit?.unit_type === 'chapter') {
    return `/student/chapter/${task.learning_unit_id}`
  }
  return undefined
}

function badgeForRisk(status: RiskStatus): { status: StatusTone; label?: string } {
  if (status === 'not-started') return { status: 'pending', label: 'Not started' }
  return { status }
}

export function StudentShellPage() {
  const { user, profile } = useAuth()
  const overview = useStudentOverview(user?.id)
  const today = getTodayString()

  const courseById = useMemo(
    () => new Map(overview.courses.map((course) => [course.id, course])),
    [overview.courses],
  )
  const unitById = useMemo(
    () => new Map(overview.units.map((unit) => [unit.id, unit])),
    [overview.units],
  )

  const todayTask = useMemo(() => {
    const tasks = overview.tasks
      .filter((task) => task.task_date === today)
      .sort((a, b) => a.display_order - b.display_order)
    return tasks.find((task) => !overview.completedTaskIds.has(task.id)) ?? tasks[0]
  }, [overview.completedTaskIds, overview.tasks, today])

  const dueTasks = overview.tasks.filter((task) => task.task_date <= today)
  const dueCompleted = dueTasks.filter((task) => overview.completedTaskIds.has(task.id)).length
  const totalCompleted = overview.tasks.filter((task) =>
    overview.completedTaskIds.has(task.id),
  ).length
  const duePlanPercentage = calculatePercentage(dueCompleted, dueTasks.length)
  const totalPlanPercentage = calculatePercentage(totalCompleted, overview.tasks.length)
  const overallReadiness = calculateReadiness(overview.units, overview.attempts)

  const nextAssessment = getNextAssessment(overview.assessments, today)
  const nextAssessmentUnits = nextAssessment
    ? overview.units.filter((unit) => unit.assessment_id === nextAssessment.id)
    : []
  const nextAssessmentProgress = nextAssessment
    ? calculateWeightedAssessmentCompletion(
        nextAssessmentUnits,
        overview.attempts,
        overview.manuallyCompletedUnitIds,
      )
    : 0

  const upcomingTasks = overview.tasks
    .filter((task) => task.task_date > today && !overview.completedTaskIds.has(task.id))
    .sort(
      (a, b) =>
        a.task_date.localeCompare(b.task_date) || a.display_order - b.display_order,
    )
    .slice(0, 5)

  const weakTopics = useMemo(() => {
    const unique = new Set<string>()
    ;[...overview.attempts]
      .sort((a, b) =>
        (b.submitted_at ?? b.started_at).localeCompare(a.submitted_at ?? a.started_at),
      )
      .forEach((attempt) => {
        attempt.weak_topics_json.forEach((topic) => unique.add(topic))
      })
    return [...unique].slice(0, 5)
  }, [overview.attempts])

  const daysSinceActivity = overview.activity[0]
    ? Math.floor(
        (Date.now() - new Date(overview.activity[0].created_at).getTime()) / 86_400_000,
      )
    : undefined

  if (overview.loading) {
    return (
      <PageContainer eyebrow="Student dashboard" title="Loading your command centre">
        <LoadingState />
      </PageContainer>
    )
  }

  if (overview.error && overview.courses.length === 0) {
    return (
      <PageContainer eyebrow="Student dashboard" title="Dashboard unavailable">
        <ErrorState message={overview.error} onRetry={() => void overview.reload()} />
      </PageContainer>
    )
  }

  return (
    <PageContainer
      eyebrow="Student dashboard"
      title={`Welcome back, ${profile?.display_name ?? 'Student'}`}
      description="One clear place for today’s work, assessment progress, readiness, and what comes next."
    >
      <div className="space-y-7">
        {overview.error && <ErrorState message={overview.error} onRetry={() => void overview.reload()} />}

        {todayTask ? (
          <TodayTaskCard
            courseCode={
              todayTask.course_id ? courseById.get(todayTask.course_id)?.code : undefined
            }
            title={todayTask.title}
            description={todayTask.description}
            meta={formatShortDate(todayTask.task_date)}
            dueLabel={
              overview.completedTaskIds.has(todayTask.id) ? 'Completed' : 'Due today'
            }
            completed={overview.completedTaskIds.has(todayTask.id)}
            actionLabel={todayTask.completion_mode === 'manual' ? 'Mark complete' : 'Open task'}
            to={
              todayTask.completion_mode === 'manual'
                ? undefined
                : taskPath(
                    todayTask,
                    todayTask.learning_unit_id
                      ? unitById.get(todayTask.learning_unit_id)
                      : undefined,
                  )
            }
            onAction={
              todayTask.completion_mode === 'manual'
                ? () => void overview.completeTask(todayTask)
                : undefined
            }
            actionPending={overview.completingTaskId === todayTask.id}
          />
        ) : (
          <TodayTaskCard
            title="No task is scheduled for today"
            description="The dashboard is connected to Supabase. Today’s card will populate when the approved schedule is seeded in Phase 9."
            meta="Live schedule query · No matching task"
            dueLabel="Nothing due"
          />
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Progress overview">
          <StatCard
            label="Plan completion"
            value={duePlanPercentage === undefined ? '—' : `${Math.round(duePlanPercentage)}%`}
            helper={
              overview.tasks.length === 0
                ? 'No schedule tasks have been seeded yet.'
                : `${dueCompleted}/${dueTasks.length} due tasks · ${totalCompleted}/${overview.tasks.length} total (${totalPlanPercentage === undefined ? '—' : `${Math.round(totalPlanPercentage)}%`})`
            }
            icon={ListChecks}
            tone="teal"
          />
          <StatCard
            label="Readiness"
            value={overallReadiness === undefined ? '—' : `${Math.round(overallReadiness)}%`}
            helper={
              overallReadiness === undefined
                ? 'Complete a chapter quiz to establish readiness.'
                : 'Latest passed chapter and submitted mock results.'
            }
            icon={Target}
            tone="gold"
          />
          <StatCard
            label="Completed units"
            value={`${overview.completedUnitIds.size}/${overview.units.length}`}
            helper="Weighted separately inside each assessment."
            icon={CheckCircle2}
            tone="teal"
          />
          <StatCard
            label="Upcoming tasks"
            value={String(upcomingTasks.length)}
            helper="Showing the next five scheduled tasks."
            icon={Clock3}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-card border border-navy/10 bg-surface p-6 shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-600">
              Next exam
            </p>
            {nextAssessment ? (
              <>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-navy">{nextAssessment.title}</h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                      <CalendarDays aria-hidden="true" size={17} />
                      {formatShortDate(nextAssessment.exam_date)}
                    </p>
                  </div>
                  <span className="rounded-xl bg-gold-50 px-3 py-2 text-right text-sm font-bold text-gold-600">
                    {formatRelativeDays(getDaysUntil(nextAssessment.exam_date, today))}
                  </span>
                </div>
                <div className="mt-6">
                  <ProgressBar value={nextAssessmentProgress} label="Assessment progress" />
                </div>
                <Link
                  className="mt-5 flex min-h-11 items-center justify-between rounded-xl border border-navy/10 px-4 text-sm font-semibold text-navy hover:bg-navy-50"
                  to={`/student/assessment/${nextAssessment.id}`}
                >
                  View assessment
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted">No upcoming assessment was found.</p>
            )}
          </article>

          <article className="rounded-card border border-navy/10 bg-surface p-6 shadow-card">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                  Upcoming
                </p>
                <h2 className="mt-1 text-xl font-bold text-navy">Next five tasks</h2>
              </div>
              <Link className="text-sm font-semibold text-teal-700 hover:text-teal" to="/student/roadmap">
                Roadmap
              </Link>
            </div>
            {upcomingTasks.length ? (
              <ol className="mt-5 divide-y divide-navy/10">
                {upcomingTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-50 text-xs font-bold text-navy">
                      {new Date(`${task.task_date}T00:00:00Z`).getUTCDate()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-navy">{task.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatShortDate(task.task_date)}
                        {task.course_id && courseById.get(task.course_id)
                          ? ` · ${courseById.get(task.course_id)?.code}`
                          : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 rounded-xl bg-navy-50 p-4 text-sm leading-6 text-muted">
                No upcoming schedule tasks are seeded yet. This list will populate from Supabase in the approved schedule phase.
              </p>
            )}
          </article>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              Assessments
            </p>
            <h2 className="mt-1 text-2xl font-bold text-navy">Four exam paths</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
            {overview.assessments.map((assessment) => {
              const units = overview.units.filter(
                (unit) => unit.assessment_id === assessment.id,
              )
              const progress = calculateWeightedAssessmentCompletion(
                units,
                overview.attempts,
                overview.manuallyCompletedUnitIds,
              )
              const readiness = calculateReadiness(units, overview.attempts)
              const completedUnits = units.filter((unit) =>
                overview.completedUnitIds.has(unit.id),
              ).length
              const assessmentTasks = overview.tasks.filter(
                (task) => task.assessment_id === assessment.id,
              )
              const overdue = calculateOverdueTaskCount(
                assessmentTasks,
                overview.completedTaskIds,
                today,
              )
              const risk = calculateRiskStatus({
                readiness,
                overdueTaskCount: overdue,
                daysUntilExam: getDaysUntil(assessment.exam_date, today),
                daysSinceActivity,
              })
              const badge = badgeForRisk(risk)
              const course = courseById.get(assessment.course_id)

              return (
                <AssessmentCard
                  key={assessment.id}
                  courseCode={course?.code ?? 'Course'}
                  title={assessment.assessment_type === 'midterm' ? 'Midterm' : 'Final'}
                  examDate={formatShortDate(assessment.exam_date)}
                  progress={progress}
                  readiness={readiness}
                  completedUnits={{ completed: completedUnits, total: units.length }}
                  status={badge.status}
                  statusLabel={badge.label}
                  to={`/student/assessment/${assessment.id}`}
                />
              )
            })}
          </div>
        </section>

        <section className="rounded-card border border-navy/10 bg-surface p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-600">Weak topics</p>
          <h2 className="mt-1 text-xl font-bold text-navy">Recent topics to revisit</h2>
          {weakTopics.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {weakTopics.map((topic) => (
                <span key={topic} className="rounded-full border border-gold/20 bg-gold-50 px-3 py-2 text-sm font-semibold text-gold-600">
                  {topic.split('_').join(' ')}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No weak topics yet"
              description="Incorrect quiz and mock answers will add up to five recent topic tags here."
              icon={Target}
            />
          )}
        </section>
      </div>
    </PageContainer>
  )
}
