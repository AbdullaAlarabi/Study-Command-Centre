import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildAcademicImportPayload } from './content/build-import'
import { loadAcademicPackage } from './content/content-package'
import { getFixedMockQuestions, gradeMock } from '../src/lib/mock'
import { getNextUnlockedUnit, isUnitComplete } from '../src/lib/progress'
import { gradeChapterQuiz, selectChapterQuizQuestions } from '../src/lib/quiz'
import { selectRevisionPracticeQuestions } from '../src/lib/revision'
import type { Attempt, CoreSeed, LearningUnit, Question } from '../src/types/database'

const content = loadAcademicPackage()
const seed = JSON.parse(readFileSync('src/data/core-seed.json', 'utf8')) as CoreSeed
const payload = buildAcademicImportPayload(content, seed)
const questions = payload.questions as Question[]
const updatedUnit = (unit: LearningUnit) => {
  const update = payload.learningUnitUpdates.find((candidate) => candidate.id === unit.id)
  return update ? { ...unit, title: update.title, content_json: update.content_json } as LearningUnit : unit
}
const units = seed.learningUnits.map(updatedUnit)

function attempt(unit: LearningUnit, status: Attempt['status']): Attempt {
  return {
    id: `${unit.id}-${status}`,
    user_id: 'student',
    assessment_id: unit.assessment_id,
    learning_unit_id: unit.id,
    attempt_number: 1,
    status,
    started_at: '2026-07-21T00:00:00Z',
    submitted_at: status === 'in_progress' ? null : '2026-07-21T00:10:00Z',
    selected_question_ids: [], answers_json: {}, mcq_correct: 0, mcq_total: 0,
    objective_percentage: 0, essay_word_count: 0, essay_score: null,
    total_percentage: null, weak_topics_json: [], duration_seconds: 600,
  }
}

test('all twelve chapter units preserve the exact supplied study-pack Markdown and stable ID', () => {
  const chapterUnits = units.filter((unit) => unit.unit_type === 'chapter')
  assert.equal(chapterUnits.length, 12)
  for (const pack of content.chapterPacks) {
    const unit = chapterUnits.find((candidate) => candidate.chapter_number === pack.chapter && seed.assessmentBlocks.find((assessment) => assessment.id === candidate.assessment_id)?.assessment_type === pack.assessmentBlock && seed.courses.find((course) => course.id === seed.assessmentBlocks.find((assessment) => assessment.id === candidate.assessment_id)?.course_id)?.code === pack.courseId)
    assert.ok(unit)
    assert.equal(unit.content_json.stableId, pack.stableId)
    assert.equal(unit.content_json.markdownBody, pack.body)
  }
})

test('chapter completion remains attempt-gated rather than checkbox-gated', () => {
  const chapter = units.find((unit) => unit.unit_type === 'chapter') as LearningUnit
  assert.equal(isUnitComplete(chapter, []), false)
  assert.equal(isUnitComplete(chapter, [attempt(chapter, 'failed')]), false)
  assert.equal(isUnitComplete(chapter, [attempt(chapter, 'passed')]), true)
})

test('every chapter bank draws exactly five chapter MCQs and one chapter essay', () => {
  for (const chapter of units.filter((unit) => unit.unit_type === 'chapter')) {
    const bank = questions.filter((question) => question.learning_unit_id === chapter.id)
    const selected = selectChapterQuizQuestions(bank, [], () => 0.42)
    assert.equal(selected.filter((question) => question.question_type === 'mcq').length, 5)
    assert.equal(selected.filter((question) => question.question_type === 'essay').length, 1)
    assert.ok(selected.every((question) => question.learning_unit_id === chapter.id))
    assert.equal(new Set(selected.map((question) => question.id)).size, 6)
  }
})

test('four correct MCQs and a non-empty essay pass provisionally; three correct do not', () => {
  const chapter = units.find((unit) => unit.unit_type === 'chapter') as LearningUnit
  const selected = selectChapterQuizQuestions(questions.filter((question) => question.learning_unit_id === chapter.id), [], () => 0.2)
  const mcqs = selected.filter((question) => question.question_type === 'mcq')
  const essay = selected.find((question) => question.question_type === 'essay') as Question
  const answers = Object.fromEntries([...mcqs.map((question, index) => [question.id, index < 4 ? question.correct_answer : '__wrong__']), [essay.id, 'A genuine response.']])
  assert.equal(gradeChapterQuiz(selected, answers).passed, true)
  answers[mcqs[3].id] = '__wrong__'
  assert.equal(gradeChapterQuiz(selected, answers).passed, false)
})

test('incorrect supplied topic tags feed chapter weak-topic results', () => {
  const chapter = units.find((unit) => unit.unit_type === 'chapter') as LearningUnit
  const selected = selectChapterQuizQuestions(questions.filter((question) => question.learning_unit_id === chapter.id), [], () => 0.3)
  const firstMcq = selected.find((question) => question.question_type === 'mcq') as Question
  const answers = Object.fromEntries(selected.map((question) => [question.id, question.question_type === 'essay' ? 'Response' : question.correct_answer]))
  answers[firstMcq.id] = '__wrong__'
  assert.ok(gradeChapterQuiz(selected, answers).weakTopics.includes(firstMcq.topic))
})

