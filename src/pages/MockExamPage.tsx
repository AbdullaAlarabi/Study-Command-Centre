import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  Flag,
  RefreshCw,
  Save,
  ShieldCheck,
  Timer,
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
import { getMockQuestions, startMockAttempt, submitMockAttempt } from '../lib/data'
import { formatCountdown, getFixedMockQuestions, gradeMock, type MockGrade } from '../lib/mock'
import { getNextUnlockedUnit } from '../lib/progress'
import { countEssayWords, getCorrectAnswerKey } from '../lib/quiz'
import type { Attempt, AttemptAnswer, LearningUnit, Question } from '../types/database'

const optionKeys = ['A', 'B', 'C', 'D']

interface MockBackup {
  version: 1
  attemptId: string
  answers: Record<string, string>
  flaggedQuestionIds: string[]
}

interface MockResult {
  attempt: Attempt
  grade: MockGrade
  answers: Record<string, string>
}

function backupKey(userId: string, unitId: string) {
  return `study-command-centre:mock:${userId}:${unitId}`
}

function readBackup(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<MockBackup> | null
    if (!parsed || parsed.version !== 1 || typeof parsed.attemptId !== 'string' || typeof parsed.answers !== 'object' || !Array.isArray(parsed.flaggedQuestionIds)) return null
    return parsed as MockBackup
  } catch {
    return null
  }
}

function answerLabel(question: Question, answer?: string) {
  if (!answer) return 'No answer'
  const option = question.options_json?.[optionKeys.indexOf(answer)]
  return option ? `${answer}. ${option}` : answer
}

function unitPath(unit: LearningUnit) {
  if (unit.unit_type === 'revision') return `/student/revision/${unit.id}`
  if (unit.unit_type === 'mock') return `/student/mock/${unit.id}`
  return `/student/chapter/${unit.id}`
}

