import {
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Eye,
  Flag,
  RefreshCw,
  Target,
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
import { RevisionContentSections, getPresentRevisionSectionIds } from '../features/revision/RevisionContentSections'
import { RevisionPractice } from '../features/revision/RevisionPractice'
import { useStudentOverview } from '../features/student/useStudentOverview'
import { completeRevisionUnit, getRevisionPracticeQuestions } from '../lib/data'
import { getWeakTopicCounts, getWeakTopicReminder } from '../lib/revision'
import type { Attempt, Question } from '../types/database'

function openedSectionsKey(userId: string, unitId: string) {
  return `study-command-centre:revision-sections:${userId}:${unitId}`
}

function readOpenedSections(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
    return new Set<string>(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

export function RevisionPage() {
  const { unitId } = useParams()
  const { user, profile } = useAuth()
  const overview = useStudentOverview(user?.id)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [questionError, setQuestionError] = useState('')
  const [openedSectionIds, setOpenedSectionIds] = useState<Set<string>>(new Set())
  const [localPracticeAttempt, setLocalPracticeAttempt] = useState<Attempt | null>(null)
  const [completionAttempt, setCompletionAttempt] = useState<Attempt | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completionError, setCompletionError] = useState('')
  const [notice, setNotice] = useState('')
  const openedInitializedFor = useRef('')
  const practiceRef = useRef<HTMLDivElement>(null)
  const unit = overview.units.find((candidate) => candidate.id === unitId)
  const assessment = overview.assessments.find((candidate) => candidate.id === unit?.assessment_id)
  const course = overview.courses.find((candidate) => candidate.id === assessment?.course_id)

  const loadQuestions = useCallback(async () => {
    if (!unit?.assessment_id) return
    setQuestionsLoading(true)
    setQuestionError('')
    try {
      setQuestions(await getRevisionPracticeQuestions(unit.assessment_id))
    } catch (caughtError) {
      setQuestionError(caughtError instanceof Error ? caughtError.message : 'Could not load revision practice.')
    } finally {
      setQuestionsLoading(false)
    }
  }, [unit?.assessment_id])

  useEffect(() => {
    if (unit?.assessment_id) void loadQuestions()
  }, [loadQuestions, unit?.assessment_id])

  useEffect(() => {
    if (!user || !unitId || openedInitializedFor.current === `${user.id}:${unitId}`) return
    openedInitializedFor.current = `${user.id}:${unitId}`
    setOpenedSectionIds(readOpenedSections(openedSectionsKey(user.id, unitId)))
  }, [unitId, user])

  const weakTopics = useMemo(
    () => assessment ? getWeakTopicCounts(
      localPracticeAttempt
        ? [localPracticeAttempt, ...overview.attempts.filter((attempt) => attempt.id !== localPracticeAttempt.id)]
        : overview.attempts,
      assessment.id,
    ) : [],
    [assessment, localPracticeAttempt, overview.attempts],
  )

  if (overview.loading || (unit?.assessment_id && questionsLoading)) {
    return <PageContainer eyebrow="Full revision" title="Loading your revision pack"><LoadingState /></PageContainer>
  }

  if (overview.error || questionError) {
    return <PageContainer eyebrow="Full revision" title="Revision unavailable"><ErrorState message={overview.error || questionError} onRetry={() => { void overview.reload(); void loadQuestions() }} /></PageContainer>
  }

  if (!unit || unit.unit_type !== 'revision' || !assessment) {
    return <PageContainer eyebrow="Full revision" title="Revision pack not found"><EmptyState title="This revision unit does not exist" description="Return to the revision centre and choose a valid assessment." actionLabel="Open revision centre" actionTo="/student/revision" /></PageContainer>
  }

  const revisionUnit = unit
  const sectionIds = getPresentRevisionSectionIds(unit.content_json)
  const openedCount = sectionIds.filter((id) => openedSectionIds.has(id)).length
  const allSectionsOpened = sectionIds.length > 0 && openedCount === sectionIds.length
  const existingPractice = overview.attempts.some((attempt) => attempt.learning_unit_id === unit.id && attempt.status === 'submitted' && attempt.mcq_total === 10)
  const hasPractice = existingPractice || Boolean(localPracticeAttempt)
  const existingCompletion = overview.attempts.find((attempt) => attempt.learning_unit_id === unit.id && attempt.status === 'passed' && attempt.mcq_total === 0)
  const isComplete = Boolean(existingCompletion || completionAttempt)
  const mockOne = overview.units.find((candidate) => candidate.assessment_id === unit.assessment_id && candidate.unit_type === 'mock' && candidate.mock_number === 1)
  const canComplete = profile?.role === 'student' && allSectionsOpened && hasPractice && !isComplete

  function handleSectionOpen(id: string) {
    setOpenedSectionIds((current) => {
      const next = new Set(current).add(id)
      if (user) localStorage.setItem(openedSectionsKey(user.id, revisionUnit.id), JSON.stringify([...next]))
      return next
    })
  }

  async function handleComplete() {
    if (!user || !canComplete || completing) return
    setCompleting(true)
    setCompletionError('')
    setNotice('')
    try {
      const completed = await completeRevisionUnit({
        userId: user.id,
        assessmentId: revisionUnit.assessment_id,
        learningUnitId: revisionUnit.id,
      })
      setCompletionAttempt(completed.attempt)
      setNotice(completed.activityWarning ? 'Revision was completed, but its activity notification could not be recorded.' : 'Full revision completed. Mock 1 is now unlocked.')
      void overview.reload()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caughtError) {
      setCompletionError(caughtError instanceof Error ? caughtError.message : 'Could not complete full revision.')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <PageContainer
      eyebrow={`${course?.code ?? 'Assessment'} · ${assessment.assessment_type} revision`}
      title={unit.title}
      description={unit.description}
      actions={<StatusBadge status={isComplete ? 'complete' : profile?.role === 'coach' ? 'pending' : 'on-track'} label={isComplete ? 'Revision complete' : profile?.role === 'coach' ? 'Coach preview' : 'In progress'} />}
    >
      <div className="space-y-6">
        {notice && <p role="status" className="rounded-xl border border-teal/20 bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}
        {completionError && <ErrorState title="Revision completion was not saved" message={completionError} onRetry={() => void handleComplete()} />}

        {profile?.role === 'coach' && (
          <div className="rounded-card border border-teal/20 bg-teal-50 p-5">
            <div className="flex items-start gap-3"><Eye className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" size={20} /><div><h2 className="font-bold text-navy">Coach preview</h2><p className="mt-1 text-sm leading-6 text-slate-600">You can inspect every revision section and question-bank status without creating attempts or completing this unit.</p></div></div>
          </div>
        )}

        <section className="rounded-card border border-navy/10 bg-surface p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Pack progress</p>
              <h2 className="mt-1 text-lg font-bold text-navy">Open each concise revision section</h2>
            </div>
            <span className="text-sm font-bold text-navy">{openedCount} / {sectionIds.length || 0} opened</span>
          </div>
          <div className="mt-4"><ProgressBar value={sectionIds.length ? (openedCount / sectionIds.length) * 100 : undefined} showValue={false} /></div>
        </section>

        {sectionIds.length > 0 ? (
          <RevisionContentSections content={unit.content_json} openedSectionIds={openedSectionIds} onOpen={handleSectionOpen} />
        ) : (
          <EmptyState title="Revision pack not populated yet" description="This page is connected to the revision learning unit's content_json. Verified summaries, definitions, lists, comparisons, essays, plans, and mistakes will appear during the academic content phases." icon={BookOpenCheck} />
        )}

        <section className="rounded-card border border-navy/10 bg-surface p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Personalized review</p>
              <h2 className="mt-1 text-lg font-bold text-navy">Weak topics</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Topics are ranked by how often they were missed in submitted chapter quizzes, mixed practice, and mocks.</p>
            </div>
            {profile?.role === 'student' && questions.length >= 10 && (
              <button className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-navy px-4 text-sm font-bold text-white hover:bg-navy-800" type="button" onClick={() => practiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Target aria-hidden="true" size={17} /> Practice weak topics</button>
            )}
          </div>
          {weakTopics.length > 0 ? (
            <ol className="mt-5 grid gap-3 lg:grid-cols-2">
              {weakTopics.map((item, index) => {
                const reminder = getWeakTopicReminder(item.topic, unit.content_json)
                return <li key={item.topic} className="rounded-xl border border-gold/20 bg-gold-50 p-4"><div className="flex items-center justify-between gap-3"><p className="font-bold text-navy">{index + 1}. {item.topic}</p><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gold-600">Missed {item.count}×</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{reminder || 'Open the related chapter summary and review its key explanation before practising again.'}</p></li>
              })}
            </ol>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-navy/15 bg-navy-50/50 p-5 text-sm leading-6 text-muted">No weak topics have been recorded for this assessment yet. They will appear after incorrect MCQ answers.</div>
          )}
        </section>

        <section id="revision-practice" ref={practiceRef} className="scroll-mt-5">
          <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Mixed practice</p><h2 className="mt-1 text-xl font-bold text-navy">Test all three chapters</h2></div>
          <RevisionPractice userId={user?.id} role={profile?.role} unit={unit} questions={questions} attempts={overview.attempts} weakTopics={weakTopics} onSubmitted={setLocalPracticeAttempt} />
        </section>

        {profile?.role === 'student' && (
          <section className={`rounded-card border p-5 shadow-card sm:p-6 ${isComplete ? 'border-teal/20 bg-teal-50' : 'border-navy/10 bg-surface'}`}>
            <div className="flex items-start gap-3">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${isComplete ? 'bg-teal text-white' : 'bg-navy-50 text-navy'}`}>{isComplete ? <CheckCircle2 aria-hidden="true" size={22} /> : <Flag aria-hidden="true" size={21} />}</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-navy">{isComplete ? 'Full revision complete' : 'Complete the revision gate'}</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li className="flex gap-2"><Check className={`shrink-0 ${allSectionsOpened ? 'text-teal-700' : 'text-slate-300'}`} aria-hidden="true" size={17} /> Open all available main sections ({openedCount}/{sectionIds.length})</li>
                  <li className="flex gap-2"><Check className={`shrink-0 ${hasPractice ? 'text-teal-700' : 'text-slate-300'}`} aria-hidden="true" size={17} /> Submit at least one 10-question mixed-practice set</li>
                </ul>
                {isComplete && mockOne ? (
                  <Link className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800 sm:w-fit" to={`/student/mock/${mockOne.id}`}>Continue to Mock 1 <ArrowRight aria-hidden="true" size={18} /></Link>
                ) : (
                  <button className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-5 font-bold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-45 sm:w-fit" type="button" disabled={!canComplete || completing} onClick={() => void handleComplete()}>{completing ? <><RefreshCw className="animate-spin" aria-hidden="true" size={18} /> Completing…</> : <>Complete Full Revision <ArrowRight aria-hidden="true" size={18} /></>}</button>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  )
}
