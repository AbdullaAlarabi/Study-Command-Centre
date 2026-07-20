import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateOverdueTaskCount,
  calculatePercentage,
  calculateReadiness,
  calculateRiskStatus,
  calculateWeightedAssessmentCompletion,
  getNextUnlockedUnit,
  getRoadmapUnitStatuses,
  isUnitComplete,
} from '../src/lib/progress'
import type { Attempt, LearningUnit } from '../src/types/database'

const units = [
  { id: 'chapter-1', unit_type: 'chapter', unlock_order: 1, completion_weight: 15 },
  { id: 'chapter-2', unit_type: 'chapter', unlock_order: 2, completion_weight: 15 },
  { id: 'chapter-3', unit_type: 'chapter', unlock_order: 3, completion_weight: 15 },
  { id: 'revision', unit_type: 'revision', unlock_order: 4, completion_weight: 10 },
  { id: 'mock-1', unit_type: 'mock', unlock_order: 5, completion_weight: 15 },
  { id: 'mock-2', unit_type: 'mock', unlock_order: 6, completion_weight: 15 },
  { id: 'mock-3', unit_type: 'mock', unlock_order: 7, completion_weight: 15 },
] as LearningUnit[]

function attempt(overrides: Partial<Attempt>): Attempt {
  return {
    id: crypto.randomUUID(),
    user_id: 'student',
    assessment_id: 'assessment',
    learning_unit_id: 'chapter-1',
    attempt_number: 1,
    status: 'passed',
    started_at: '2026-07-20T10:00:00Z',
    submitted_at: '2026-07-20T10:10:00Z',
    selected_question_ids: [],
    answers_json: {},
    mcq_correct: 4,
    mcq_total: 5,
    objective_percentage: 80,
    essay_word_count: 80,
    essay_score: null,
    total_percentage: null,
    weak_topics_json: [],
    duration_seconds: 600,
    ...overrides,
  }
}

test('unit completion follows chapter, revision, and mock rules', () => {
  const attempts = [attempt({}), attempt({ learning_unit_id: 'mock-1', status: 'submitted' })]
  assert.equal(isUnitComplete(units[0], attempts), true)
  assert.equal(isUnitComplete(units[3], attempts), false)
  assert.equal(isUnitComplete(units[3], attempts, new Set(['revision'])), true)
  assert.equal(isUnitComplete(units[4], attempts), true)
})

test('weighted completion uses configured weights', () => {
  const attempts = [attempt({})]
  assert.equal(calculateWeightedAssessmentCompletion(units, attempts), 15)
  assert.equal(
    calculateWeightedAssessmentCompletion(units, attempts, new Set(['revision'])),
    25,
  )
})

test('readiness uses the latest eligible result and optional essay score', () => {
  const attempts = [
    attempt({ objective_percentage: 80, submitted_at: '2026-07-20T10:10:00Z' }),
    attempt({ objective_percentage: 100, essay_score: 60, submitted_at: '2026-07-21T10:10:00Z' }),
    attempt({
      learning_unit_id: 'mock-1',
      status: 'submitted',
      objective_percentage: 60,
    }),
  ]
  assert.equal(calculateReadiness(units, attempts), 70)
})

test('overdue count ignores completed tasks', () => {
  const tasks = [
    { id: 'past-open', task_date: '2026-07-19' },
    { id: 'past-done', task_date: '2026-07-19' },
    { id: 'today', task_date: '2026-07-20' },
  ]
  assert.equal(calculateOverdueTaskCount(tasks, new Set(['past-done']), '2026-07-20'), 1)
})

test('risk status follows precedence rules', () => {
  assert.equal(
    calculateRiskStatus({ readiness: 40, overdueTaskCount: 3, daysUntilExam: 2 }),
    'high-risk',
  )
  assert.equal(calculateRiskStatus({ readiness: 75, overdueTaskCount: 2 }), 'behind')
  assert.equal(calculateRiskStatus({ readiness: 60, overdueTaskCount: 0 }), 'needs-attention')
  assert.equal(calculateRiskStatus({ readiness: 80, overdueTaskCount: 0 }), 'on-track')
  assert.equal(calculateRiskStatus({ overdueTaskCount: 0 }), 'not-started')
})

test('next unit and roadmap states remain sequential', () => {
  const attempts = [attempt({})]
  assert.equal(getNextUnlockedUnit(units, attempts)?.id, 'chapter-2')
  const states = getRoadmapUnitStatuses(units, attempts)
  assert.equal(states.get('chapter-1'), 'completed')
  assert.equal(states.get('chapter-2'), 'current')
  assert.equal(states.get('chapter-3'), 'upcoming')
  assert.equal(states.get('revision'), 'locked')
})

test('percentage returns undefined instead of inventing a zero denominator score', () => {
  assert.equal(calculatePercentage(0, 0), undefined)
  assert.equal(calculatePercentage(3, 4), 75)
})
