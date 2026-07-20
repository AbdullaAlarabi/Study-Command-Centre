import type { AssessmentBlock, Attempt, LearningUnit, StudyTask } from '../types/database'

export type RiskStatus =
  | 'on-track'
  | 'needs-attention'
  | 'behind'
  | 'high-risk'
  | 'not-started'

export type RoadmapUnitStatus = 'completed' | 'current' | 'upcoming' | 'locked'

type AttemptSnapshot = Pick<
  Attempt,
  | 'learning_unit_id'
  | 'status'
  | 'started_at'
  | 'submitted_at'
  | 'objective_percentage'
  | 'essay_score'
>

type UnitSnapshot = Pick<
  LearningUnit,
  'id' | 'unit_type' | 'unlock_order' | 'completion_weight'
>

function newestFirst(a: AttemptSnapshot, b: AttemptSnapshot) {
  const aTime = new Date(a.submitted_at ?? a.started_at).getTime()
  const bTime = new Date(b.submitted_at ?? b.started_at).getTime()
  return bTime - aTime
}

export function isUnitComplete(
  unit: UnitSnapshot,
  attempts: AttemptSnapshot[],
  manuallyCompletedUnitIds: ReadonlySet<string> = new Set(),
) {
  if (manuallyCompletedUnitIds.has(unit.id)) return true

  const unitAttempts = attempts.filter((attempt) => attempt.learning_unit_id === unit.id)

  if (unit.unit_type === 'chapter') {
    return unitAttempts.some((attempt) => attempt.status === 'passed')
  }

  if (unit.unit_type === 'mock') {
    return unitAttempts.some((attempt) =>
      ['submitted', 'passed', 'failed'].includes(attempt.status),
    )
  }

  return false
}

export function getCompletedUnitIds(
  units: UnitSnapshot[],
  attempts: AttemptSnapshot[],
  manuallyCompletedUnitIds: ReadonlySet<string> = new Set(),
) {
  return new Set(
    units
      .filter((unit) => isUnitComplete(unit, attempts, manuallyCompletedUnitIds))
      .map((unit) => unit.id),
  )
}

export function calculateWeightedAssessmentCompletion(
  units: UnitSnapshot[],
  attempts: AttemptSnapshot[],
  manuallyCompletedUnitIds: ReadonlySet<string> = new Set(),
) {
  const completedWeight = units.reduce(
    (sum, unit) =>
      sum +
      (isUnitComplete(unit, attempts, manuallyCompletedUnitIds)
        ? Number(unit.completion_weight)
        : 0),
    0,
  )
  const totalWeight = units.reduce(
    (sum, unit) => sum + Number(unit.completion_weight),
    0,
  )

  if (totalWeight === 0) return 0
  return Math.round((completedWeight / totalWeight) * 10_000) / 100
}

export function calculateReadiness(
  units: UnitSnapshot[],
  attempts: AttemptSnapshot[],
) {
  const scores = units.flatMap((unit) => {
    if (unit.unit_type !== 'chapter' && unit.unit_type !== 'mock') return []

    const eligible = attempts
      .filter((attempt) => {
        if (attempt.learning_unit_id !== unit.id) return false
        if (unit.unit_type === 'chapter') return attempt.status === 'passed'
        return ['submitted', 'passed', 'failed'].includes(attempt.status)
      })
      .sort(newestFirst)

    const latest = eligible[0]
    if (!latest) return []

    const objectiveScore = Number(latest.objective_percentage)
    const score =
      latest.essay_score === null
        ? objectiveScore
        : (objectiveScore + Number(latest.essay_score)) / 2
    return [score]
  })

  if (scores.length === 0) return undefined
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
}

export function calculateOverdueTaskCount(
  tasks: Pick<StudyTask, 'id' | 'task_date'>[],
  completedTaskIds: ReadonlySet<string>,
  today: string,
) {
  return tasks.filter(
    (task) => task.task_date < today && !completedTaskIds.has(task.id),
  ).length
}

export function calculateRiskStatus({
  readiness,
  overdueTaskCount,
  daysUntilExam,
  daysSinceActivity,
}: {
  readiness?: number
  overdueTaskCount: number
  daysUntilExam?: number
  daysSinceActivity?: number
}): RiskStatus {
  if (
    readiness !== undefined &&
    daysUntilExam !== undefined &&
    daysUntilExam >= 0 &&
    daysUntilExam <= 3 &&
    readiness < 50
  ) {
    return 'high-risk'
  }

  if (overdueTaskCount >= 2 || (daysSinceActivity !== undefined && daysSinceActivity >= 3)) {
    return 'behind'
  }

  if (overdueTaskCount === 1 || (readiness !== undefined && readiness >= 50 && readiness < 70)) {
    return 'needs-attention'
  }

  if (readiness === undefined) return 'not-started'
  if (overdueTaskCount === 0 && readiness >= 70) return 'on-track'
  return 'needs-attention'
}

export function getNextUnlockedUnit(
  units: UnitSnapshot[],
  attempts: AttemptSnapshot[],
  manuallyCompletedUnitIds: ReadonlySet<string> = new Set(),
) {
  const ordered = [...units].sort((a, b) => a.unlock_order - b.unlock_order)
  return ordered.find((unit, index) => {
    if (isUnitComplete(unit, attempts, manuallyCompletedUnitIds)) return false
    return ordered
      .slice(0, index)
      .every((previous) => isUnitComplete(previous, attempts, manuallyCompletedUnitIds))
  })
}

export function getRoadmapUnitStatuses(
  units: UnitSnapshot[],
  attempts: AttemptSnapshot[],
  manuallyCompletedUnitIds: ReadonlySet<string> = new Set(),
) {
  const ordered = [...units].sort((a, b) => a.unlock_order - b.unlock_order)
  const current = getNextUnlockedUnit(ordered, attempts, manuallyCompletedUnitIds)
  const currentIndex = current
    ? ordered.findIndex((unit) => unit.id === current.id)
    : -1

  return new Map<string, RoadmapUnitStatus>(
    ordered.map((unit, index) => {
      if (isUnitComplete(unit, attempts, manuallyCompletedUnitIds)) {
        return [unit.id, 'completed']
      }
      if (unit.id === current?.id) return [unit.id, 'current']
      if (currentIndex >= 0 && index === currentIndex + 1) return [unit.id, 'upcoming']
      return [unit.id, 'locked']
    }),
  )
}

export function getDaysUntil(date: string, today: string) {
  const target = new Date(`${date}T00:00:00Z`).getTime()
  const start = new Date(`${today}T00:00:00Z`).getTime()
  return Math.ceil((target - start) / 86_400_000)
}

export function getNextAssessment(
  assessments: AssessmentBlock[],
  today: string,
) {
  return [...assessments]
    .filter((assessment) => assessment.exam_date >= today)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0]
}

export function calculatePercentage(completed: number, total: number) {
  if (total === 0) return undefined
  return Math.round((completed / total) * 10_000) / 100
}
