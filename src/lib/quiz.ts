import type { Question } from '../types/database'

const optionKeys = ['A', 'B', 'C', 'D']

export interface ChapterQuizGrade {
  mcqCorrect: number
  mcqTotal: number
  objectivePercentage: number
  essayWordCount: number
  essaySubmitted: boolean
  passed: boolean
  weakTopics: string[]
  answerCorrectness: Record<string, boolean>
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function sameSelection(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every((id) => rightSet.has(id))
}

export function selectChapterQuizQuestions(
  questions: Question[],
  previousQuestionIds: string[] = [],
  random: () => number = Math.random,
) {
  const mcqPool = questions.filter(
    (question) => question.question_type === 'mcq' && question.is_active,
  )
  const essayPool = questions.filter(
    (question) => question.question_type === 'essay' && question.is_active,
  )

  if (mcqPool.length < 5 || essayPool.length < 1) {
    throw new Error('A chapter quiz requires at least 5 active MCQs and 1 active essay.')
  }

  let selectedMcqs = shuffle(mcqPool, random).slice(0, 5)
  let selectedEssay = shuffle(essayPool, random)[0]
  const previousMcqIds = previousQuestionIds.filter((id) =>
    mcqPool.some((question) => question.id === id),
  )
  const previousEssayId = previousQuestionIds.find((id) =>
    essayPool.some((question) => question.id === id),
  )

  if (
    mcqPool.length > 5 &&
    sameSelection(
      selectedMcqs.map((question) => question.id),
      previousMcqIds,
    )
  ) {
    const selectedIds = new Set(selectedMcqs.map((question) => question.id))
    const replacement = mcqPool.find((question) => !selectedIds.has(question.id))
    if (replacement) selectedMcqs = [...selectedMcqs.slice(0, 4), replacement]
  }

  if (essayPool.length > 1 && selectedEssay.id === previousEssayId) {
    selectedEssay = essayPool.find((question) => question.id !== previousEssayId) ?? selectedEssay
  }

  return [...selectedMcqs, selectedEssay]
}

export function countEssayWords(value: string) {
  const normalized = value.trim()
  return normalized ? normalized.split(/\s+/).length : 0
}

export function getCorrectAnswerKey(question: Question) {
  const answer = question.correct_answer?.trim()
  if (!answer) return ''
  const upper = answer.toUpperCase()
  if (optionKeys.includes(upper)) return upper
  const optionIndex = question.options_json?.findIndex(
    (option) => option.trim().toLowerCase() === answer.toLowerCase(),
  )
  return optionIndex !== undefined && optionIndex >= 0 ? optionKeys[optionIndex] : answer
}

export function gradeChapterQuiz(
  selectedQuestions: Question[],
  answers: Record<string, string>,
): ChapterQuizGrade {
  const mcqs = selectedQuestions.filter((question) => question.question_type === 'mcq')
  const essay = selectedQuestions.find((question) => question.question_type === 'essay')
  const answerCorrectness: Record<string, boolean> = {}
  const weakTopics = new Set<string>()
  let mcqCorrect = 0

  mcqs.forEach((question) => {
    const correct = answers[question.id] === getCorrectAnswerKey(question)
    answerCorrectness[question.id] = correct
    if (correct) mcqCorrect += 1
    else if (question.topic) weakTopics.add(question.topic)
  })

  const essayAnswer = essay ? (answers[essay.id] ?? '').trim() : ''
  const essayWordCount = countEssayWords(essayAnswer)
  const essaySubmitted = Boolean(essayAnswer)
  const mcqTotal = mcqs.length
  const objectivePercentage = mcqTotal
    ? Math.round((mcqCorrect / mcqTotal) * 10_000) / 100
    : 0

  return {
    mcqCorrect,
    mcqTotal,
    objectivePercentage,
    essayWordCount,
    essaySubmitted,
    passed: mcqTotal === 5 && mcqCorrect >= 4 && essaySubmitted,
    weakTopics: [...weakTopics],
    answerCorrectness,
  }
}

export function getQuizValidation(
  selectedQuestions: Question[],
  answers: Record<string, string>,
) {
  const mcqs = selectedQuestions.filter((question) => question.question_type === 'mcq')
  const essay = selectedQuestions.find((question) => question.question_type === 'essay')
  const unansweredMcqs = mcqs.filter((question) => !answers[question.id]).length
  const essayWordCount = essay ? countEssayWords(answers[essay.id] ?? '') : 0

  return {
    unansweredMcqs,
    essayWordCount,
    essayPresent: Boolean(essay && answers[essay.id]?.trim()),
    valid: mcqs.length === 5 && unansweredMcqs === 0 && Boolean(essay && answers[essay.id]?.trim()),
  }
}
