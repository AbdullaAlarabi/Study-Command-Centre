import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Flag,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { ProgressBar } from '../components/ProgressBar'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../features/auth/AuthProvider'
import { useStudentOverview } from '../features/student/useStudentOverview'
import {
  getChapterQuizQuestions,
  startChapterQuizAttempt,
  submitChapterQuizAttempt,
} from '../lib/data'
import { getNextUnlockedUnit } from '../lib/progress'
import {
  countEssayWords,
  getCorrectAnswerKey,
  getQuizValidation,
  gradeChapterQuiz,
  selectChapterQuizQuestions,
  type ChapterQuizGrade,
} from '../lib/quiz'
import type { Attempt, AttemptAnswer, LearningUnit, Question } from '../types/database'

const optionKeys = ['A', 'B', 'C', 'D']

interface QuizBackup {
  version: 1
  attemptId: string
  attemptNumber: number
  selectedQuestionIds: string[]
  answers: Record<string, string>
  currentIndex: number
  startedAt: string
}

interface QuizResult {
  attempt: Attempt
  grade: ChapterQuizGrade
  questions: Question[]
  answers: Record<string, string>
}

function backupKey(userId: string, unitId: string) {
  return `study-command-centre:chapter-quiz:${userId}:${unitId}`
}

function readBackup(key: string): QuizBackup | null {
  try {
    const value = window.localStorage.getItem(key)
    if (!value) return null
    const parsed = JSON.parse(value) as Partial<QuizBackup>
    if (
      parsed.version !== 1 ||
      typeof parsed.attemptId !== 'string' ||
      typeof parsed.attemptNumber !== 'number' ||
      !Array.isArray(parsed.selectedQuestionIds) ||
      typeof parsed.answers !== 'object' ||
      parsed.answers === null ||
      typeof parsed.currentIndex !== 'number' ||
      typeof parsed.startedAt !== 'string'
    ) {
      return null
    }
    return parsed as QuizBackup
  } catch {
    return null
  }
}

function unitPath(unit: LearningUnit) {
  if (unit.unit_type === 'chapter') return `/student/chapter/${unit.id}`
  if (unit.unit_type === 'revision') return `/student/revision/${unit.id}`
  return `/student/mock/${unit.id}`
}

function answerLabel(question: Question, answer?: string) {
  if (!answer) return 'No answer'
  const optionIndex = optionKeys.indexOf(answer)
  const option = optionIndex >= 0 ? question.options_json?.[optionIndex] : undefined
  return option ? `${answer}. ${option}` : answer
}

function CoachQuizPreview({ questions }: { questions: Question[] }) {
  const mcqs = questions.filter((question) => question.question_type === 'mcq')
  const essays = questions.filter((question) => question.question_type === 'essay')

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-teal/20 bg-teal-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Eye className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" size={21} />
          <div>
            <h2 className="font-bold text-navy">Coach preview</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              This view does not start an attempt or change Khalid&apos;s progress. The student will receive a random selection of five MCQs and one essay.
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {questions.map((question, index) => (
          <article key={question.id} className="rounded-card border border-navy/10 bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge
                status={question.question_type === 'essay' ? 'needs-attention' : 'on-track'}
                label={question.question_type === 'essay' ? 'Essay' : 'MCQ'}
              />
              <span className="text-xs font-semibold text-muted">Bank item {index + 1}</span>
            </div>
            <h2 className="mt-4 font-bold leading-6 text-navy">{question.prompt}</h2>
            <p className="mt-3 text-sm text-muted">Topic: {question.topic}</p>
          </article>
        ))}
      </div>
      <p className="text-sm text-muted">Available: {mcqs.length} MCQs and {essays.length} essays.</p>
    </div>
  )
}

