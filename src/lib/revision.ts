import { getCorrectAnswerKey } from './quiz'
import type { Attempt, Question, StudyPackContent } from '../types/database'

export interface WeakTopicCount {
  topic: string
  count: number
}

export interface RevisionPracticeGrade {
  correct: number
  total: number
  percentage: number
  weakTopics: string[]
  answerCorrectness: Record<string, boolean>
}

function normalizeTopic(topic: string) {
  return topic.trim().toLocaleLowerCase()
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function getWeakTopicCounts(attempts: Attempt[], assessmentId: string) {
  const counts = new Map<string, WeakTopicCount>()

  attempts
    .filter(
      (attempt) =>
        attempt.assessment_id === assessmentId && attempt.status !== 'in_progress',
    )
    .forEach((attempt) => {
      attempt.weak_topics_json.forEach((topic) => {
        const normalized = normalizeTopic(topic)
        if (!normalized) return
        const current = counts.get(normalized)
        counts.set(normalized, {
          topic: current?.topic ?? topic.trim(),
          count: (current?.count ?? 0) + 1,
        })
      })
    })

  return [...counts.values()].sort(
    (left, right) => right.count - left.count || left.topic.localeCompare(right.topic),
  )
}

export function selectRevisionPracticeQuestions(
  questions: Question[],
  weakTopics: WeakTopicCount[] = [],
  random: () => number = Math.random,
) {
  const pool = questions.filter(
    (question) =>
      question.is_active &&
      question.question_scope === 'revision_practice' &&
      question.question_type === 'mcq',
  )

  if (pool.length < 10) {
    throw new Error('Mixed practice requires at least 10 active revision MCQs.')
  }

  const frequency = new Map(
    weakTopics.map((item) => [normalizeTopic(item.topic), item.count]),
  )
  const ranked = shuffle(pool, random).sort(
    (left, right) =>
      (frequency.get(normalizeTopic(right.topic)) ?? 0) -
      (frequency.get(normalizeTopic(left.topic)) ?? 0),
  )
  const selected: Question[] = []
  const selectedIds = new Set<string>()

  const chapterIds = [...new Set(ranked.flatMap((question) => question.learning_unit_id ?? []))]
  chapterIds.forEach((chapterId) => {
    const bestForChapter = ranked.find(
      (question) => question.learning_unit_id === chapterId && !selectedIds.has(question.id),
    )
    if (bestForChapter && selected.length < 10) {
      selected.push(bestForChapter)
      selectedIds.add(bestForChapter.id)
    }
  })

  ranked.forEach((question) => {
    if (selected.length < 10 && !selectedIds.has(question.id)) {
      selected.push(question)
      selectedIds.add(question.id)
    }
  })

  return selected
}

export function gradeRevisionPractice(
  questions: Question[],
  answers: Record<string, string>,
): RevisionPracticeGrade {
  let correct = 0
  const weakTopics = new Set<string>()
  const answerCorrectness: Record<string, boolean> = {}

  questions.forEach((question) => {
    const isCorrect = answers[question.id] === getCorrectAnswerKey(question)
    answerCorrectness[question.id] = isCorrect
    if (isCorrect) correct += 1
    else if (question.topic.trim()) weakTopics.add(question.topic.trim())
  })

  return {
    correct,
    total: questions.length,
    percentage: questions.length
      ? Math.round((correct / questions.length) * 10_000) / 100
      : 0,
    weakTopics: [...weakTopics],
    answerCorrectness,
  }
}

export function getWeakTopicReminder(topic: string, content: StudyPackContent) {
  const normalized = normalizeTopic(topic)
  const directReminder = Object.entries(content.weakTopicReminders ?? {}).find(
    ([key]) => normalizeTopic(key) === normalized,
  )?.[1]
  if (directReminder) return directReminder

  const definition = content.essentialDefinitions?.find((item) => {
    const term = normalizeTopic(item.term)
    return term.includes(normalized) || normalized.includes(term)
  })
  if (definition) return definition.definition

  const summary = content.chapterSummaries?.find((item) => {
    const label = normalizeTopic(`${item.topic ?? ''} ${item.title}`)
    return label.includes(normalized) || normalized.includes(label)
  })
  if (summary) return summary.summary

  const remember = content.mustRememberLists?.find((item) => {
    const label = normalizeTopic(item.title)
    return label.includes(normalized) || normalized.includes(label)
  })
  return remember?.items.slice(0, 2).join(' ')
}
