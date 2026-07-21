import { getCorrectAnswerKey } from './quiz'
import type { Question } from '../types/database'

export function getQuestionSourceMetadata(question: Question) {
  try {
    const parsed = JSON.parse(question.source_reference) as Record<string, unknown>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getSuggestedMaximumMark(question: Question) {
  const value = getQuestionSourceMetadata(question).suggestedMaximumMark
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

export interface MockGrade {
  mcqCorrect: number
  mcqTotal: number
  objectivePercentage: number
  essaySubmitted: number
  essayTotal: number
  weakTopics: string[]
  answerCorrectness: Record<string, boolean>
}

export function getFixedMockQuestions(questions: Question[], essayCount: number) {
  const active = questions
    .filter((question) => question.is_active && question.question_scope === 'mock')
    .sort((left, right) => left.display_order - right.display_order)
  const mcqs = active.filter((question) => question.question_type === 'mcq')
  const essays = active.filter((question) => question.question_type === 'essay')
  if (mcqs.length !== 5 || essays.length !== essayCount) {
    throw new Error(`This fixed mock requires 5 MCQs and ${essayCount} essays.`)
  }
  return [...mcqs, ...essays]
}

export function gradeMock(
  questions: Question[],
  answers: Record<string, string>,
): MockGrade {
  const mcqs = questions.filter((question) => question.question_type === 'mcq')
  const essays = questions.filter((question) => question.question_type === 'essay')
  const answerCorrectness: Record<string, boolean> = {}
  const weakTopics = new Set<string>()
  let mcqCorrect = 0

  mcqs.forEach((question) => {
    const correct = answers[question.id] === getCorrectAnswerKey(question)
    answerCorrectness[question.id] = correct
    if (correct) mcqCorrect += 1
    else if (question.topic.trim()) weakTopics.add(question.topic.trim())
  })

  return {
    mcqCorrect,
    mcqTotal: mcqs.length,
    objectivePercentage: mcqs.length ? Math.round((mcqCorrect / mcqs.length) * 10_000) / 100 : 0,
    essaySubmitted: essays.filter((question) => Boolean(answers[question.id]?.trim())).length,
    essayTotal: essays.length,
    weakTopics: [...weakTopics],
    answerCorrectness,
  }
}

export function calculateMarkedMockTotal({
  mcqCorrect,
  essayMarks,
  essayMaximumMarks,
}: {
  mcqCorrect: number
  essayMarks: number[]
  essayMaximumMarks: number[]
}) {
  const earned = mcqCorrect * 2 + essayMarks.reduce((sum, mark) => sum + mark, 0)
  const maximum = 10 + essayMaximumMarks.reduce((sum, mark) => sum + mark, 0)
  return maximum ? Math.round((earned / maximum) * 10_000) / 100 : 0
}

export function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}
