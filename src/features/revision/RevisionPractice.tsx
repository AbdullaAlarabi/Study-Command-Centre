import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Eye,
  RefreshCw,
  RotateCcw,
  Save,
  Target,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { ProgressBar } from '../../components/ProgressBar'
import { StatusBadge } from '../../components/StatusBadge'
import {
  startRevisionPracticeAttempt,
  submitRevisionPracticeAttempt,
} from '../../lib/data'
import { getCorrectAnswerKey } from '../../lib/quiz'
import {
  gradeRevisionPractice,
  selectRevisionPracticeQuestions,
  type RevisionPracticeGrade,
  type WeakTopicCount,
} from '../../lib/revision'
import type { Attempt, AttemptAnswer, LearningUnit, Question } from '../../types/database'

const optionKeys = ['A', 'B', 'C', 'D']

interface PracticeBackup {
  version: 1
  attemptId: string
  selectedQuestionIds: string[]
  answers: Record<string, string>
  currentIndex: number
}

interface PracticeResult {
  attempt: Attempt
  grade: RevisionPracticeGrade
  questions: Question[]
  answers: Record<string, string>
}

function practiceBackupKey(userId: string, unitId: string) {
  return `study-command-centre:revision-practice:${userId}:${unitId}`
}

function readPracticeBackup(key: string) {
  try {
    const value = localStorage.getItem(key)
    if (!value) return null
    const parsed = JSON.parse(value) as Partial<PracticeBackup>
    if (
      parsed.version !== 1 ||
      typeof parsed.attemptId !== 'string' ||
      !Array.isArray(parsed.selectedQuestionIds) ||
      typeof parsed.answers !== 'object' ||
      parsed.answers === null ||
      typeof parsed.currentIndex !== 'number'
    ) return null
    return parsed as PracticeBackup
  } catch {
    return null
  }
}

function answerLabel(question: Question, answer?: string) {
  if (!answer) return 'No answer'
  const option = question.options_json?.[optionKeys.indexOf(answer)]
  return option ? `${answer}. ${option}` : answer
}

