import { AlertTriangle, Check, LockKeyhole, Save, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageContainer } from '../components/PageContainer'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../features/auth/AuthProvider'
import { useCoachStudentOverview } from '../features/coach/useCoachStudentOverview'
import { getAttemptById, getEssayReview, getQuestionsByIds, resetLatestUnitAttempt, saveEssayReview, unlockLearningUnit } from '../lib/data'
import { calculateMarkedMockTotal, getSuggestedMaximumMark } from '../lib/mock'
import { getRoadmapUnitStatuses } from '../lib/progress'
import { getCorrectAnswerKey } from '../lib/quiz'
import type { Attempt, EssayReview, Question } from '../types/database'

function answerLabel(question: Question, answer?: string) {
  if (!answer) return 'No answer'
  const index = ['A', 'B', 'C', 'D'].indexOf(answer)
  return index >= 0 ? `${answer}. ${question.options_json?.[index] ?? ''}` : answer
}

export function CoachAttemptDetailPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { student, overview, loading: overviewLoading, error: overviewError } = useCoachStudentOverview()
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [review, setReview] = useState<EssayReview | null>(null)
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [chapterEssayScore, setChapterEssayScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirmingAction, setConfirmingAction] = useState<'reset' | 'unlock' | null>(null)
  const [actionPending, setActionPending] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      if (!attemptId) return
      setLoading(true)
      setError('')
      try {
        const loadedAttempt = await getAttemptById(attemptId)
        const [loadedQuestions, loadedReview] = await Promise.all([
          getQuestionsByIds(loadedAttempt.selected_question_ids),
          getEssayReview(loadedAttempt.id),
        ])
        const ordered = loadedAttempt.selected_question_ids.flatMap((id) => {
          const question = loadedQuestions.find((candidate) => candidate.id === id)
          return question ? [question] : []
        })
        if (active) {
          setAttempt(loadedAttempt)
          setQuestions(ordered)
          setReview(loadedReview)
          setFeedback(loadedReview?.feedback ?? '')
          setChapterEssayScore(loadedAttempt.essay_score === null ? '' : String(loadedAttempt.essay_score))
          setMarks(Object.fromEntries(ordered.filter((question) => question.question_type === 'essay').map((question) => [question.id, loadedAttempt.answers_json[question.id]?.coachMark === undefined ? '' : String(loadedAttempt.answers_json[question.id].coachMark)])))
        }
      } catch (caughtError) {
        if (active) setError(caughtError instanceof Error ? caughtError.message : 'Could not load the attempt.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [attemptId])

  const unit = overview.units.find((candidate) => candidate.id === attempt?.learning_unit_id)
  const essays = questions.filter((question) => question.question_type === 'essay')
  const isMock = unit?.unit_type === 'mock'
  const mockMaximums = useMemo(() => essays.map((question) => getSuggestedMaximumMark(question)), [essays])
  const mockMarksValid = isMock && essays.length > 0 && mockMaximums.every((maximum, index) => {
    const mark = Number(marks[essays[index].id])
    return maximum !== undefined && Number.isFinite(mark) && mark >= 0 && mark <= maximum
  })
  const chapterScore = Number(chapterEssayScore)
  const chapterScoreValid = !isMock && essays.length > 0 && Number.isFinite(chapterScore) && chapterScore >= 0 && chapterScore <= 100
  const assessmentUnits = overview.units.filter((candidate) => candidate.assessment_id === unit?.assessment_id).sort((left, right) => left.unlock_order - right.unlock_order)
  const unitIndex = assessmentUnits.findIndex((candidate) => candidate.id === unit?.id)
  const nextUnit = unitIndex >= 0 ? assessmentUnits[unitIndex + 1] : undefined
  const roadmapStatuses = getRoadmapUnitStatuses(assessmentUnits, overview.attempts, overview.manuallyCompletedUnitIds, overview.manuallyUnlockedUnitIds)
  const nextUnitNeedsUnlock = nextUnit && !['current', 'completed'].includes(roadmapStatuses.get(nextUnit.id) ?? 'locked')
  const latestUnitAttempt = overview.attempts.filter((candidate) => candidate.learning_unit_id === unit?.id).sort((left, right) => right.attempt_number - left.attempt_number)[0]
  const canResetThisAttempt = latestUnitAttempt?.id === attempt?.id

  async function handleSave() {
    if (!attempt || !user || (!mockMarksValid && !chapterScoreValid)) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updatedAnswers = { ...attempt.answers_json }
      essays.forEach((question) => {
        updatedAnswers[question.id] = {
          ...updatedAnswers[question.id],
          questionId: question.id,
          answer: updatedAnswers[question.id]?.answer ?? '',
          ...(isMock ? { coachMark: Number(marks[question.id]) } : {}),
          coachFeedback: feedback.trim(),
        }
      })
      const numericMaximums = mockMaximums.map((maximum) => Number(maximum))
      const essayScore = isMock
        ? Math.round((essays.reduce((sum, question) => sum + Number(marks[question.id]), 0) / numericMaximums.reduce((sum, maximum) => sum + maximum, 0)) * 10_000) / 100
        : chapterScore
      const totalPercentage = isMock
        ? calculateMarkedMockTotal({ mcqCorrect: attempt.mcq_correct, essayMarks: essays.map((question) => Number(marks[question.id])), essayMaximumMarks: numericMaximums })
        : Math.round(((attempt.objective_percentage + essayScore) / 2) * 100) / 100
      const saved = await saveEssayReview({ attempt, coachId: user.id, answers: updatedAnswers, essayScore, totalPercentage, feedback })
      setAttempt(saved.attempt)
      setReview(saved.review)
      setNotice(saved.activityWarning ? 'Marks saved, but the activity notification could not be recorded.' : 'Essay marking saved.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not save the essay review.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!attempt || !student || !user || !canResetThisAttempt || actionPending) return
    setActionPending(true)
    setError('')
    try {
      await resetLatestUnitAttempt({ studentId: student.id, learningUnitId: attempt.learning_unit_id, coachId: user.id })
      navigate('/coach/attempts', { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not reset the latest attempt.')
      setConfirmingAction(null)
    } finally {
      setActionPending(false)
    }
  }

  async function handleUnlock() {
    if (!nextUnit || !student || !user || !nextUnitNeedsUnlock || actionPending) return
    setActionPending(true)
    setError('')
    try {
      const result = await unlockLearningUnit({ studentId: student.id, learningUnitId: nextUnit.id, assessmentId: nextUnit.assessment_id, coachId: user.id })
      setNotice(result.alreadyUnlocked ? `${nextUnit.short_title} was already coach-unlocked.` : `${nextUnit.short_title} is now available to the student.`)
      setConfirmingAction(null)
      await overview.reload()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not unlock the next unit.')
    } finally {
      setActionPending(false)
    }
  }

  if (loading || overviewLoading) return <PageContainer eyebrow="Attempt details" title="Loading submitted answers"><LoadingState /></PageContainer>
  if (error || overviewError) return <PageContainer eyebrow="Attempt details" title="Attempt unavailable"><ErrorState message={error || overviewError} /></PageContainer>
  if (!attempt || !unit) return <PageContainer eyebrow="Attempt details" title="Attempt not found"><ErrorState message="This attempt could not be matched to an active learning unit." /></PageContainer>

  return (
    <PageContainer eyebrow={`${unit.unit_type} · Attempt ${attempt.attempt_number}`} title={unit.title} description="Submitted answers beside the exact supplied answer material and topic mappings." actions={attempt.essay_word_count > 0 && attempt.essay_score === null ? <StatusBadge status="pending" label="Essay marking pending" /> : <StatusBadge status="complete" label={attempt.total_percentage === null ? 'Submitted' : `${attempt.total_percentage}% total`} />}>
      <div className="space-y-6">
        {notice && <p role="status" className="rounded-xl border border-teal/20 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}
        <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><p className="text-sm text-muted">Objective score</p><p className="mt-2 text-2xl font-bold text-navy">{attempt.mcq_correct}/{attempt.mcq_total} · {attempt.objective_percentage}%</p></div><div className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><p className="text-sm text-muted">Essay score</p><p className="mt-2 text-2xl font-bold text-navy">{attempt.essay_score === null ? 'Pending' : `${attempt.essay_score}%`}</p></div><div className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><p className="text-sm text-muted">Complete total</p><p className="mt-2 text-2xl font-bold text-navy">{attempt.total_percentage === null ? 'Pending' : `${attempt.total_percentage}%`}</p></div></section>

        <section className="space-y-4"><h2 className="text-xl font-bold text-navy">Questions and answers</h2>{questions.map((question, index) => { const submittedAnswer = attempt.answers_json[question.id]?.answer ?? ''; const correct = question.question_type === 'mcq' ? submittedAnswer === getCorrectAnswerKey(question) : undefined; const maximum = getSuggestedMaximumMark(question); return <article key={question.id} className="rounded-card border border-navy/10 bg-surface p-5 shadow-card"><div className="flex gap-3">{question.question_type === 'mcq' && <span className={`grid size-8 shrink-0 place-items-center rounded-full ${correct ? 'bg-teal-50 text-teal-700' : 'bg-risk-50 text-risk'}`}>{correct ? <Check size={17} /> : <X size={17} />}</span>}<div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{question.question_type === 'mcq' ? `MCQ ${index + 1}` : `Essay ${questions.slice(0, index + 1).filter((candidate) => candidate.question_type === 'essay').length}`} · {question.topic}</p><h3 className="mt-2 font-bold leading-6 text-navy">{question.prompt}</h3><div className="mt-4 rounded-xl border border-navy/10 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">Student answer</p><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{question.question_type === 'mcq' ? answerLabel(question, submittedAnswer) : submittedAnswer || 'No response submitted.'}</p></div>{question.question_type === 'mcq' ? <div className="mt-3 rounded-xl bg-teal-50 p-4 text-sm leading-6 text-slate-700"><p><strong>Correct answer:</strong> {answerLabel(question, getCorrectAnswerKey(question))}</p><p className="mt-2"><strong>Supplied explanation:</strong> {question.explanation}</p></div> : <div className="mt-3 space-y-3"><div className="rounded-xl bg-teal-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Supplied model answer</p><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{question.model_answer}</p></div><div className="rounded-xl bg-gold-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-gold-600">Supplied marking points</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{question.marking_points_json?.map((point) => <li key={point}>{point}</li>)}</ul></div>{isMock && maximum !== undefined && <label className="block text-sm font-bold text-navy">Numeric mark <span className="font-normal text-muted">(0–{maximum}, supplied maximum)</span><input className="mt-2 min-h-11 w-full rounded-xl border border-navy/15 px-3 text-base font-normal outline-none focus:border-teal" type="number" min="0" max={maximum} step="0.5" value={marks[question.id] ?? ''} onChange={(event) => setMarks((current) => ({ ...current, [question.id]: event.target.value }))} /></label>}</div>}</div></div></article>})}</section>

        {essays.length > 0 && <section className="rounded-card border border-navy/10 bg-surface p-6 shadow-card"><h2 className="text-xl font-bold text-navy">Coach marking</h2>{!isMock && <label className="mt-5 block text-sm font-bold text-navy">Optional holistic chapter essay score <span className="font-normal text-muted">(0–100%)</span><input className="mt-2 min-h-11 w-full rounded-xl border border-navy/15 px-3 text-base font-normal outline-none focus:border-teal" type="number" min="0" max="100" step="0.5" value={chapterEssayScore} onChange={(event) => setChapterEssayScore(event.target.value)} /></label>}<label className="mt-5 block text-sm font-bold text-navy">Optional feedback<textarea className="mt-2 min-h-28 w-full rounded-xl border border-navy/15 p-3 text-base font-normal outline-none focus:border-teal" value={feedback} onChange={(event) => setFeedback(event.target.value)} /></label>{review && <p className="mt-3 text-xs text-muted">Last reviewed {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(review.reviewed_at))}</p>}<button className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800 disabled:opacity-50 sm:ml-auto sm:w-fit" type="button" disabled={saving || (!mockMarksValid && !chapterScoreValid)} onClick={() => void handleSave()}><Save size={18} /> {saving ? 'Saving…' : 'Save marking'}</button>{!mockMarksValid && !chapterScoreValid && <p className="mt-3 text-sm text-risk">{isMock ? 'Enter a valid numeric mark for every essay.' : 'Enter a holistic essay score from 0 to 100.'}</p>}</section>}

        <section className="rounded-card border border-risk/15 bg-surface p-6 shadow-card"><div className="flex gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-risk" size={21} /><div><h2 className="font-bold text-navy">Guarded coach actions</h2><p className="mt-1 text-sm leading-6 text-muted">These actions change progression and are recorded in the activity history.</p></div></div><div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-navy/10 p-4"><h3 className="font-bold text-navy">Reset latest unit attempt</h3><p className="mt-2 text-sm leading-6 text-muted">Deletes the latest attempt and linked essay review so the student can repeat this unit. Earlier activity entries remain as history.</p>{!canResetThisAttempt && <p className="mt-3 text-sm font-semibold text-gold-600">This is not the latest attempt for the unit, so it cannot be reset here.</p>}{confirmingAction === 'reset' ? <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button className="min-h-11 rounded-xl bg-risk px-4 text-sm font-bold text-white disabled:opacity-50" type="button" disabled={actionPending} onClick={() => void handleReset()}>{actionPending ? 'Resetting…' : 'Confirm reset'}</button><button className="min-h-11 rounded-xl border border-navy/15 px-4 text-sm font-bold text-navy" type="button" onClick={() => setConfirmingAction(null)}>Cancel</button></div> : <button className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-risk/25 px-4 text-sm font-bold text-risk disabled:opacity-40" type="button" disabled={!canResetThisAttempt} onClick={() => setConfirmingAction('reset')}><Trash2 size={17} /> Reset latest attempt</button>}</div>
          <div className="rounded-xl border border-navy/10 p-4"><h3 className="font-bold text-navy">Manually unlock next unit</h3><p className="mt-2 text-sm leading-6 text-muted">{nextUnit ? `Allows ${nextUnit.short_title} without marking the current unit complete.` : 'This is the final unit in the assessment path.'}</p>{nextUnit && !nextUnitNeedsUnlock && <p className="mt-3 text-sm font-semibold text-teal-700">{nextUnit.short_title} is already available.</p>}{confirmingAction === 'unlock' ? <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button className="min-h-11 rounded-xl bg-navy px-4 text-sm font-bold text-white disabled:opacity-50" type="button" disabled={actionPending} onClick={() => void handleUnlock()}>{actionPending ? 'Unlocking…' : `Confirm unlock ${nextUnit?.short_title}`}</button><button className="min-h-11 rounded-xl border border-navy/15 px-4 text-sm font-bold text-navy" type="button" onClick={() => setConfirmingAction(null)}>Cancel</button></div> : <button className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-navy px-4 text-sm font-bold text-white disabled:opacity-40" type="button" disabled={!nextUnitNeedsUnlock} onClick={() => setConfirmingAction('unlock')}><LockKeyhole size={17} /> Unlock {nextUnit?.short_title ?? 'next unit'}</button>}</div>
        </div></section>

        <Link className="inline-flex min-h-11 items-center rounded-xl border border-navy/15 px-4 text-sm font-bold text-navy hover:bg-navy-50" to="/coach/attempts">Back to attempts</Link>
      </div>
    </PageContainer>
  )
}
