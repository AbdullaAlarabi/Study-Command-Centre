import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateOverallCompletion,
  getDaysSinceLatestActivity,
  getMockScoreComparison,
  getQuizScoreTrend,
  getWeakTopicRanking,
} from '../src/lib/analytics'
import type { AssessmentBlock, Attempt, LearningUnit } from '../src/types/database'

const assessments = [
  { id: 'a1', title: 'MKT112 Midterm' },
  { id: 'a2', title: 'MGT112 Midterm' },
  { id: 'a3', title: 'MKT112 Final' },
  { id: 'a4', title: 'MGT112 Final' },
] as AssessmentBlock[]

const units = [
  { id: 'c1', assessment_id: 'a1', unit_type: 'chapter', short_title: 'Chapter 4', completion_weight: 100, unlock_order: 1 },
  { id: 'c2', assessment_id: 'a2', unit_type: 'chapter', short_title: 'Chapter 7', completion_weight: 100, unlock_order: 1 },
  { id: 'm1', assessment_id: 'a1', unit_type: 'mock', title: 'Mock 1', short_title: 'Mock 1', mock_number: 1, completion_weight: 0, unlock_order: 2 },
] as LearningUnit[]

function attempt(overrides: Partial<Attempt>): Attempt {
  return {
    id: crypto.randomUUID(),
    user_id: 'student',
    assessment_id: 'a1',
    learning_unit_id: 'c1',
    attempt_number: 1,
    status: 'passed',
    started_at: '2026-07-20T10:00:00Z',
    submitted_at: '2026-07-20T10:10:00Z',
    selected_question_ids: [],
    answers_json: {},
    mcq_correct: 4,
    mcq_total: 5,
    objective_percentage: 80,
    essay_word_count: 10,
    essay_score: null,
    total_percentage: null,
    weak_topics_json: [],
    duration_seconds: 600,
    ...overrides,
  }
}

test('overall completion is the equal average of all four assessments', () => {
  assert.equal(calculateOverallCompletion(assessments, units, [attempt({})]), 25)
})

test('weak topics are normalized, counted, ranked, and ignore in-progress attempts', () => {
  const ranked = getWeakTopicRanking([
    attempt({ weak_topics_json: ['Segmentation', 'Pricing'] }),
    attempt({ weak_topics_json: ['segmentation'] }),
    attempt({ status: 'in_progress', weak_topics_json: ['Pricing'] }),
  ])
  assert.deepEqual(ranked, [
    { topic: 'Segmentation', count: 2 },
    { topic: 'Pricing', count: 1 },
  ])
})

test('quiz trend is chronological and contains chapter attempts only', () => {
  const trend = getQuizScoreTrend([
    attempt({ submitted_at: '2026-07-21T10:00:00Z', objective_percentage: 100 }),
    attempt({ submitted_at: '2026-07-20T10:00:00Z', objective_percentage: 60 }),
    attempt({ learning_unit_id: 'm1', submitted_at: '2026-07-19T10:00:00Z' }),
  ], units)
  assert.deepEqual(trend.map(({ label, score }) => ({ label, score })), [
    { label: 'Q1', score: 60 },
    { label: 'Q2', score: 100 },
  ])
})

test('mock comparison uses the latest attempt and marked total when available', () => {
  const comparison = getMockScoreComparison(assessments, [
    attempt({ learning_unit_id: 'm1', submitted_at: '2026-07-20T10:00:00Z', objective_percentage: 60 }),
    attempt({ learning_unit_id: 'm1', submitted_at: '2026-07-21T10:00:00Z', objective_percentage: 80, total_percentage: 72 }),
  ], units)
  assert.equal(comparison.length, 1)
  assert.equal(comparison[0].score, 72)
})

test('days since activity is stable and never negative', () => {
  assert.equal(getDaysSinceLatestActivity('2026-07-19T00:00:00Z', new Date('2026-07-21T12:00:00Z')), 2)
  assert.equal(getDaysSinceLatestActivity('2026-07-22T00:00:00Z', new Date('2026-07-21T12:00:00Z')), 0)
  assert.equal(getDaysSinceLatestActivity(), undefined)
})
