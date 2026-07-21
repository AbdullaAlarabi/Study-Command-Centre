import { calculateWeightedAssessmentCompletion } from './progress'
import type { AssessmentBlock, Attempt, LearningUnit } from '../types/database'

export interface ScoreTrendPoint {
  label: string
  score: number
  unitTitle: string
}

export function calculateOverallCompletion(
  assessments: AssessmentBlock[],
  units: LearningUnit[],
  attempts: Attempt[],
  manuallyCompletedUnitIds: ReadonlySet<string> = new Set(),
) {
  if (assessments.length === 0) return 0
  const percentages = assessments.map((assessment) =>
    calculateWeightedAssessmentCompletion(
      units.filter((unit) => unit.assessment_id === assessment.id),
      attempts,
      manuallyCompletedUnitIds,
    ),
  )
  return Math.round((percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 100) / 100
}

export function getWeakTopicRanking(attempts: Attempt[], limit = 8) {
  const labels = new Map<string, string>()
  const counts = new Map<string, number>()
  attempts
    .filter((attempt) => attempt.status !== 'in_progress')
    .forEach((attempt) => attempt.weak_topics_json.forEach((topic) => {
      const normalized = topic.trim().toLowerCase()
      if (!normalized) return
      if (!labels.has(normalized)) labels.set(normalized, topic.trim())
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    }))
  return [...counts.entries()]
    .map(([normalized, count]) => ({ topic: labels.get(normalized) as string, count }))
    .sort((left, right) => right.count - left.count || left.topic.localeCompare(right.topic))
    .slice(0, limit)
}

function latestAttemptForUnit(attempts: Attempt[], unitId: string) {
  return attempts
    .filter((attempt) => attempt.learning_unit_id === unitId && attempt.status !== 'in_progress')
    .sort((left, right) => (right.submitted_at ?? right.started_at).localeCompare(left.submitted_at ?? left.started_at))[0]
}

export function getQuizScoreTrend(attempts: Attempt[], units: LearningUnit[]): ScoreTrendPoint[] {
  const unitById = new Map(units.map((unit) => [unit.id, unit]))
  return attempts
    .filter((attempt) => attempt.status !== 'in_progress' && unitById.get(attempt.learning_unit_id)?.unit_type === 'chapter')
    .sort((left, right) => (left.submitted_at ?? left.started_at).localeCompare(right.submitted_at ?? right.started_at))
    .map((attempt, index) => ({
      label: `Q${index + 1}`,
      score: Number(attempt.objective_percentage),
      unitTitle: unitById.get(attempt.learning_unit_id)?.short_title ?? 'Chapter quiz',
    }))
}

export function getMockScoreComparison(assessments: AssessmentBlock[], attempts: Attempt[], units: LearningUnit[]): ScoreTrendPoint[] {
  return assessments.flatMap((assessment) =>
    units
      .filter((unit) => unit.assessment_id === assessment.id && unit.unit_type === 'mock')
      .sort((left, right) => Number(left.mock_number) - Number(right.mock_number))
      .flatMap((unit) => {
        const attempt = latestAttemptForUnit(attempts, unit.id)
        if (!attempt) return []
        return [{
          label: `${assessment.title.replace(/112 /, '')} M${unit.mock_number}`,
          score: Number(attempt.total_percentage ?? attempt.objective_percentage),
          unitTitle: unit.title,
        }]
      }),
  )
}

export function getDaysSinceLatestActivity(createdAt?: string, now = new Date()) {
  if (!createdAt) return undefined
  return Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86_400_000))
}