test('three passed chapters unlock the matching revision unit', () => {
  const assessment = seed.assessmentBlocks[0]
  const assessmentUnits = units.filter((unit) => unit.assessment_id === assessment.id)
  const chapters = assessmentUnits.filter((unit) => unit.unit_type === 'chapter')
  const attempts = chapters.map((chapter) => attempt(chapter, 'passed'))
  assert.equal(getNextUnlockedUnit(assessmentUnits, attempts)?.unit_type, 'revision')
})

test('revision content preserves all four supplied packs and mixed practice uses only the relevant three chapters', () => {
  assert.equal(units.filter((unit) => unit.unit_type === 'revision' && unit.content_json.stableId).length, 4)
  for (const revision of units.filter((unit) => unit.unit_type === 'revision')) {
    const chapterIds = new Set(units.filter((unit) => unit.assessment_id === revision.assessment_id && unit.unit_type === 'chapter').map((unit) => unit.id))
    const pool = questions.filter((question) => question.assessment_id === revision.assessment_id && question.question_type === 'mcq' && question.question_scope === 'chapter_quiz')
    const selected = selectRevisionPracticeQuestions(pool, [], () => 0.4)
    assert.equal(selected.length, 10)
    assert.ok(selected.every((question) => question.learning_unit_id && chapterIds.has(question.learning_unit_id)))
    assert.deepEqual([...chapterIds].map((id) => selected.filter((question) => question.learning_unit_id === id).length).sort(), [3, 3, 4])
  }
})

test('completed revision unlocks Mock 1 and submitted mocks unlock sequentially', () => {
  const assessmentUnits = units.filter((unit) => unit.assessment_id === seed.assessmentBlocks[0].id)
  const chapters = assessmentUnits.filter((unit) => unit.unit_type === 'chapter')
  const revision = assessmentUnits.find((unit) => unit.unit_type === 'revision') as LearningUnit
  const mocks = assessmentUnits.filter((unit) => unit.unit_type === 'mock').sort((a, b) => Number(a.mock_number) - Number(b.mock_number))
  const baseAttempts = [...chapters.map((unit) => attempt(unit, 'passed')), attempt(revision, 'passed')]
  assert.equal(getNextUnlockedUnit(assessmentUnits, baseAttempts)?.id, mocks[0].id)
  assert.equal(getNextUnlockedUnit(assessmentUnits, [...baseAttempts, attempt(mocks[0], 'submitted')])?.id, mocks[1].id)
  assert.equal(getNextUnlockedUnit(assessmentUnits, [...baseAttempts, attempt(mocks[0], 'submitted'), attempt(mocks[1], 'submitted')])?.id, mocks[2].id)
})

test('all twelve fixed mocks retain order, required structure, keys, explanations, and marking guides', () => {
  const mockUnits = units.filter((unit) => unit.unit_type === 'mock')
  assert.equal(mockUnits.length, 12)
  for (const unit of mockUnits) {
    const assessment = seed.assessmentBlocks.find((candidate) => candidate.id === unit.assessment_id)!
    const expectedEssays = assessment.assessment_type === 'midterm' ? 2 : 3
    const fixed = getFixedMockQuestions(questions.filter((question) => question.learning_unit_id === unit.id), expectedEssays)
    assert.equal(fixed.filter((question) => question.question_type === 'mcq').length, 5)
    assert.equal(fixed.filter((question) => question.question_type === 'essay').length, expectedEssays)
    assert.deepEqual(fixed.map((question) => question.display_order), Array.from({ length: fixed.length }, (_, index) => index + 1))
    assert.ok(fixed.filter((question) => question.question_type === 'mcq').every((question) => question.correct_answer && question.explanation))
    assert.ok(fixed.filter((question) => question.question_type === 'essay').every((question) => question.model_answer && question.marking_points_json?.length))
    assert.ok(fixed.every((question) => JSON.parse(question.source_reference).answerKeyStableId === unit.content_json.answerKeyStableId))
  }
})

test('fixed mock objective grading uses imported answers and topic tags', () => {
  const unit = units.find((candidate) => candidate.unit_type === 'mock') as LearningUnit
  const fixed = questions.filter((question) => question.learning_unit_id === unit.id)
  const answers = Object.fromEntries(fixed.map((question) => [question.id, question.question_type === 'mcq' ? question.correct_answer : 'Essay response']))
  const firstMcq = fixed.find((question) => question.question_type === 'mcq')!
  answers[firstMcq.id] = '__wrong__'
  const grade = gradeMock(fixed, answers)
  assert.equal(grade.mcqCorrect, 4)
  assert.ok(grade.weakTopics.includes(firstMcq.topic))
})

test('import payload has exact approved totals and no duplicate database IDs', () => {
  assert.deepEqual(payload.counts, { courseMaps: 2, chapterPacks: 12, chapterBankMcqs: 144, chapterBankEssays: 48, revisionPacks: 4, mockExams: 12, mockMcqs: 60, mockEssays: 30, answerKeys: 12 })
  assert.equal(payload.questions.length, 282)
  assert.equal(new Set(payload.questions.map((question) => question.id)).size, 282)
  assert.equal(payload.learningUnitUpdates.length, 28)
})