export function RevisionPractice({
  userId,
  role,
  unit,
  questions,
  attempts,
  weakTopics,
  onSubmitted,
}: {
  userId?: string
  role?: 'student' | 'coach'
  unit: LearningUnit
  questions: Question[]
  attempts: Attempt[]
  weakTopics: WeakTopicCount[]
  onSubmitted: (attempt: Attempt) => void
}) {
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [validationVisible, setValidationVisible] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState<PracticeResult | null>(null)
  const initialized = useRef(false)
  const submissionInFlight = useRef(false)
  const storageKey = userId ? practiceBackupKey(userId, unit.id) : ''

  useEffect(() => {
    if (initialized.current || role !== 'student' || !userId) return
    initialized.current = true
    const activeAttempt = attempts.find(
      (candidate) =>
        candidate.learning_unit_id === unit.id &&
        candidate.status === 'in_progress' &&
        candidate.mcq_total === 10 &&
        candidate.selected_question_ids.length === 10,
    )
    if (!activeAttempt) return
    const restoredQuestions = activeAttempt.selected_question_ids
      .map((id) => questions.find((question) => question.id === id))
      .filter((question): question is Question => Boolean(question))
    if (restoredQuestions.length !== 10) return

    setAttempt(activeAttempt)
    setSelectedQuestions(restoredQuestions)
    const backup = readPracticeBackup(practiceBackupKey(userId, unit.id))
    if (
      backup?.attemptId === activeAttempt.id &&
      backup.selectedQuestionIds.length === activeAttempt.selected_question_ids.length &&
      backup.selectedQuestionIds.every((id, index) => id === activeAttempt.selected_question_ids[index])
    ) {
      setAnswers(backup.answers)
      setCurrentIndex(Math.min(Math.max(backup.currentIndex, 0), 9))
      setNotice('Your saved mixed practice was restored on this device.')
    } else {
      setNotice('Your unfinished practice set was restored. Local answers from another device are not available.')
    }
  }, [attempts, questions, role, unit.id, userId])

  useEffect(() => {
    if (!attempt || !storageKey || result) return
    const backup: PracticeBackup = {
      version: 1,
      attemptId: attempt.id,
      selectedQuestionIds: selectedQuestions.map((question) => question.id),
      answers,
      currentIndex,
    }
    localStorage.setItem(storageKey, JSON.stringify(backup))
  }, [answers, attempt, currentIndex, result, selectedQuestions, storageKey])

  const answeredCount = selectedQuestions.filter((question) => answers[question.id]).length
  const activeQuestion = selectedQuestions[currentIndex]
  const allAnswered = selectedQuestions.length === 10 && answeredCount === 10
  const topicCount = new Set(questions.map((question) => question.topic)).size

  async function handleStart() {
    if (!userId || role !== 'student' || starting) return
    setStarting(true)
    setError('')
    setNotice('')
    try {
      const completedPracticeCount = attempts.filter(
        (candidate) =>
          candidate.learning_unit_id === unit.id &&
          candidate.status === 'submitted' &&
          candidate.mcq_total === 10,
      ).length
      const selected = selectRevisionPracticeQuestions(
        questions,
        weakTopics,
        Math.random,
        completedPracticeCount,
      )
      const started = await startRevisionPracticeAttempt({
        userId,
        assessmentId: unit.assessment_id,
        learningUnitId: unit.id,
        selectedQuestionIds: selected.map((question) => question.id),
      })
      setAttempt(started.attempt)
      setSelectedQuestions(selected)
      setAnswers({})
      setCurrentIndex(0)
      setValidationVisible(false)
      setResult(null)
      if (started.activityWarning) setNotice('Practice started, but the activity notification could not be recorded.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not start mixed practice.')
    } finally {
      setStarting(false)
    }
  }

  async function handleSubmit() {
    if (!userId || !attempt || submitting || submissionInFlight.current) return
    setValidationVisible(true)
    setError('')
    if (!allAnswered) return
    submissionInFlight.current = true
    setSubmitting(true)

    try {
      const grade = gradeRevisionPractice(selectedQuestions, answers)
      const savedAnswers = Object.fromEntries(
        selectedQuestions.map((question) => {
          const answer: AttemptAnswer = {
            questionId: question.id,
            answer: answers[question.id],
            isCorrect: grade.answerCorrectness[question.id],
          }
          return [question.id, answer]
        }),
      )
      const durationSeconds = Math.max(0, Math.round((Date.now() - new Date(attempt.started_at).getTime()) / 1000))
      const submitted = await submitRevisionPracticeAttempt({
        attemptId: attempt.id,
        userId,
        answers: savedAnswers,
        correct: grade.correct,
        total: grade.total,
        percentage: grade.percentage,
        weakTopics: grade.weakTopics,
        durationSeconds,
      })
      if (storageKey) localStorage.removeItem(storageKey)
      setAttempt(submitted.attempt)
      setResult({ attempt: submitted.attempt, grade, questions: selectedQuestions, answers })
      setNotice(submitted.activityWarning ? 'Your score was saved, but its activity notification could not be recorded.' : 'Your mixed-practice result was saved.')
      onSubmitted(submitted.attempt)
      requestAnimationFrame(() => document.getElementById('revision-practice')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not submit mixed practice.')
    } finally {
      submissionInFlight.current = false
      setSubmitting(false)
    }
  }

  function resetPractice() {
    setAttempt(null)
    setSelectedQuestions([])
    setAnswers({})
    setCurrentIndex(0)
    setValidationVisible(false)
    setResult(null)
    setError('')
    setNotice('')
  }

  if (questions.length < 10) {
    return (
      <EmptyState
        title="Mixed-practice bank not populated yet"
        description={`This assessment currently has ${questions.length} active revision MCQs. At least 10 are required across its three chapters.`}
        icon={Target}
      />
    )
  }

  if (role === 'coach') {
    return (
      <div className="rounded-card border border-teal/20 bg-teal-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Eye className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" size={21} />
          <div>
            <h3 className="font-bold text-navy">Coach practice preview</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">The bank contains {questions.length} active questions across {topicCount} topics. Coach preview does not create a practice attempt or change student progress.</p>
          </div>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="space-y-5">
        {notice && <p role="status" className="rounded-xl border border-teal/20 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}
        <section className="rounded-card border border-teal/20 bg-teal-50 p-6 shadow-card sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Mixed practice complete</p>
              <h3 className="mt-2 text-2xl font-bold text-navy">{result.grade.correct} of {result.grade.total} correct</h3>
              <p className="mt-2 text-sm text-slate-600">Review every explanation below, then return to any weak sections.</p>
            </div>
            <p className="text-4xl font-bold text-navy">{result.grade.percentage}%</p>
          </div>
        </section>

        <div className="space-y-4">
          {result.questions.map((question, index) => {
            const correct = result.grade.answerCorrectness[question.id]
            return (
              <article key={question.id} className={`rounded-card border bg-surface p-5 shadow-card sm:p-6 ${correct ? 'border-teal/20' : 'border-risk/20'}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${correct ? 'bg-teal-50 text-teal-700' : 'bg-risk-50 text-risk'}`}>{correct ? <Check aria-hidden="true" size={18} /> : <X aria-hidden="true" size={18} />}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Question {index + 1} · {question.topic}</p>
                    <h4 className="mt-2 font-bold leading-6 text-navy">{question.prompt}</h4>
                    <p className="mt-3 text-sm text-slate-600"><span className="font-semibold">Your answer:</span> {answerLabel(question, result.answers[question.id])}</p>
                    <p className="mt-1 text-sm text-slate-600"><span className="font-semibold">Correct answer:</span> {answerLabel(question, getCorrectAnswerKey(question))}</p>
                    <p className="mt-4 rounded-xl bg-navy-50 p-4 text-sm leading-6 text-slate-700">{question.explanation || 'No explanation has been added to this verified question yet.'}</p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-navy/15 bg-white px-5 font-bold text-navy hover:bg-navy-50" type="button" onClick={resetPractice}><RotateCcw aria-hidden="true" size={18} /> Practice another set</button>
      </div>
    )
  }

  if (!attempt || !activeQuestion) {
    return (
      <div className="space-y-4">
        {error && <ErrorState title="Could not start practice" message={error} />}
        <div className="rounded-card border border-navy/10 bg-surface p-6 shadow-card sm:p-7">
          <span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700"><Target aria-hidden="true" size={22} /></span>
          <h3 className="mt-4 text-xl font-bold text-navy">Ten-question mixed practice</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Questions span all three chapters and prioritize your most frequently missed topics. Results and explanations appear immediately after submission.</p>
          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-muted"><Save aria-hidden="true" size={16} /> Answers are backed up on this device until saved.</p>
          <button className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={starting} onClick={() => void handleStart()}>{starting ? <><RefreshCw className="animate-spin" aria-hidden="true" size={18} /> Building practice…</> : <>Start mixed practice <ArrowRight aria-hidden="true" size={18} /></>}</button>
        </div>
      </div>
    )
  }

  const activeAnswer = answers[activeQuestion.id] ?? ''
  const activeInvalid = validationVisible && !activeAnswer

  return (
    <div className="space-y-5">
      {notice && <p role="status" className="rounded-xl border border-teal/20 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}
      {error && <ErrorState title="Practice was not saved" message={error} onRetry={() => void handleSubmit()} />}
      <section className="rounded-card border border-navy/10 bg-surface p-4 shadow-card sm:p-6">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-navy">Question {currentIndex + 1} of 10</p><p className="text-xs font-semibold text-muted">{answeredCount} answered</p></div>
        <div className="mt-3"><ProgressBar value={answeredCount * 10} showValue={false} /></div>
        <nav aria-label="Practice questions" className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {selectedQuestions.map((question, index) => {
            const answered = Boolean(answers[question.id])
            const selected = index === currentIndex
            const invalid = validationVisible && !answered
            return <button key={question.id} className={`min-h-11 rounded-xl border text-sm font-bold ${selected ? 'border-navy bg-navy text-white' : invalid ? 'border-risk/30 bg-risk-50 text-risk' : answered ? 'border-teal/25 bg-teal-50 text-teal-800' : 'border-navy/10 bg-white text-navy hover:border-teal/40'}`} type="button" aria-current={selected ? 'step' : undefined} onClick={() => setCurrentIndex(index)}>{index + 1}</button>
          })}
        </nav>
      </section>

      <section className={`rounded-card border bg-surface p-5 shadow-card sm:p-8 ${activeInvalid ? 'border-risk/35' : 'border-navy/10'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3"><StatusBadge status="on-track" label={activeQuestion.topic} /><span className="text-xs font-semibold text-muted">Required</span></div>
        <h3 className="mt-6 text-lg font-bold leading-7 text-navy sm:text-xl">{activeQuestion.prompt}</h3>
        <fieldset className="mt-6 space-y-3">
          <legend className="sr-only">Choose one answer</legend>
          {(activeQuestion.options_json ?? []).map((option, index) => {
            const key = optionKeys[index] ?? String(index + 1)
            const selected = activeAnswer === key
            return <label key={`${activeQuestion.id}-${key}`} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-4 ${selected ? 'border-teal bg-teal-50 ring-2 ring-teal/10' : 'border-navy/10 bg-white hover:border-teal/35'}`}><input className="mt-1 size-4 accent-teal" type="radio" name={`practice-${activeQuestion.id}`} value={key} checked={selected} onChange={() => setAnswers((current) => ({ ...current, [activeQuestion.id]: key }))} /><span className="text-sm font-bold text-navy">{key}</span><span className="text-sm leading-6 text-slate-700">{option}</span></label>
          })}
        </fieldset>
        {activeInvalid && <p role="alert" className="mt-4 flex items-start gap-2 text-sm font-semibold text-risk"><AlertCircle className="mt-0.5 shrink-0" aria-hidden="true" size={17} /> Choose an answer before submitting.</p>}
      </section>

      {validationVisible && !allAnswered && <p role="alert" className="rounded-xl border border-risk/20 bg-risk-50 p-4 text-sm leading-6 text-risk-700">Answer all ten questions. Use the numbered buttons to jump to anything missing.</p>}

      <div className="sticky bottom-20 z-20 flex flex-col gap-3 rounded-card border border-navy/10 bg-surface/95 p-3 shadow-lift backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-navy/15 px-5 font-semibold text-navy hover:bg-navy-50 disabled:opacity-40" type="button" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}><ArrowLeft aria-hidden="true" size={18} /> Previous</button>
        {currentIndex < 9 ? <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800" type="button" onClick={() => setCurrentIndex((index) => Math.min(9, index + 1))}>Next <ArrowRight aria-hidden="true" size={18} /></button> : <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800 disabled:opacity-60" type="button" disabled={submitting} onClick={() => void handleSubmit()}>{submitting ? <><RefreshCw className="animate-spin" aria-hidden="true" size={18} /> Saving…</> : <><ClipboardCheck aria-hidden="true" size={18} /> Submit practice</>}</button>}
      </div>
    </div>
  )
}
