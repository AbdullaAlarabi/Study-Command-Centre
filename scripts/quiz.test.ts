import assert from 'node:assert/strict'
import test from 'node:test'
import {
  countEssayWords,
  gradeChapterQuiz,
  selectChapterQuizQuestions,
} from '../src/lib/quiz'
import type { Question } from '../src/types/database'

function question(
  id: string,
  type: 'mcq' | 'essay',
  correctAnswer = 'A',
  topic = `topic-${id}`,
): Question {
  return {
    id,
    assessment_id: 'assessment',
    learning_unit_id: 'unit',
    question_scope: 'chapter_quiz',
    mock_number: null,
    question_type: type,
    topic,
    prompt: `Prompt ${id}`,
    options_json: type === 'mcq' ? ['Correct', 'Second', 'Third', 'Fourth'] : null,
    correct_answer: type === 'mcq' ? correctAnswer : null,
    explanation: type === 'mcq' ? 'Explanation' : null,
    model_answer: type === 'essay' ? 'Model answer' : null,
    marking_points_json: type === 'essay' ? ['Point'] : null,
    source_reference: 'Test fixture',
    difficulty: 'medium',
    display_order: 0,
    is_active: true,
  }
}

const bank = [
  ...Array.from({ length: 12 }, (_, index) => question(`mcq-${index + 1}`, 'mcq')),
  ...Array.from({ length: 4 }, (_, index) => question(`essay-${index + 1}`, 'essay')),
]

test('selection returns exactly five MCQs and one essay', () => {
  const selected = selectChapterQuizQuestions(bank, [], () => 0.5)
  assert.equal(selected.length, 6)
  assert.equal(selected.filter((item) => item.question_type === 'mcq').length, 5)
  assert.equal(selected.filter((item) => item.question_type === 'essay').length, 1)
})

test('selection avoids an identical immediately previous set when alternatives exist', () => {
  const first = selectChapterQuizQuestions(bank, [], () => 0.5)
  const second = selectChapterQuizQuestions(
    bank,
    first.map((item) => item.id),
    () => 0.5,
  )
  assert.notDeepEqual(
    new Set(second.map((item) => item.id)),
    new Set(first.map((item) => item.id)),
  )
})

test('essay word count handles repeated whitespace', () => {
  assert.equal(countEssayWords('  one   two\nthree  '), 3)
  assert.equal(countEssayWords(''), 0)
})

test('pass requires at least four correct MCQs and a sixty-word essay', () => {
  const selected = [...bank.slice(0, 5), bank[12]]
  const sixtyWords = Array.from({ length: 60 }, () => 'word').join(' ')
  const passingAnswers = Object.fromEntries([
    ...selected.slice(0, 4).map((item) => [item.id, 'A']),
    [selected[4].id, 'B'],
    [selected[5].id, sixtyWords],
  ])
  assert.equal(gradeChapterQuiz(selected, passingAnswers).passed, true)
  assert.equal(
    gradeChapterQuiz(selected, { ...passingAnswers, [selected[3].id]: 'B' }).passed,
    false,
  )
  assert.equal(
    gradeChapterQuiz(selected, { ...passingAnswers, [selected[5].id]: 'too short' }).passed,
    false,
  )
})

test('weak topics contain unique tags from incorrect MCQs only', () => {
  const selected = [
    question('one', 'mcq', 'A', 'pricing'),
    question('two', 'mcq', 'A', 'pricing'),
    question('three', 'mcq', 'A', 'research'),
    question('four', 'mcq', 'A', 'behavior'),
    question('five', 'mcq', 'A', 'value'),
    question('essay', 'essay'),
  ]
  const answers = {
    one: 'B',
    two: 'C',
    three: 'A',
    four: 'A',
    five: 'A',
    essay: Array.from({ length: 60 }, () => 'word').join(' '),
  }
  assert.deepEqual(gradeChapterQuiz(selected, answers).weakTopics, ['pricing'])
})
