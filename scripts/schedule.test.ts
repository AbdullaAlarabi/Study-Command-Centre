import assert from 'node:assert/strict'
import test from 'node:test'
import coreSeed from '../src/data/core-seed.json'
import type { CoreSeed } from '../src/types/database'

const seed = coreSeed as CoreSeed

const approvedSchedule = [
  ['2026-07-21', 'MKT112 Chapter 4: Managing Marketing Information to Gain Customer Insights.'],
  ['2026-07-22', 'MKT112 Chapter 5: Consumer Markets and Buyer Behavior.'],
  ['2026-07-23', 'MKT112 Chapter 10: Pricing - Understanding and Capturing Customer Value. Confirm MKT TMA task.'],
  ['2026-07-24', 'MKT112 Practice: Chapters 4 and 5.'],
  ['2026-07-25', 'MKT112 Practice: Chapter 10 plus 10 mixed questions.'],
  ['2026-07-26', 'MKT112 Short mock across Chapters 4, 5, and 10.'],
  ['2026-07-27', 'MGT112 Chapter 7: Structuring and Designing Organizations.'],
  ['2026-07-28', 'MGT112 Chapter 8: Managing Human Resources and Diversity.'],
  ['2026-07-29', 'MGT112 Chapter 9: Managing Work Groups and Work Teams. Confirm MGT TMA task.'],
  ['2026-07-30', 'MGT112 Practice: Chapters 7 and 8.'],
  ['2026-07-31', 'MGT112 Practice: Chapter 9 plus 10 mixed questions.'],
  ['2026-08-01', 'MKT112 Second short mock and weak-topic review.'],
  ['2026-08-02', 'MKT112 Light final review and final TMA check.'],
  ['2026-08-03', 'MKT112 TMA submission and Midterm Exam. Later: 30 minutes MGT mixed questions.'],
  ['2026-08-04', 'MGT112 Short mock and final TMA check.'],
  ['2026-08-05', 'MGT112 TMA submission and Midterm Exam.'],
  ['2026-08-06', 'Light reset and organize final materials.'],
  ['2026-08-07', 'MKT112 Chapter 14: Integrated Marketing Communications Strategy.'],
  ['2026-08-08', 'MKT112 Chapter 17: Digital Marketing.'],
  ['2026-08-09', 'MKT112 Chapter 18: Creating Competitive Advantage.'],
  ['2026-08-10', 'MGT112 Chapter 10: Understanding Individual Behavior.'],
  ['2026-08-11', 'MGT112 Chapter 11: Motivating and Rewarding Employees.'],
  ['2026-08-12', 'MGT112 Chapter 12: Understanding Leadership.'],
  ['2026-08-13', 'MKT112 Chapter 14 practice.'],
  ['2026-08-14', 'MKT112 Chapter 17 practice.'],
  ['2026-08-15', 'MKT112 Chapter 18 practice.'],
  ['2026-08-16', 'MGT112 Chapter 10 practice.'],
  ['2026-08-17', 'MGT112 Chapter 11 practice.'],
  ['2026-08-18', 'MGT112 Chapter 12 practice.'],
  ['2026-08-19', 'MKT112 mixed practice, 30 questions.'],
  ['2026-08-20', 'MGT112 mixed practice, 30 questions.'],
  ['2026-08-21', 'MKT112 Mock Exam 1.'],
  ['2026-08-22', 'MGT112 Mock Exam 1.'],
  ['2026-08-23', 'MKT112 weak-area day.'],
  ['2026-08-24', 'MGT112 weak-area day.'],
  ['2026-08-25', 'MKT112 Mock Exam 2.'],
  ['2026-08-26', 'MGT112 Mock Exam 2.'],
  ['2026-08-27', 'MKT112 full revision.'],
  ['2026-08-28', 'MGT112 full revision.'],
  ['2026-08-29', 'MKT112 final practice questions.'],
  ['2026-08-30', 'MKT112 light review.'],
  ['2026-08-31', 'MKT112 Final Exam; later light MGT questions.'],
  ['2026-09-01', 'MGT112 final mixed review.'],
  ['2026-09-02', 'MGT112 Final Exam.'],
]

test('the approved schedule contains the exact 44 dated labels in order', () => {
  assert.equal(seed.studyTasks.length, 44)
  assert.deepEqual(seed.studyTasks.map((task) => [task.task_date, task.title]), approvedSchedule)
  assert.equal(new Set(seed.studyTasks.map((task) => task.id)).size, 44)
})

test('every schedule relationship resolves inside the deterministic core seed', () => {
  const courseIds = new Set(seed.courses.map((course) => course.id))
  const assessmentIds = new Set(seed.assessmentBlocks.map((assessment) => assessment.id))
  const unitIds = new Set(seed.learningUnits.map((unit) => unit.id))
  seed.studyTasks.forEach((task) => {
    if (task.course_id) assert.ok(courseIds.has(task.course_id), `${task.title}: invalid course`)
    if (task.assessment_id) assert.ok(assessmentIds.has(task.assessment_id), `${task.title}: invalid assessment`)
    if (task.learning_unit_id) assert.ok(unitIds.has(task.learning_unit_id), `${task.title}: invalid unit`)
  })
})

test('all four assessment roadmaps retain the approved 100% weights and undated Mock 3', () => {
  seed.assessmentBlocks.forEach((assessment) => {
    const units = seed.learningUnits.filter((unit) => unit.assessment_id === assessment.id)
    assert.equal(units.reduce((sum, unit) => sum + unit.completion_weight, 0), 100)
    const mock3 = units.find((unit) => unit.unit_type === 'mock' && unit.mock_number === 3)
    assert.ok(mock3, `${assessment.title}: missing Mock 3`)
    assert.equal(seed.studyTasks.some((task) => task.learning_unit_id === mock3.id), false)
  })
})
