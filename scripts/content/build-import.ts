import type { CoreSeed, Difficulty, QuestionScope, QuestionType } from '../../src/types/database'
import {
  deterministicUuid,
  sourceReference,
  type AcademicPackage,
  type Frontmatter,
  type MockPaper,
} from './content-package'

export interface LearningUnitContentUpdate {
  id: string
  title: string
  content_json: Record<string, unknown>
}

export interface AcademicQuestionRow {
  id: string
  assessment_id: string
  learning_unit_id: string
  question_scope: QuestionScope
  mock_number: number | null
  question_type: QuestionType
  topic: string
  prompt: string
  options_json: string[] | null
  correct_answer: string | null
  explanation: string | null
  model_answer: string | null
  marking_points_json: string[] | null
  source_reference: string
  difficulty: Difficulty
  display_order: number
  is_active: boolean
}

export interface AcademicImportPayload {
  courseUpdates: Array<{ id: string; title: string }>
  learningUnitUpdates: LearningUnitContentUpdate[]
  questions: AcademicQuestionRow[]
  counts: {
    courseMaps: number
    chapterPacks: number
    chapterBankMcqs: number
    chapterBankEssays: number
    revisionPacks: number
    mockExams: number
    mockMcqs: number
    mockEssays: number
    answerKeys: number
  }
}

function stringValue(frontmatter: Frontmatter, key: string) {
  const value = frontmatter[key]
  if (typeof value !== 'string') throw new Error(`Missing ${key}`)
  return value
}

