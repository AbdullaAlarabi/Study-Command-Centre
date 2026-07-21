import { loadAcademicPackage } from './content/content-package'

const expectedChapters = new Set([
  'MKT112-midterm-4',
  'MKT112-midterm-5',
  'MKT112-midterm-10',
  'MGT112-midterm-7',
  'MGT112-midterm-8',
  'MGT112-midterm-9',
  'MKT112-final-14',
  'MKT112-final-17',
  'MKT112-final-18',
  'MGT112-final-10',
  'MGT112-final-11',
  'MGT112-final-12',
])

const errors: string[] = []
const content = loadAcademicPackage()
const chapterKey = (course: string, block: string, chapter: number) => `${course}-${block}-${chapter}`
const assessmentKey = (course: string, block: string) => `${course}-${block}`

function expectEqual(label: string, actual: number, expected: number) {
  if (actual !== expected) errors.push(`${label}: expected ${expected}, found ${actual}`)
}

function expect(condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

expectEqual('Course maps', content.courseMaps.length, 2)
expectEqual('Chapter packs', content.chapterPacks.length, 12)
expectEqual('Chapter question banks', content.questionBanks.length, 12)
expectEqual('Revision packs', content.revisionPacks.length, 4)
expectEqual('Mock exams', content.mockPapers.length, 12)
expectEqual('Mock answer keys', content.answerKeys.length, 12)

const chapterQuestions = content.questionBanks.flatMap((bank) => bank.questions)
const chapterMcqs = chapterQuestions.filter((question) => question.type === 'mcq')
const chapterEssays = chapterQuestions.filter((question) => question.type === 'essay')
expectEqual('Chapter-bank MCQs', chapterMcqs.length, 144)
expectEqual('Chapter-bank essays', chapterEssays.length, 48)

const stableIds = [
  ...content.chapterPacks.map((item) => item.stableId),
  ...content.questionBanks.map((item) => item.stableId),
  ...content.revisionPacks.map((item) => item.stableId),
  ...content.mockPapers.map((item) => item.stableId),
  ...content.answerKeys.map((item) => item.stableId),
]
const duplicateStableIds = stableIds.filter((id, index) => stableIds.indexOf(id) !== index)
expect(duplicateStableIds.length === 0, `Duplicate content IDs: ${[...new Set(duplicateStableIds)].join(', ')}`)

const questionIds = chapterQuestions.map((question) => question.stableId)
const duplicateQuestionIds = questionIds.filter((id, index) => questionIds.indexOf(id) !== index)
expect(duplicateQuestionIds.length === 0, `Duplicate chapter question IDs: ${[...new Set(duplicateQuestionIds)].join(', ')}`)

chapterMcqs.forEach((question) => {
  expect(question.options?.length === 4 && question.options.every(Boolean), `${question.stableId}: expected four non-empty options`)
  expect(Boolean(question.correctAnswer && ['A', 'B', 'C', 'D'].includes(question.correctAnswer)), `${question.stableId}: invalid correct answer`)
  expect(Boolean(question.explanation), `${question.stableId}: missing explanation`)
  expect(Boolean(question.topic), `${question.stableId}: missing topic`)
})
chapterEssays.forEach((question) => {
  expect(Boolean(question.modelAnswer), `${question.stableId}: missing model answer`)
  expect(Boolean(question.markingPoints?.length), `${question.stableId}: missing marking points`)
  expect(Boolean(question.topic), `${question.stableId}: missing topic`)
})

const foundChapterKeys = new Set(content.chapterPacks.map((pack) => chapterKey(pack.courseId, pack.assessmentBlock, pack.chapter)))
expectedChapters.forEach((key) => expect(foundChapterKeys.has(key), `Missing chapter pack mapping: ${key}`))
foundChapterKeys.forEach((key) => expect(expectedChapters.has(key), `Unexpected chapter pack mapping: ${key}`))

content.questionBanks.forEach((bank) => {
  const key = chapterKey(bank.courseId, bank.assessmentBlock, bank.chapter)
  expect(expectedChapters.has(key), `${bank.stableId}: invalid chapter mapping ${key}`)
  expectEqual(`${bank.stableId} MCQs`, bank.questions.filter((question) => question.type === 'mcq').length, 12)
  expectEqual(`${bank.stableId} essays`, bank.questions.filter((question) => question.type === 'essay').length, 4)
})

content.chapterPacks.forEach((pack) => {
  const matchingBank = content.questionBanks.find((bank) => chapterKey(bank.courseId, bank.assessmentBlock, bank.chapter) === chapterKey(pack.courseId, pack.assessmentBlock, pack.chapter))
  expect(Boolean(matchingBank), `${pack.stableId}: no matching question bank`)
  expect(Boolean(pack.body && pack.sections.length), `${pack.stableId}: empty chapter content`)
})

content.revisionPacks.forEach((pack) => {
  expectEqual(`${pack.stableId} chapter mapping`, pack.chapters.length, 3)
  pack.chapters.forEach((chapter) => expect(expectedChapters.has(chapterKey(pack.courseId, pack.assessmentBlock, chapter)), `${pack.stableId}: invalid chapter ${chapter}`))
  expect(Boolean(pack.body && pack.sections.length), `${pack.stableId}: empty revision content`)
})

const expectedAssessments = new Set(['MKT112-midterm', 'MGT112-midterm', 'MKT112-final', 'MGT112-final'])
expectedAssessments.forEach((key) => {
  expectEqual(`${key} revision packs`, content.revisionPacks.filter((pack) => assessmentKey(pack.courseId, pack.assessmentBlock) === key).length, 1)
  expectEqual(`${key} mocks`, content.mockPapers.filter((mock) => assessmentKey(mock.courseId, mock.assessmentBlock) === key).length, 3)
})

content.mockPapers.forEach((mock) => {
  expect(expectedAssessments.has(assessmentKey(mock.courseId, mock.assessmentBlock)), `${mock.stableId}: invalid assessment mapping`)
  const expectedEssayCount = mock.assessmentBlock === 'midterm' ? 2 : 3
  const mcqs = mock.questions.filter((question) => question.type === 'mcq')
  const essays = mock.questions.filter((question) => question.type === 'essay')
  expectEqual(`${mock.stableId} MCQs`, mcqs.length, 5)
  expectEqual(`${mock.stableId} essays`, essays.length, expectedEssayCount)
  mcqs.forEach((question) => expect(question.options?.length === 4 && question.options.every(Boolean), `${question.stableId}: mock MCQ requires four options`))
  essays.forEach((question) => expect(Boolean(question.prompt), `${question.stableId}: empty essay prompt`))
  expect(new Set(mock.questions.map((question) => question.stableId)).size === mock.questions.length, `${mock.stableId}: duplicate fixed question IDs`)

  const key = content.answerKeys.find((candidate) => candidate.mockId === mock.stableId)
  expect(Boolean(key), `${mock.stableId}: missing answer key`)
  if (!key) return
  expect(key.courseId === mock.courseId && key.assessmentBlock === mock.assessmentBlock && key.mockNumber === mock.mockNumber, `${mock.stableId}: answer-key relationship mismatch`)
  expectEqual(`${key.stableId} answers`, key.answers.length, mock.questions.length)

  mock.questions.forEach((question) => {
    const answer = key.answers.find((candidate) => candidate.number === question.number && candidate.type === question.type)
    expect(Boolean(answer), `${question.stableId}: missing matching answer`)
    if (!answer) return
    if (question.type === 'mcq') {
      expect(Boolean(answer.correctAnswer && ['A', 'B', 'C', 'D'].includes(answer.correctAnswer)), `${question.stableId}: invalid mock answer`)
      expect(Boolean(answer.explanation && answer.topic && answer.source), `${question.stableId}: incomplete mock MCQ key`)
    } else {
      expect(answer.prompt === question.prompt, `${question.stableId}: paper/key essay wording mismatch`)
      expect(Boolean(answer.modelAnswer && answer.markingPoints?.length && answer.source), `${question.stableId}: incomplete essay marking guide`)
    }
  })
})

const keysWithoutMocks = content.answerKeys.filter((key) => !content.mockPapers.some((mock) => mock.stableId === key.mockId))
expect(keysWithoutMocks.length === 0, `Answer keys without mocks: ${keysWithoutMocks.map((key) => key.stableId).join(', ')}`)

console.log('Study Command Centre academic content audit')
console.log('===========================================')
console.log(`Course maps:             ${content.courseMaps.length}`)
console.log(`Chapter packs:           ${content.chapterPacks.length}`)
console.log(`Question banks:          ${content.questionBanks.length}`)
console.log(`Chapter-bank MCQs:       ${chapterMcqs.length}`)
console.log(`Chapter-bank essays:     ${chapterEssays.length}`)
console.log(`Revision packs:          ${content.revisionPacks.length}`)
console.log(`Mock exams:              ${content.mockPapers.length}`)
console.log(`Mock answer keys:        ${content.answerKeys.length}`)
console.log(`Supplied content IDs:    ${stableIds.length}`)
console.log(`Chapter question IDs:    ${questionIds.length}`)
console.log(`Validation errors:       ${errors.length}`)

if (errors.length) {
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log('Result: PASS — all supplied content is complete and internally mapped.')
}