export function MockExamPage() {
  const { unitId } = useParams()
  const { user, profile } = useAuth()
  const overview = useStudentOverview(user?.id)
  const [questionBank, setQuestionBank] = useState<Question[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [questionError, setQuestionError] = useState('')
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set())
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [validationVisible, setValidationVisible] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState<MockResult | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const initializedFor = useRef('')
  const submissionInFlight = useRef(false)
  const autoSubmitRef = useRef<() => void>(() => undefined)
  const unit = overview.units.find((candidate) => candidate.id === unitId)
  const assessment = overview.assessments.find((candidate) => candidate.id === unit?.assessment_id)
  const course = overview.courses.find((candidate) => candidate.id === assessment?.course_id)
  const essayCount = assessment?.essay_count ?? 0
  const timed = (unit?.mock_number ?? 1) > 1
  const durationMinutes = unit?.content_json.timeMinutes ?? assessment?.duration_minutes ?? 0
  const storageKey = user && unitId ? backupKey(user.id, unitId) : ''

  const fixedQuestions = useMemo(() => {
    try {
      return assessment ? getFixedMockQuestions(questionBank, assessment.essay_count) : []
    } catch {
      return []
    }
  }, [assessment, questionBank])
  const mcqs = fixedQuestions.filter((question) => question.question_type === 'mcq')
  const essays = fixedQuestions.filter((question) => question.question_type === 'essay')
  const answeredCount = fixedQuestions.filter((question) => Boolean(answers[question.id]?.trim())).length
  const allAnswered = fixedQuestions.length > 0 && answeredCount === fixedQuestions.length

  const loadQuestions = useCallback(async () => {
    if (!unitId) return
    setQuestionsLoading(true)
    setQuestionError('')
    try {
      setQuestionBank(await getMockQuestions(unitId))
    } catch (caughtError) {
      setQuestionError(caughtError instanceof Error ? caughtError.message : 'Could not load this fixed mock.')
    } finally {
      setQuestionsLoading(false)
    }
  }, [unitId])

  useEffect(() => { void loadQuestions() }, [loadQuestions])

  useEffect(() => {
    if (!user || !unitId || profile?.role !== 'student' || overview.loading || questionsLoading || fixedQuestions.length === 0 || initializedFor.current === `${user.id}:${unitId}`) return
    initializedFor.current = `${user.id}:${unitId}`
    const activeAttempt = overview.attempts.find((candidate) => candidate.learning_unit_id === unitId && candidate.status === 'in_progress' && candidate.mcq_total === 5)
    if (!activeAttempt) return
    if (!activeAttempt.selected_question_ids.every((id, index) => id === fixedQuestions[index]?.id)) return
    setAttempt(activeAttempt)
    const backup = readBackup(backupKey(user.id, unitId))
    if (backup?.attemptId === activeAttempt.id) {
      setAnswers(backup.answers)
      setFlaggedIds(new Set(backup.flaggedQuestionIds))
      setNotice('Your saved mock answers were restored on this device.')
    } else {
      setNotice('Your unfinished mock was restored. Local answers from another device are not available.')
    }
  }, [fixedQuestions, overview.attempts, overview.loading, profile?.role, questionsLoading, unitId, user])

  useEffect(() => {
    if (!attempt || !storageKey || result) return
    const backup: MockBackup = { version: 1, attemptId: attempt.id, answers, flaggedQuestionIds: [...flaggedIds] }
    localStorage.setItem(storageKey, JSON.stringify(backup))
  }, [answers, attempt, flaggedIds, result, storageKey])

  useEffect(() => {
    if (!attempt || !timed || result) {
      setRemainingSeconds(null)
      return
    }
    const calculateRemaining = () => Math.max(0, durationMinutes * 60 - Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000))
    setRemainingSeconds(calculateRemaining())
    const timer = window.setInterval(() => {
      const remaining = calculateRemaining()
      setRemainingSeconds(remaining)
      if (remaining === 0) {
        window.clearInterval(timer)
        autoSubmitRef.current()
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [attempt, durationMinutes, result, timed])

  useEffect(() => {
    if (!attempt || unit?.mock_number !== 3 || result) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [attempt, result, unit?.mock_number])

  async function handleStart() {
    if (!user || !unit || !assessment || profile?.role !== 'student' || starting || fixedQuestions.length === 0) return
    setStarting(true)
    setError('')
    try {
      const started = await startMockAttempt({
        userId: user.id,
        assessmentId: assessment.id,
        learningUnitId: unit.id,
        selectedQuestionIds: fixedQuestions.map((question) => question.id),
      })
      setAttempt(started.attempt)
      setAnswers({})
      setFlaggedIds(new Set())
      setValidationVisible(false)
      if (started.activityWarning) setNotice('Mock started, but the activity notification could not be recorded.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not start the mock.')
    } finally {
      setStarting(false)
    }
  }

  async function handleSubmit(automatic = false) {
    if (!user || !attempt || submitting || submissionInFlight.current) return
    setValidationVisible(true)
    setError('')
    if (!automatic && !allAnswered) return
    submissionInFlight.current = true
    setSubmitting(true)
    try {
      const grade = gradeMock(fixedQuestions, answers)
      const savedAnswers = Object.fromEntries(fixedQuestions.map((question) => {
        const answer: AttemptAnswer = {
          questionId: question.id,
          answer: answers[question.id] ?? '',
          ...(question.question_type === 'mcq' ? { isCorrect: grade.answerCorrectness[question.id] } : {}),
        }
        return [question.id, answer]
      }))
      const essayWordCount = essays.reduce((sum, question) => sum + countEssayWords(answers[question.id] ?? ''), 0)
      const durationSeconds = Math.max(0, Math.round((Date.now() - new Date(attempt.started_at).getTime()) / 1000))
      const submitted = await submitMockAttempt({
        attemptId: attempt.id,
        userId: user.id,
        answers: savedAnswers,
        mcqCorrect: grade.mcqCorrect,
        objectivePercentage: grade.objectivePercentage,
        essayWordCount,
        weakTopics: grade.weakTopics,
        durationSeconds,
      })
      if (storageKey) localStorage.removeItem(storageKey)
      setAttempt(submitted.attempt)
      setResult({ attempt: submitted.attempt, grade, answers })
      setNotice(automatic ? 'Time expired. Your mock was submitted automatically.' : submitted.activityWarning ? 'Your mock was saved, but its activity notification could not be recorded.' : 'Your mock was submitted successfully.')
      void overview.reload()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not submit the mock.')
    } finally {
      submissionInFlight.current = false
      setSubmitting(false)
    }
  }
  autoSubmitRef.current = () => { void handleSubmit(true) }

  if (overview.loading || questionsLoading) return <PageContainer eyebrow="Mock exam" title="Preparing the fixed paper"><LoadingState /></PageContainer>
  if (overview.error || questionError) return <PageContainer eyebrow="Mock exam" title="Mock unavailable"><ErrorState message={overview.error || questionError} onRetry={() => { void overview.reload(); void loadQuestions() }} /></PageContainer>
  if (!unit || unit.unit_type !== 'mock' || !assessment) return <PageContainer eyebrow="Mock exam" title="Mock not found"><EmptyState title="This mock does not exist" description="Return to the roadmap and choose a valid mock." actionLabel="Open roadmap" actionTo="/student/roadmap" /></PageContainer>
  if (fixedQuestions.length !== 5 + essayCount) return <PageContainer eyebrow={`Mock ${unit.mock_number}`} title={unit.title}><EmptyState title="Fixed mock paper not populated yet" description={`This paper requires exactly 5 MCQs and ${essayCount} essays from the approved content package.`} icon={Timer} /></PageContainer>

  const isMktAssumption = unit.content_json.formatStatus === 'documented-project-assumption'

  if (profile?.role === 'coach') {
    return (
      <PageContainer eyebrow={`${course?.code} · ${assessment.assessment_type}`} title={unit.title} description="Fixed approved paper in supplied order." actions={<StatusBadge status="pending" label="Coach preview" />}>
        <div className="space-y-5">
          <div className="rounded-card border border-teal/20 bg-teal-50 p-5"><div className="flex gap-3"><Eye className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" size={20} /><p className="text-sm leading-6 text-slate-700">Preview only. No student attempt or progress record will be created.</p></div></div>
          {fixedQuestions.map((question, index) => <article key={question.id} className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{question.question_type === 'mcq' ? `MCQ ${index + 1}` : `Essay ${index - 4}`}</p><h2 className="mt-2 font-bold leading-6 text-navy">{question.prompt}</h2></article>)}
        </div>
      </PageContainer>
    )
  }

  if (result) {
    const assessmentUnits = overview.units.filter((candidate) => candidate.assessment_id === unit.assessment_id)
    const attempts = [result.attempt, ...overview.attempts.filter((candidate) => candidate.id !== result.attempt.id)]
    const nextUnitSnapshot = getNextUnlockedUnit(assessmentUnits, attempts, overview.manuallyCompletedUnitIds)
    const nextUnit = nextUnitSnapshot
      ? overview.units.find((candidate) => candidate.id === nextUnitSnapshot.id)
      : undefined
    return (
      <PageContainer eyebrow={`Mock ${unit.mock_number} result`} title="Objective score available — essay marking pending." description="Your essays are saved for coach review. The objective score below is not a complete exam percentage." actions={<StatusBadge status="pending" label="Essay marking pending" />}>
        <div className="space-y-5">
          {notice && <p role="status" className="rounded-xl border border-teal/20 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}
          <section className="rounded-card border border-navy/10 bg-surface p-6 shadow-card"><div className="grid gap-5 sm:grid-cols-3"><div><p className="text-xs font-bold uppercase tracking-wider text-muted">Objective score</p><p className="mt-1 text-3xl font-bold text-navy">{result.grade.mcqCorrect}/5</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-muted">Objective percentage</p><p className="mt-1 text-3xl font-bold text-navy">{result.grade.objectivePercentage}%</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-muted">Essays submitted</p><p className="mt-1 text-3xl font-bold text-navy">{result.grade.essaySubmitted}/{result.grade.essayTotal}</p></div></div></section>
          {result.grade.weakTopics.length > 0 && <section className="rounded-card border border-gold/20 bg-gold-50 p-5"><h2 className="font-bold text-navy">Topics to review</h2><div className="mt-3 flex flex-wrap gap-2">{result.grade.weakTopics.map((topic) => <span key={topic} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gold-600">{topic}</span>)}</div></section>}
          <section className="space-y-4"><h2 className="text-xl font-bold text-navy">Objective answer review</h2>{mcqs.map((question, index) => { const correct = result.grade.answerCorrectness[question.id]; return <article key={question.id} className={`rounded-card border bg-surface p-5 shadow-card ${correct ? 'border-teal/20' : 'border-risk/20'}`}><div className="flex gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-full ${correct ? 'bg-teal-50 text-teal-700' : 'bg-risk-50 text-risk'}`}>{correct ? <Check aria-hidden="true" size={18} /> : <X aria-hidden="true" size={18} />}</span><div><p className="text-xs font-bold uppercase tracking-wider text-muted">MCQ {index + 1} · {question.topic}</p><h3 className="mt-2 font-bold text-navy">{question.prompt}</h3><p className="mt-3 text-sm text-slate-600"><strong>Your answer:</strong> {answerLabel(question, result.answers[question.id])}</p><p className="mt-1 text-sm text-slate-600"><strong>Correct answer:</strong> {answerLabel(question, getCorrectAnswerKey(question))}</p><p className="mt-4 rounded-xl bg-navy-50 p-4 text-sm leading-6 text-slate-700">{question.explanation}</p></div></div></article>})}</section>
          <section className="space-y-4"><h2 className="text-xl font-bold text-navy">Essay review material</h2>{essays.map((question, index) => <article key={question.id} className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Essay {index + 1}</p><h3 className="mt-2 font-bold leading-6 text-navy">{question.prompt}</h3><div className="mt-4 rounded-xl border border-navy/10 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">Your response</p><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{result.answers[question.id] || 'No response submitted.'}</p></div><details className="mt-4 rounded-xl border border-teal/20 bg-teal-50 p-4"><summary className="cursor-pointer font-bold text-navy">Show supplied model answer and marking points</summary><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{question.model_answer}</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{question.marking_points_json?.map((point) => <li key={point}>{point}</li>)}</ul></details></article>)}</section>
          <Link className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800 sm:ml-auto sm:w-fit" to={nextUnit ? unitPath(nextUnit) : '/student/roadmap'}>{nextUnit ? `Continue to ${nextUnit.short_title}` : 'Return to roadmap'} <ArrowRight aria-hidden="true" size={18} /></Link>
        </div>
      </PageContainer>
    )
  }

  if (!attempt) {
    return (
      <PageContainer eyebrow={`${course?.code} · ${assessment.assessment_type} · Mock ${unit.mock_number}`} title={unit.title} description={unit.description}>
        <div className="mx-auto max-w-3xl space-y-5">
          {error && <ErrorState title="Could not start mock" message={error} />}
          <section className="rounded-card border border-navy/10 bg-surface p-6 shadow-card sm:p-8"><span className="grid size-12 place-items-center rounded-xl bg-navy-50 text-navy"><ShieldCheck aria-hidden="true" size={24} /></span><h2 className="mt-5 text-xl font-bold text-navy">Instructions</h2><ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600"><li className="flex gap-3"><Check className="mt-1 shrink-0 text-teal-700" size={17} />Fixed supplied paper: 5 MCQs and {essayCount} structured essays.</li><li className="flex gap-3"><Clock3 className="mt-1 shrink-0 text-teal-700" size={17} />{timed ? `${durationMinutes}-minute timed exam. It submits automatically at zero.` : 'Untimed diagnostic. Take the time needed to answer fully.'}</li><li className="flex gap-3"><Save className="mt-1 shrink-0 text-teal-700" size={17} />Answers are backed up on this device until database submission succeeds.</li><li className="flex gap-3"><Eye className="mt-1 shrink-0 text-teal-700" size={17} />Answers, explanations, and marking guides appear only after full submission.</li></ul>{isMktAssumption && <p className="mt-5 rounded-xl border border-gold/20 bg-gold-50 p-4 text-sm leading-6 text-gold-600">MKT112 mock structure is a documented project assumption based on supplied AOU business-course samples; it is not presented as an official confirmed university format.</p>}<button className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800 disabled:opacity-60" type="button" disabled={starting} onClick={() => void handleStart()}>{starting ? <><RefreshCw className="animate-spin" size={18} /> Starting…</> : <>Start Mock {unit.mock_number} <ArrowRight size={18} /></>}</button></section>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer eyebrow={`${course?.code} · Mock ${unit.mock_number} · Attempt ${attempt.attempt_number}`} title={unit.title} description="Answer keys and feedback remain hidden until the full paper is submitted." actions={timed && remainingSeconds !== null ? <StatusBadge status={remainingSeconds < 300 ? 'behind' : 'pending'} label={formatCountdown(remainingSeconds)} /> : <StatusBadge status="on-track" label="Untimed diagnostic" />}>
      <div className="mx-auto max-w-5xl space-y-6">
        {notice && <p role="status" className="rounded-xl border border-teal/20 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}
        {error && <ErrorState title="Mock was not submitted" message={error} onRetry={() => void handleSubmit()} />}
        <section className="sticky top-16 z-20 rounded-card border border-navy/10 bg-surface/95 p-4 shadow-card backdrop-blur-xl"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-navy">{answeredCount} of {fixedQuestions.length} answered</p><p className="mt-1 text-xs text-muted">{flaggedIds.size} flagged for review</p></div>{timed && remainingSeconds !== null && <p className={`font-mono text-xl font-bold ${remainingSeconds < 300 ? 'text-risk' : 'text-navy'}`}>{formatCountdown(remainingSeconds)}</p>}</div><div className="mt-3"><ProgressBar value={(answeredCount / fixedQuestions.length) * 100} showValue={false} /></div></section>
        <section className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Question One</p><h2 className="mt-1 text-xl font-bold text-navy">Multiple choice</h2></div>{mcqs.map((question, index) => { const selectedAnswer = answers[question.id] ?? ''; const invalid = validationVisible && !selectedAnswer; return <article key={question.id} className={`rounded-card border bg-surface p-5 shadow-card sm:p-6 ${invalid ? 'border-risk/30' : 'border-navy/10'}`}><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-muted">MCQ {index + 1}</p><button className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${flaggedIds.has(question.id) ? 'border-gold/30 bg-gold-50 text-gold-600' : 'border-navy/10 text-muted'}`} type="button" onClick={() => setFlaggedIds((current) => { const next = new Set(current); if (next.has(question.id)) next.delete(question.id); else next.add(question.id); return next })}><Flag size={14} /> {flaggedIds.has(question.id) ? 'Flagged' : 'Flag'}</button></div><h3 className="mt-3 font-bold leading-7 text-navy">{question.prompt}</h3><fieldset className="mt-4 space-y-2"><legend className="sr-only">Choose one answer</legend>{question.options_json?.map((option, optionIndex) => { const key = optionKeys[optionIndex]; const selected = selectedAnswer === key; return <label key={key} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${selected ? 'border-teal bg-teal-50' : 'border-navy/10 hover:border-teal/35'}`}><input className="mt-1 size-4 accent-teal" type="radio" name={`mock-${question.id}`} checked={selected} onChange={() => setAnswers((current) => ({ ...current, [question.id]: key }))} /><span className="font-bold text-navy">{key}</span><span className="text-sm leading-6 text-slate-700">{option}</span></label>})}</fieldset>{invalid && <p className="mt-3 flex gap-2 text-sm font-semibold text-risk"><AlertCircle size={17} /> Answer required before manual submission.</p>}</article>})}</section>
        <section className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Structured responses</p><h2 className="mt-1 text-xl font-bold text-navy">Essay questions</h2></div>{essays.map((question, index) => { const invalid = validationVisible && !answers[question.id]?.trim(); return <article key={question.id} className={`rounded-card border bg-surface p-5 shadow-card sm:p-6 ${invalid ? 'border-risk/30' : 'border-navy/10'}`}><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-muted">Essay {index + 1}</p><button className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${flaggedIds.has(question.id) ? 'border-gold/30 bg-gold-50 text-gold-600' : 'border-navy/10 text-muted'}`} type="button" onClick={() => setFlaggedIds((current) => { const next = new Set(current); if (next.has(question.id)) next.delete(question.id); else next.add(question.id); return next })}><Flag size={14} /> {flaggedIds.has(question.id) ? 'Flagged' : 'Flag'}</button></div><h3 className="mt-3 font-bold leading-7 text-navy">{question.prompt}</h3><textarea className="mt-4 min-h-60 w-full resize-y rounded-xl border border-navy/15 bg-white p-4 text-sm leading-7 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10" value={answers[question.id] ?? ''} placeholder="Write your structured response…" onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} /><p className="mt-2 text-sm font-medium text-muted">{countEssayWords(answers[question.id] ?? '')} words</p>{invalid && <p className="mt-2 flex gap-2 text-sm font-semibold text-risk"><AlertCircle size={17} /> Response required before manual submission.</p>}</article>})}</section>
        {validationVisible && !allAnswered && <p role="alert" className="rounded-xl border border-risk/20 bg-risk-50 p-4 text-sm leading-6 text-risk-700">Complete every MCQ and essay before manual submission. If time reaches zero, the current answers will submit automatically.</p>}
        <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800 disabled:opacity-60" type="button" disabled={submitting} onClick={() => void handleSubmit()}>{submitting ? <><RefreshCw className="animate-spin" size={18} /> Submitting…</> : <><CheckCircle2 size={18} /> Submit full mock</>}</button>
      </div>
    </PageContainer>
  )
}