export function ChapterQuizPage() {
  const { unitId } = useParams()
  const { user, profile } = useAuth()
  const overview = useStudentOverview(user?.id)
  const [questionBank, setQuestionBank] = useState<Question[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [questionError, setQuestionError] = useState('')
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [validationVisible, setValidationVisible] = useState(false)
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState<QuizResult | null>(null)
  const initializedFor = useRef('')
  const submissionInFlight = useRef(false)
  const previousSelection = useRef<string[]>([])
  const unit = overview.units.find((candidate) => candidate.id === unitId)
  const assessment = overview.assessments.find((candidate) => candidate.id === unit?.assessment_id)
  const storageKey = user && unitId ? backupKey(user.id, unitId) : ''

  const loadQuestions = useCallback(async () => {
    if (!unitId) return
    setQuestionsLoading(true)
    setQuestionError('')
    try {
      setQuestionBank(await getChapterQuizQuestions(unitId))
    } catch (caughtError) {
      setQuestionError(caughtError instanceof Error ? caughtError.message : 'Could not load the question bank.')
    } finally {
      setQuestionsLoading(false)
    }
  }, [unitId])

  useEffect(() => {
    void loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    if (
      !user ||
      !unitId ||
      profile?.role !== 'student' ||
      overview.loading ||
      questionsLoading ||
      initializedFor.current === `${user.id}:${unitId}`
    ) {
      return
    }

    initializedFor.current = `${user.id}:${unitId}`
    const unitAttempts = overview.attempts.filter((candidate) => candidate.learning_unit_id === unitId)
    previousSelection.current = unitAttempts.find((candidate) => candidate.status !== 'in_progress')?.selected_question_ids ?? []
    const activeAttempt = unitAttempts.find((candidate) => candidate.status === 'in_progress')
    if (!activeAttempt) return

    const restoredQuestions = activeAttempt.selected_question_ids
      .map((id) => questionBank.find((question) => question.id === id))
      .filter((question): question is Question => Boolean(question))
    if (restoredQuestions.length !== 6) return

    const backup = readBackup(backupKey(user.id, unitId))
    const matchingBackup = backup?.attemptId === activeAttempt.id
      && backup.selectedQuestionIds.length === activeAttempt.selected_question_ids.length
      && backup.selectedQuestionIds.every((id, index) => id === activeAttempt.selected_question_ids[index])
    setAttempt(activeAttempt)
    setSelectedQuestions(restoredQuestions)
    if (matchingBackup && backup) {
      setAnswers(backup.answers)
      setCurrentIndex(Math.min(Math.max(backup.currentIndex, 0), 5))
      setNotice('Your saved quiz was restored on this device.')
    } else {
      setNotice('Your unfinished quiz was restored. Answers saved on another device may need to be entered again.')
    }
  }, [overview.attempts, overview.loading, profile?.role, questionBank, questionsLoading, unitId, user])

  useEffect(() => {
    if (!attempt || !storageKey || result) return
    const backup: QuizBackup = {
      version: 1,
      attemptId: attempt.id,
      attemptNumber: attempt.attempt_number,
      selectedQuestionIds: selectedQuestions.map((question) => question.id),
      answers,
      currentIndex,
      startedAt: attempt.started_at,
    }
    window.localStorage.setItem(storageKey, JSON.stringify(backup))
  }, [answers, attempt, currentIndex, result, selectedQuestions, storageKey])

  const validation = useMemo(
    () => getQuizValidation(selectedQuestions, answers),
    [answers, selectedQuestions],
  )
  const answeredCount = selectedQuestions.filter((question) => Boolean(answers[question.id]?.trim())).length
  const activeQuestion = selectedQuestions[currentIndex]

  async function handleStart() {
    if (!user || !unit || !assessment || starting) return
    setStarting(true)
    setSubmitError('')
    setNotice('')
    try {
      const selected = selectChapterQuizQuestions(questionBank, previousSelection.current)
      const started = await startChapterQuizAttempt({
        userId: user.id,
        assessmentId: assessment.id,
        learningUnitId: unit.id,
        selectedQuestionIds: selected.map((question) => question.id),
      })
      setAttempt(started.attempt)
      setSelectedQuestions(selected)
      setAnswers({})
      setCurrentIndex(0)
      setValidationVisible(false)
      setResult(null)
      if (started.activityWarning) {
        setNotice('The quiz started, but its activity notification could not be recorded.')
      }
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Could not start the quiz.')
    } finally {
      setStarting(false)
    }
  }

  async function handleSubmit() {
    if (!user || !attempt || submitting || submissionInFlight.current) return
    setValidationVisible(true)
    setSubmitError('')
    if (!validation.valid) return

    submissionInFlight.current = true
    setSubmitting(true)
    try {
      const grade = gradeChapterQuiz(selectedQuestions, answers)
      const savedAnswers = Object.fromEntries(
        selectedQuestions.map((question) => {
          const answer: AttemptAnswer = {
            questionId: question.id,
            answer: answers[question.id],
            ...(question.question_type === 'mcq'
              ? { isCorrect: grade.answerCorrectness[question.id] }
              : {}),
          }
          return [question.id, answer]
        }),
      )
      const durationSeconds = Math.max(0, Math.round((Date.now() - new Date(attempt.started_at).getTime()) / 1000))
      const submitted = await submitChapterQuizAttempt({
        attemptId: attempt.id,
        userId: user.id,
        answers: savedAnswers,
        status: grade.passed ? 'passed' : 'failed',
        mcqCorrect: grade.mcqCorrect,
        mcqTotal: grade.mcqTotal,
        objectivePercentage: grade.objectivePercentage,
        essayWordCount: grade.essayWordCount,
        weakTopics: grade.weakTopics,
        durationSeconds,
      })
      if (storageKey) window.localStorage.removeItem(storageKey)
      previousSelection.current = selectedQuestions.map((question) => question.id)
      setAttempt(submitted.attempt)
      setResult({ attempt: submitted.attempt, grade, questions: selectedQuestions, answers })
      if (submitted.activityWarning) {
        setNotice('Your result was saved, but its activity notification could not be recorded.')
      } else {
        setNotice('Your result has been saved.')
      }
      void overview.reload()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Could not submit the quiz.')
    } finally {
      submissionInFlight.current = false
      setSubmitting(false)
    }
  }

  function handleRetry() {
    setAttempt(null)
    setSelectedQuestions([])
    setAnswers({})
    setCurrentIndex(0)
    setValidationVisible(false)
    setResult(null)
    setSubmitError('')
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (overview.loading || questionsLoading) {
    return (
      <PageContainer eyebrow="Chapter quiz" title="Preparing your questions">
        <LoadingState />
      </PageContainer>
    )
  }

  if (overview.error || questionError) {
    return (
      <PageContainer eyebrow="Chapter quiz" title="Quiz unavailable">
        <ErrorState message={overview.error || questionError} onRetry={() => { void overview.reload(); void loadQuestions() }} />
      </PageContainer>
    )
  }

  if (!unit || unit.unit_type !== 'chapter' || !assessment) {
    return (
      <PageContainer eyebrow="Chapter quiz" title="Quiz not found">
        <EmptyState title="This chapter quiz does not exist" description="Return to the roadmap and choose an available chapter." actionLabel="Open roadmap" actionTo="/student/roadmap" />
      </PageContainer>
    )
  }

  const mcqCount = questionBank.filter((question) => question.question_type === 'mcq').length
  const essayCount = questionBank.filter((question) => question.question_type === 'essay').length
  if (mcqCount < 5 || essayCount < 1) {
    return (
      <PageContainer eyebrow={`Chapter ${unit.chapter_number ?? ''} quiz`} title={unit.title} description="Five multiple-choice questions and one submitted essay are required for this gate.">
        <EmptyState
          title="Question bank not populated yet"
          description={`This chapter currently has ${mcqCount} active MCQs and ${essayCount} active essays. It needs at least 5 MCQs and 1 essay before an attempt can begin.`}
          icon={ClipboardCheck}
          actionLabel="Return to chapter"
          actionTo={`/student/chapter/${unit.id}`}
        />
      </PageContainer>
    )
  }

  if (profile?.role === 'coach') {
    return (
      <PageContainer eyebrow={`Chapter ${unit.chapter_number ?? ''} quiz`} title={unit.title} description="Review the verified question-bank coverage without creating an attempt." actions={<StatusBadge status="on-track" label="Preview only" />}>
        <CoachQuizPreview questions={questionBank} />
      </PageContainer>
    )
  }

  if (result) {
    const assessmentUnits = overview.units.filter((candidate) => candidate.assessment_id === unit.assessment_id)
    const updatedAttempts = [result.attempt, ...overview.attempts.filter((candidate) => candidate.id !== result.attempt.id)]
    const nextUnit = result.grade.passed
      ? getNextUnlockedUnit(assessmentUnits, updatedAttempts, overview.manuallyCompletedUnitIds)
      : undefined
    const mcqs = result.questions.filter((question) => question.question_type === 'mcq')

    return (
      <PageContainer
        eyebrow={`Attempt ${result.attempt.attempt_number} result`}
        title={result.grade.passed ? 'Chapter gate passed' : 'Not passed yet'}
        description={result.grade.passed ? 'Strong work. The next roadmap unit is now available.' : 'Review the explanations and try a fresh question selection when you are ready.'}
        actions={<StatusBadge status={result.grade.passed ? 'on-track' : 'needs-attention'} label={result.grade.passed ? 'Passed' : 'Try again'} />}
      >
        <div className="space-y-5">
          {notice && <p role="status" className="rounded-xl border border-teal/20 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}
          <section className={`rounded-card border p-5 shadow-card sm:p-7 ${result.grade.passed ? 'border-teal/20 bg-teal-50' : 'border-gold/25 bg-gold-50'}`}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl bg-white ${result.grade.passed ? 'text-teal-700' : 'text-gold-700'}`}>
                  {result.grade.passed ? <ShieldCheck aria-hidden="true" size={25} /> : <Flag aria-hidden="true" size={24} />}
                </span>
                <div>
                  <h2 className="text-xl font-bold text-navy">{result.grade.mcqCorrect} of 5 MCQs correct</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Essay submitted: {result.grade.essayWordCount} words. Essays are saved for coach review and are not auto-graded.</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-3xl font-bold text-navy">{result.grade.objectivePercentage}%</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Objective score</p>
              </div>
            </div>
          </section>

          {result.grade.weakTopics.length > 0 && (
            <section className="rounded-card border border-gold/20 bg-surface p-5 shadow-card sm:p-6">
              <h2 className="font-bold text-navy">Weak topics to revisit</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.grade.weakTopics.map((topic) => <span key={topic} className="rounded-full bg-gold-50 px-3 py-1.5 text-sm font-semibold text-gold-800">{topic}</span>)}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-navy">Answer review</h2>
            {mcqs.map((question, index) => {
              const correct = result.grade.answerCorrectness[question.id]
              return (
                <article key={question.id} className={`rounded-card border bg-surface p-5 shadow-card sm:p-6 ${correct ? 'border-teal/20' : 'border-risk/20'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${correct ? 'bg-teal-50 text-teal-700' : 'bg-risk-50 text-risk'}`}>
                      {correct ? <Check aria-hidden="true" size={18} /> : <X aria-hidden="true" size={18} />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">Question {index + 1} · {question.topic}</p>
                      <h3 className="mt-2 font-bold leading-6 text-navy">{question.prompt}</h3>
                      <dl className="mt-4 space-y-2 text-sm leading-6">
                        <div><dt className="inline font-semibold text-slate-500">Your answer: </dt><dd className="inline text-slate-700">{answerLabel(question, result.answers[question.id])}</dd></div>
                        <div><dt className="inline font-semibold text-slate-500">Correct answer: </dt><dd className="inline text-slate-700">{answerLabel(question, getCorrectAnswerKey(question))}</dd></div>
                      </dl>
                      <p className="mt-4 rounded-xl bg-navy-50 p-4 text-sm leading-6 text-slate-700">{question.explanation || 'No explanation has been added to this verified question yet.'}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>

          <section className="rounded-card border border-navy/10 bg-surface p-5 shadow-card sm:p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" size={21} />
              <div>
                <h2 className="font-bold text-navy">Essay received</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Your {result.grade.essayWordCount}-word response was saved. It does not affect the automatic chapter gate result.</p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {result.grade.passed ? (
              <Link className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800" to={nextUnit ? unitPath(nextUnit as LearningUnit) : '/student/roadmap'}>
                {nextUnit ? 'Continue to next unit' : 'Return to roadmap'} <ArrowRight aria-hidden="true" size={18} />
              </Link>
            ) : (
              <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800" type="button" onClick={handleRetry}>
                <RotateCcw aria-hidden="true" size={18} /> Try a new selection
              </button>
            )}
          </div>
        </div>
      </PageContainer>
    )
  }

  if (!attempt || !activeQuestion) {
    return (
      <PageContainer eyebrow={`Chapter ${unit.chapter_number ?? ''} quiz`} title={unit.title} description="Answer five multiple-choice questions and submit a genuine essay response.">
        <div className="mx-auto max-w-3xl space-y-5">
          {submitError && <ErrorState title="Could not start the quiz" message={submitError} />}
          <section className="rounded-card border border-navy/10 bg-surface p-6 shadow-card sm:p-8">
            <span className="grid size-12 place-items-center rounded-xl bg-teal-50 text-teal-700"><ClipboardCheck aria-hidden="true" size={24} /></span>
            <h2 className="mt-5 text-xl font-bold text-navy">Ready for the chapter gate?</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li className="flex gap-3"><Check className="mt-1 shrink-0 text-teal-700" aria-hidden="true" size={17} />Five MCQs and one essay, shown one at a time.</li>
              <li className="flex gap-3"><Check className="mt-1 shrink-0 text-teal-700" aria-hidden="true" size={17} />Pass with at least 4 of 5 MCQs correct and a submitted essay response.</li>
              <li className="flex gap-3"><Save className="mt-1 shrink-0 text-teal-700" aria-hidden="true" size={17} />Your work is backed up on this device until submission succeeds.</li>
            </ul>
            <button className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={starting} onClick={() => void handleStart()}>
              {starting ? <><RefreshCw className="animate-spin" aria-hidden="true" size={18} /> Starting…</> : <>Start chapter quiz <ArrowRight aria-hidden="true" size={18} /></>}
            </button>
          </section>
          <Link className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-navy hover:text-teal-700" to={`/student/chapter/${unit.id}`}><ArrowLeft aria-hidden="true" size={17} /> Return to study pack</Link>
        </div>
      </PageContainer>
    )
  }

  const isEssay = activeQuestion.question_type === 'essay'
  const activeAnswer = answers[activeQuestion.id] ?? ''
  const activeEssayWords = isEssay ? countEssayWords(activeAnswer) : 0
  const activeInvalid = validationVisible && (isEssay ? !activeAnswer.trim() : !activeAnswer)

  return (
    <PageContainer eyebrow={`Attempt ${attempt.attempt_number}`} title={unit.title} description="Your answers are saved on this device while the quiz is in progress." actions={<StatusBadge status="on-track" label={`${answeredCount} of 6 answered`} />}>
      <div className="mx-auto max-w-4xl space-y-5">
        {notice && <p role="status" className="rounded-xl border border-teal/20 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}
        {submitError && <ErrorState title="Submission was not saved" message={submitError} onRetry={() => void handleSubmit()} />}

        <section className="rounded-card border border-navy/10 bg-surface p-4 shadow-card sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-navy">Question {currentIndex + 1} of 6</p>
            <p className="text-xs font-semibold text-muted">{Math.round((answeredCount / 6) * 100)}% answered</p>
          </div>
          <div className="mt-3"><ProgressBar value={(answeredCount / 6) * 100} /></div>
          <nav aria-label="Quiz questions" className="mt-5 grid grid-cols-6 gap-2">
            {selectedQuestions.map((question, index) => {
              const answered = Boolean(answers[question.id]?.trim())
              const selected = index === currentIndex
              const invalid = validationVisible && !answered
              return (
                <button
                  key={question.id}
                  className={`min-h-11 rounded-xl border text-sm font-bold transition ${selected ? 'border-navy bg-navy text-white' : invalid ? 'border-risk/30 bg-risk-50 text-risk' : answered ? 'border-teal/25 bg-teal-50 text-teal-800' : 'border-navy/10 bg-white text-navy hover:border-teal/40'}`}
                  type="button"
                  aria-current={selected ? 'step' : undefined}
                  aria-label={`Question ${index + 1}${answered ? ', answered' : ', unanswered'}`}
                  onClick={() => setCurrentIndex(index)}
                >
                  {index + 1}
                </button>
              )
            })}
          </nav>
        </section>

        <section className={`rounded-card border bg-surface p-5 shadow-card sm:p-8 ${activeInvalid ? 'border-risk/35' : 'border-navy/10'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge status={isEssay ? 'needs-attention' : 'on-track'} label={isEssay ? 'Essay response' : `Multiple choice · ${activeQuestion.topic}`} />
            <span className="text-xs font-semibold text-muted">Required</span>
          </div>
          <h2 className="mt-6 text-lg font-bold leading-7 text-navy sm:text-xl">{activeQuestion.prompt}</h2>

          {isEssay ? (
            <div className="mt-6">
              <label className="sr-only" htmlFor={`answer-${activeQuestion.id}`}>Essay answer</label>
              <textarea
                id={`answer-${activeQuestion.id}`}
                className="min-h-72 w-full resize-y rounded-xl border border-navy/15 bg-white p-4 text-sm leading-7 text-slate-800 outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10"
                value={activeAnswer}
                placeholder="Build a clear response using the chapter concepts…"
                onChange={(event) => setAnswers((current) => ({ ...current, [activeQuestion.id]: event.target.value }))}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className={`text-sm font-semibold ${activeEssayWords > 0 ? 'text-teal-700' : activeInvalid ? 'text-risk' : 'text-muted'}`}>{activeEssayWords} {activeEssayWords === 1 ? 'word' : 'words'}</p>
                {activeEssayWords > 0 && <span className="flex items-center gap-1 text-sm font-semibold text-teal-700"><Check aria-hidden="true" size={16} /> Response added</span>}
              </div>
            </div>
          ) : (
            <fieldset className="mt-6 space-y-3">
              <legend className="sr-only">Choose one answer</legend>
              {(activeQuestion.options_json ?? []).map((option, index) => {
                const key = optionKeys[index] ?? String(index + 1)
                const selected = activeAnswer === key
                return (
                  <label key={`${activeQuestion.id}-${key}`} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selected ? 'border-teal bg-teal-50 ring-2 ring-teal/10' : 'border-navy/10 bg-white hover:border-teal/35'}`}>
                    <input className="mt-1 size-4 accent-teal" type="radio" name={`answer-${activeQuestion.id}`} value={key} checked={selected} onChange={() => setAnswers((current) => ({ ...current, [activeQuestion.id]: key }))} />
                    <span className="text-sm font-bold text-navy">{key}</span>
                    <span className="text-sm leading-6 text-slate-700">{option}</span>
                  </label>
                )
              })}
            </fieldset>
          )}

          {activeInvalid && (
            <p role="alert" className="mt-4 flex items-start gap-2 text-sm font-semibold text-risk">
              <AlertCircle className="mt-0.5 shrink-0" aria-hidden="true" size={17} />
              {isEssay ? 'Write a genuine response before submitting.' : 'Choose an answer before submitting.'}
            </p>
          )}
        </section>

        {validationVisible && !validation.valid && (
          <div role="alert" className="rounded-xl border border-risk/20 bg-risk-50 p-4 text-sm leading-6 text-risk-700">
            Complete all five MCQs and add an essay response. You can use the numbered buttons to jump to anything missing.
          </div>
        )}

        <div className="sticky bottom-20 z-20 flex flex-col gap-3 rounded-card border border-navy/10 bg-surface/95 p-3 shadow-lift backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
          <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-navy/15 px-5 font-semibold text-navy hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}><ArrowLeft aria-hidden="true" size={18} /> Previous</button>
          {currentIndex < 5 ? (
            <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800" type="button" onClick={() => setCurrentIndex((index) => Math.min(5, index + 1))}>Next <ArrowRight aria-hidden="true" size={18} /></button>
          ) : (
            <button className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={submitting} onClick={() => void handleSubmit()}>
              {submitting ? <><RefreshCw className="animate-spin" aria-hidden="true" size={18} /> Saving…</> : <><ClipboardCheck aria-hidden="true" size={18} /> Submit quiz</>}
            </button>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