function documentTitle(body: string) {
  const title = body.match(/^# (.+)$/m)?.[1]?.trim()
  if (!title) throw new Error('Markdown document is missing its title')
  return title
}

function academicContentBase({
  stableId,
  contentType,
  relativePath,
  frontmatter,
  body,
}: {
  stableId: string
  contentType: string
  relativePath: string
  frontmatter: Frontmatter
  body: string
}) {
  return {
    academicContentVersion: 1,
    academicFormat: 'markdown-v1',
    stableId,
    contentType,
    sourceFile: relativePath,
    sourceMetadata: frontmatter,
    markdownBody: body,
  }
}

function mockQuestionRows({
  mock,
  assessmentId,
  learningUnitId,
  answerKey,
}: {
  mock: MockPaper
  assessmentId: string
  learningUnitId: string
  answerKey: AcademicPackage['answerKeys'][number]
}) {
  return mock.questions.map((question, index): AcademicQuestionRow => {
    const answer = answerKey.answers.find(
      (candidate) => candidate.number === question.number && candidate.type === question.type,
    )
    if (!answer) throw new Error(`${mock.stableId}: no answer for ${question.stableId}`)

    return {
      id: deterministicUuid(`mock-question:${question.stableId}`),
      assessment_id: assessmentId,
      learning_unit_id: learningUnitId,
      question_scope: 'mock',
      mock_number: mock.mockNumber,
      question_type: question.type,
      topic: answer.topic || answer.source,
      prompt: question.prompt,
      options_json: question.options,
      correct_answer: answer.correctAnswer,
      explanation: answer.explanation,
      model_answer: answer.modelAnswer,
      marking_points_json: answer.markingPoints,
      source_reference: sourceReference({
        stableId: question.stableId,
        mockStableId: mock.stableId,
        answerKeyStableId: answerKey.stableId,
        paperFile: mock.relativePath,
        answerKeyFile: answerKey.relativePath,
        source: answer.source,
        suggestedMaximumMark: question.maximumMark,
      }),
      difficulty: 'medium',
      display_order: index + 1,
      is_active: true,
    }
  })
}

export function buildAcademicImportPayload(
  content: AcademicPackage,
  seed: CoreSeed,
): AcademicImportPayload {
  const courseByCode = new Map(seed.courses.map((course) => [course.code, course]))
  const assessmentFor = (courseCode: string, assessmentBlock: 'midterm' | 'final') => {
    const course = courseByCode.get(courseCode)
    if (!course) throw new Error(`Unknown course ${courseCode}`)
    const assessment = seed.assessmentBlocks.find(
      (candidate) => candidate.course_id === course.id && candidate.assessment_type === assessmentBlock,
    )
    if (!assessment) throw new Error(`Unknown assessment ${courseCode}-${assessmentBlock}`)
    return assessment
  }
  const unitFor = (
    courseCode: string,
    assessmentBlock: 'midterm' | 'final',
    match: { chapter?: number; unitType?: 'revision'; mockNumber?: number },
  ) => {
    const assessment = assessmentFor(courseCode, assessmentBlock)
    const unit = seed.learningUnits.find((candidate) => {
      if (candidate.assessment_id !== assessment.id) return false
      if (match.chapter !== undefined) return candidate.unit_type === 'chapter' && candidate.chapter_number === match.chapter
      if (match.mockNumber !== undefined) return candidate.unit_type === 'mock' && candidate.mock_number === match.mockNumber
      return candidate.unit_type === match.unitType
    })
    if (!unit) throw new Error(`No learning unit for ${courseCode}-${assessmentBlock}-${JSON.stringify(match)}`)
    return { assessment, unit }
  }

  const questionBankByChapter = new Map(
    content.questionBanks.map((bank) => [
      `${bank.courseId}-${bank.assessmentBlock}-${bank.chapter}`,
      bank,
    ]),
  )
  const learningUnitUpdates: LearningUnitContentUpdate[] = []
  const questions: AcademicQuestionRow[] = []

  content.chapterPacks.forEach((pack) => {
    const { assessment, unit } = unitFor(pack.courseId, pack.assessmentBlock, { chapter: pack.chapter })
    const bank = questionBankByChapter.get(`${pack.courseId}-${pack.assessmentBlock}-${pack.chapter}`)
    if (!bank) throw new Error(`${pack.stableId}: missing mapped question bank`)
    const questionIds = bank.questions.map((question) => deterministicUuid(`chapter-question:${question.stableId}`))
    learningUnitUpdates.push({
      id: unit.id,
      title: pack.title,
      content_json: {
        ...academicContentBase({
          stableId: pack.stableId,
          contentType: 'chapter_pack',
          relativePath: pack.relativePath,
          frontmatter: pack.frontmatter,
          body: pack.body,
        }),
        markdownSections: pack.sections,
        questionBankStableId: bank.stableId,
        questionBankSourceFile: bank.relativePath,
        questionIds,
      },
    })

    bank.questions.forEach((question, index) => {
      questions.push({
        id: questionIds[index],
        assessment_id: assessment.id,
        learning_unit_id: unit.id,
        question_scope: 'chapter_quiz',
        mock_number: null,
        question_type: question.type,
        topic: question.topic,
        prompt: question.prompt,
        options_json: question.options,
        correct_answer: question.correctAnswer,
        explanation: question.explanation,
        model_answer: question.modelAnswer,
        marking_points_json: question.markingPoints,
        source_reference: sourceReference({
          stableId: question.stableId,
          bankStableId: bank.stableId,
          sourceFile: bank.relativePath,
          sourceSlides: question.sourceSlides,
        }),
        difficulty: 'medium',
        display_order: index + 1,
        is_active: true,
      })
    })
  })

  content.revisionPacks.forEach((pack) => {
    const { unit } = unitFor(pack.courseId, pack.assessmentBlock, { unitType: 'revision' })
    const reminders: Record<string, string> = {}
    content.questionBanks
      .filter((bank) => bank.courseId === pack.courseId && bank.assessmentBlock === pack.assessmentBlock)
      .flatMap((bank) => bank.questions)
      .filter((question) => question.type === 'mcq' && question.explanation)
      .forEach((question) => {
        if (!(question.topic in reminders)) reminders[question.topic] = question.explanation as string
      })
    learningUnitUpdates.push({
      id: unit.id,
      title: documentTitle(pack.body),
      content_json: {
        ...academicContentBase({
          stableId: pack.stableId,
          contentType: 'assessment_revision_pack',
          relativePath: pack.relativePath,
          frontmatter: pack.frontmatter,
          body: pack.body,
        }),
        markdownSections: pack.sections,
        weakTopicReminders: reminders,
        chapters: pack.chapters,
        examStructure: stringValue(pack.frontmatter, 'exam_structure'),
        examStructureBasis: stringValue(pack.frontmatter, 'exam_structure_basis'),
      },
    })
  })

  content.mockPapers.forEach((mock) => {
    const { assessment, unit } = unitFor(mock.courseId, mock.assessmentBlock, { mockNumber: mock.mockNumber })
    const answerKey = content.answerKeys.find((candidate) => candidate.mockId === mock.stableId)
    if (!answerKey) throw new Error(`${mock.stableId}: missing answer key`)
    const mockRows = mockQuestionRows({ mock, assessmentId: assessment.id, learningUnitId: unit.id, answerKey })
    questions.push(...mockRows)
    learningUnitUpdates.push({
      id: unit.id,
      title: documentTitle(mock.body),
      content_json: {
        ...academicContentBase({
          stableId: mock.stableId,
          contentType: 'mock_exam',
          relativePath: mock.relativePath,
          frontmatter: mock.frontmatter,
          body: mock.body,
        }),
        answerKeyStableId: answerKey.stableId,
        answerKeySourceFile: answerKey.relativePath,
        answerKeyMarkdown: answerKey.body,
        answerKeyMetadata: answerKey.frontmatter,
        questionIds: mockRows.map((question) => question.id),
        timeMinutes: mock.timeMinutes,
        chapters: mock.chapters,
        examStructureBasis: stringValue(mock.frontmatter, 'exam_structure_basis'),
        formatStatus: mock.courseId === 'MKT112' ? 'documented-project-assumption' : 'official-syllabus',
      },
    })
  })

  const courseUpdates = content.courseMaps.map((map) => {
    const courseCode = stringValue(map.frontmatter, 'course_id')
    const course = courseByCode.get(courseCode)
    if (!course) throw new Error(`Unknown course map ${courseCode}`)
    return { id: course.id, title: stringValue(map.frontmatter, 'title') }
  })

  return {
    courseUpdates,
    learningUnitUpdates,
    questions,
    counts: {
      courseMaps: content.courseMaps.length,
      chapterPacks: content.chapterPacks.length,
      chapterBankMcqs: content.questionBanks.flatMap((bank) => bank.questions).filter((question) => question.type === 'mcq').length,
      chapterBankEssays: content.questionBanks.flatMap((bank) => bank.questions).filter((question) => question.type === 'essay').length,
      revisionPacks: content.revisionPacks.length,
      mockExams: content.mockPapers.length,
      mockMcqs: content.mockPapers.flatMap((mock) => mock.questions).filter((question) => question.type === 'mcq').length,
      mockEssays: content.mockPapers.flatMap((mock) => mock.questions).filter((question) => question.type === 'essay').length,
      answerKeys: content.answerKeys.length,
    },
  }
}
