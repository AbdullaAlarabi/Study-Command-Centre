import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getWeakTopicCounts,
  getWeakTopicReminder,
  gradeRevisionPractice,
  selectRevisionPracticeQuestions,
} from '../src/lib/revision'
import type { Attempt, Question } from '../src/types/database'

function question(id: string, chapter: string, topic: string, correctAnswer = 'A'): Question {
  return {
    id,
    assessment_id: 'assessment',
    learning_unit_id: chapter,
    question_scope: 'revision_practice',
    mock_number: null,
    question_type: 'mcq',
    topic,
    prompt: `Prompt ${id}`,
    options_json: ['Correct', 'Second', 'Third', 'Fourth'],
    correct_answer: correctAnswer,
    explanation: `Explanation ${id}`,
    model_answer: null,
    marking_points_json: null,
    source_reference: 'Test source',
    difficulty: 'medium',
    display_order: 0,
    is_active: true,
  }
}

function attempt(id: string, topics: string[], status: Attempt['status'] = 'failed'): Attempt {
  return {
    id,
    user_id: 'student',
    assessment_id: 'assessment',
    learning_unit_id: 'unit',
    attempt_number: 1,
    status,
    started_at: '2026-07-21T10:00:00Z',
    submitted_at: status === 'in_progress' ? null : '2026-07-21T10:05:00Z',
    selected_question_ids: [],
    answers_json: {},
    mcq_correct: 0,
    mcq_total: 0,
    objective_percentage: 0,
    essay_word_count: 0,
    essay_score: null,
    total_percentage: null,
    weak_topics_json: topics,
    duration_seconds: 300,
  }
}

const bank = Array.from({ length: 15 }, (_, index) => {
  const chapter = `chapter-${(index % 3) + 1}`
  return question(`question-${index + 1}`, chapter, index < 4 ? 'pricing' : `topic-${index}`)
})

test('weak topics are counted across completed assessment attempts and sorted by frequency', () => {
  const result = getWeakTopicCounts([
    attempt('one', ['Pricing', 'research']),
    attempt('two', ['pricing']),
    attempt('three', ['ignored'], 'in_progress'),
    { ...attempt('other', ['other']), assessment_id: 'other-assessment' },
  ], 'assessment')
  assert.deepEqual(result, [
    { topic: 'Pricing', count: 2 },
    { topic: 'research', count: 1 },
  ])
})

test('mixed practice selects ten unique MCQs and includes every chapter', () => {
  const selected = selectRevisionPracticeQuestions(bank, [], () => 0.4)
  assert.equal(selected.length, 10)
  assert.equal(new Set(selected.map((item) => item.id)).size, 10)
  assert.deepEqual(new Set(selected.map((item) => item.learning_unit_id)), new Set(['chapter-1', 'chapter-2', 'chapter-3']))
  assert.deepEqual(
    ['chapter-1', 'chapter-2', 'chapter-3'].map((chapter) => selected.filter((item) => item.learning_unit_id === chapter).length),
    [4, 3, 3],
  )
  const rotated = selectRevisionPracticeQuestions(bank, [], () => 0.4, 1)
  assert.deepEqual(
    ['chapter-1', 'chapter-2', 'chapter-3'].map((chapter) => rotated.filter((item) => item.learning_unit_id === chapter).length),
    [3, 4, 3],
  )
})

test('mixed practice prioritizes frequently weak topics', () => {
  const selected = selectRevisionPracticeQuestions(bank, [{ topic: 'pricing', count: 5 }], () => 0.4)
  assert.equal(selected.filter((item) => item.topic === 'pricing').length, 4)
})

test('mixed practice grading returns score, correctness, and unique weak topics', () => {
  const selected = bank.slice(0, 10)
  const answers = Object.fromEntries(selected.map((item, index) => [item.id, index < 7 ? 'A' : 'B']))
  const grade = gradeRevisionPractice(selected, answers)
  assert.equal(grade.correct, 7)
  assert.equal(grade.total, 10)
  assert.equal(grade.percentage, 70)
  assert.deepEqual(grade.weakTopics, ['topic-7', 'topic-8', 'topic-9'])
})

test('weak-topic reminders prefer direct reminders and fall back to revision definitions', () => {
  assert.equal(getWeakTopicReminder('pricing', { weakTopicReminders: { Pricing: 'Direct reminder' } }), 'Direct reminder')
  assert.equal(getWeakTopicReminder('motivation', { essentialDefinitions: [{ term: 'Motivation', definition: 'Definition reminder' }] }), 'Definition reminder')
})
