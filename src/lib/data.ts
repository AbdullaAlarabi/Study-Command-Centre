import { supabase } from './supabase'
import type {
  ActivityLog,
  AssessmentBlock,
  Attempt,
  Course,
  LearningUnit,
  EssayReview,
  ProfileRow,
  Question,
  QuestionScope,
  QuestionType,
  StudyTask,
} from '../types/database'

function client() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  if (data === null) throw new Error('Supabase returned no data.')
  return data
}

export async function getProfile(userId: string) {
  const { data, error } = await client()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return unwrap(data as ProfileRow | null, error)
}

export async function getProfiles() {
  const { data, error } = await client().from('profiles').select('*').order('created_at')
  return unwrap(data as ProfileRow[] | null, error)
}

export async function getCourses() {
  const { data, error } = await client()
    .from('courses')
    .select('*')
    .order('display_order')
  return unwrap(data as Course[] | null, error)
}

export async function getAssessmentBlocks(courseId?: string) {
  let query = client()
    .from('assessment_blocks')
    .select('*')
    .order('display_order')
  if (courseId) query = query.eq('course_id', courseId)
  const { data, error } = await query
  return unwrap(data as AssessmentBlock[] | null, error)
}

export async function getLearningUnits(assessmentId: string) {
  const { data, error } = await client()
    .from('learning_units')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('is_active', true)
    .order('unlock_order')
  return unwrap(data as LearningUnit[] | null, error)
}

export async function getAllLearningUnits() {
  const { data, error } = await client()
    .from('learning_units')
    .select('*')
    .eq('is_active', true)
    .order('assessment_id')
    .order('unlock_order')
  return unwrap(data as LearningUnit[] | null, error)
}

export async function getStudyTasks(fromDate?: string, throughDate?: string) {
  let query = client()
    .from('study_tasks')
    .select('*')
    .order('task_date')
    .order('display_order')
  if (fromDate) query = query.gte('task_date', fromDate)
  if (throughDate) query = query.lte('task_date', throughDate)
  const { data, error } = await query
  return unwrap(data as StudyTask[] | null, error)
}

interface QuestionFilters {
  assessmentId: string
  learningUnitId?: string
  scope?: QuestionScope
  type?: QuestionType
  mockNumber?: number
}

export async function getQuestions(filters: QuestionFilters) {
  let query = client()
    .from('questions')
    .select('*')
    .eq('assessment_id', filters.assessmentId)
    .eq('is_active', true)

  if (filters.learningUnitId) {
    query = query.eq('learning_unit_id', filters.learningUnitId)
  }
  if (filters.scope) query = query.eq('question_scope', filters.scope)
  if (filters.type) query = query.eq('question_type', filters.type)
  if (filters.mockNumber !== undefined) {
    query = query.eq('mock_number', filters.mockNumber)
  }

  const { data, error } = await query.order('display_order')
  return unwrap(data as Question[] | null, error)
}

export async function getChapterQuizQuestions(learningUnitId: string) {
  const { data, error } = await client()
    .from('questions')
    .select('*')
    .eq('learning_unit_id', learningUnitId)
    .eq('question_scope', 'chapter_quiz')
    .eq('is_active', true)
    .in('question_type', ['mcq', 'essay'])
    .order('display_order')
  return unwrap(data as Question[] | null, error)
}

export async function getRevisionPracticeQuestions(assessmentId: string) {
  const { data, error } = await client()
    .from('questions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('question_scope', 'chapter_quiz')
    .eq('question_type', 'mcq')
    .eq('is_active', true)
    .order('display_order')
  return unwrap(data as Question[] | null, error)
}

export async function getMockQuestions(learningUnitId: string) {
  const { data, error } = await client()
    .from('questions')
    .select('*')
    .eq('learning_unit_id', learningUnitId)
    .eq('question_scope', 'mock')
    .eq('is_active', true)
    .order('display_order')
  return unwrap(data as Question[] | null, error)
}

export async function getQuestionsByIds(ids: string[]) {
  if (ids.length === 0) return []
  const { data, error } = await client().from('questions').select('*').in('id', ids)
  return unwrap(data as Question[] | null, error)
}

export async function getAttempts(userId: string, learningUnitId?: string) {
  let query = client()
    .from('attempts')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
  if (learningUnitId) query = query.eq('learning_unit_id', learningUnitId)
  const { data, error } = await query
  return unwrap(data as Attempt[] | null, error)
}

export async function startChapterQuizAttempt({
  userId,
  assessmentId,
  learningUnitId,
  selectedQuestionIds,
}: {
  userId: string
  assessmentId: string
  learningUnitId: string
  selectedQuestionIds: string[]
}) {
  const { data: previous, error: previousError } = await client()
    .from('attempts')
    .select('attempt_number')
    .eq('user_id', userId)
    .eq('learning_unit_id', learningUnitId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (previousError) throw new Error(previousError.message)
  const attemptNumber = Number(previous?.attempt_number ?? 0) + 1

  const { data, error } = await client()
    .from('attempts')
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      learning_unit_id: learningUnitId,
      attempt_number: attemptNumber,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      selected_question_ids: selectedQuestionIds,
      answers_json: {},
      mcq_correct: 0,
      mcq_total: 5,
      objective_percentage: 0,
      essay_word_count: 0,
      weak_topics_json: [],
    })
    .select('*')
    .single()

  const attempt = unwrap(data as Attempt | null, error)
  const { error: activityError } = await client().from('activity_log').insert({
    user_id: userId,
    action_type: 'quiz_started',
    entity_type: 'attempt',
    entity_id: attempt.id,
    metadata_json: {
      assessment_id: assessmentId,
      learning_unit_id: learningUnitId,
      attempt_number: attemptNumber,
    },
  })

  return {
    attempt,
    activityWarning: activityError?.message,
  }
}

export async function submitChapterQuizAttempt({
  attemptId,
  userId,
  answers,
  status,
  mcqCorrect,
  mcqTotal,
  objectivePercentage,
  essayWordCount,
  weakTopics,
  durationSeconds,
}: {
  attemptId: string
  userId: string
  answers: Attempt['answers_json']
  status: 'passed' | 'failed'
  mcqCorrect: number
  mcqTotal: number
  objectivePercentage: number
  essayWordCount: number
  weakTopics: string[]
  durationSeconds: number
}) {
  const submittedAt = new Date().toISOString()
  const { data, error } = await client()
    .from('attempts')
    .update({
      status,
      submitted_at: submittedAt,
      answers_json: answers,
      mcq_correct: mcqCorrect,
      mcq_total: mcqTotal,
      objective_percentage: objectivePercentage,
      essay_word_count: essayWordCount,
      weak_topics_json: weakTopics,
      duration_seconds: durationSeconds,
    })
    .eq('id', attemptId)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .select('*')
    .single()

  const attempt = unwrap(data as Attempt | null, error)
  const { error: activityError } = await client().from('activity_log').insert({
    user_id: userId,
    action_type: 'quiz_submitted',
    entity_type: 'attempt',
    entity_id: attempt.id,
    metadata_json: {
      assessment_id: attempt.assessment_id,
      learning_unit_id: attempt.learning_unit_id,
      attempt_number: attempt.attempt_number,
      status,
      mcq_correct: mcqCorrect,
      mcq_total: mcqTotal,
      objective_percentage: objectivePercentage,
      essay_word_count: essayWordCount,
      weak_topics: weakTopics,
    },
  })

  return {
    attempt,
    activityWarning: activityError?.message,
  }
}

async function getNextAttemptNumber(userId: string, learningUnitId: string) {
  const { data, error } = await client()
    .from('attempts')
    .select('attempt_number')
    .eq('user_id', userId)
    .eq('learning_unit_id', learningUnitId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return Number(data?.attempt_number ?? 0) + 1
}

export async function startMockAttempt({
  userId,
  assessmentId,
  learningUnitId,
  selectedQuestionIds,
}: {
  userId: string
  assessmentId: string
  learningUnitId: string
  selectedQuestionIds: string[]
}) {
  const attemptNumber = await getNextAttemptNumber(userId, learningUnitId)
  const { data, error } = await client()
    .from('attempts')
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      learning_unit_id: learningUnitId,
      attempt_number: attemptNumber,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      selected_question_ids: selectedQuestionIds,
      answers_json: {},
      mcq_correct: 0,
      mcq_total: 5,
      objective_percentage: 0,
      essay_word_count: 0,
      weak_topics_json: [],
    })
    .select('*')
    .single()
  const attempt = unwrap(data as Attempt | null, error)
  const { error: activityError } = await client().from('activity_log').insert({
    user_id: userId,
    action_type: 'mock_started',
    entity_type: 'attempt',
    entity_id: attempt.id,
    metadata_json: {
      assessment_id: assessmentId,
      learning_unit_id: learningUnitId,
      attempt_number: attemptNumber,
    },
  })
  return { attempt, activityWarning: activityError?.message }
}

export async function submitMockAttempt({
  attemptId,
  userId,
  answers,
  mcqCorrect,
  objectivePercentage,
  essayWordCount,
  weakTopics,
  durationSeconds,
}: {
  attemptId: string
  userId: string
  answers: Attempt['answers_json']
  mcqCorrect: number
  objectivePercentage: number
  essayWordCount: number
  weakTopics: string[]
  durationSeconds: number
}) {
  const { data, error } = await client()
    .from('attempts')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      answers_json: answers,
      mcq_correct: mcqCorrect,
      mcq_total: 5,
      objective_percentage: objectivePercentage,
      essay_word_count: essayWordCount,
      weak_topics_json: weakTopics,
      duration_seconds: durationSeconds,
    })
    .eq('id', attemptId)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .select('*')
    .single()
  const attempt = unwrap(data as Attempt | null, error)
  const { error: activityError } = await client().from('activity_log').insert({
    user_id: userId,
    action_type: 'mock_submitted',
    entity_type: 'attempt',
    entity_id: attempt.id,
    metadata_json: {
      assessment_id: attempt.assessment_id,
      learning_unit_id: attempt.learning_unit_id,
      attempt_number: attempt.attempt_number,
      objective_percentage: objectivePercentage,
      weak_topics: weakTopics,
    },
  })
  return { attempt, activityWarning: activityError?.message }
}

export async function getAttemptById(attemptId: string) {
  const { data, error } = await client().from('attempts').select('*').eq('id', attemptId).single()
  return unwrap(data as Attempt | null, error)
}

export async function getEssayReview(attemptId: string) {
  const { data, error } = await client().from('essay_reviews').select('*').eq('attempt_id', attemptId).maybeSingle()
  if (error) throw new Error(error.message)
  return data as EssayReview | null
}

export async function saveEssayReview({
  attempt,
  coachId,
  answers,
  essayScore,
  totalPercentage,
  feedback,
}: {
  attempt: Attempt
  coachId: string
  answers: Attempt['answers_json']
  essayScore: number
  totalPercentage: number
  feedback: string
}) {
  const reviewedAt = new Date().toISOString()
  const { data: reviewData, error: reviewError } = await client()
    .from('essay_reviews')
    .upsert({
      attempt_id: attempt.id,
      coach_id: coachId,
      score: essayScore,
      feedback: feedback.trim() || null,
      reviewed_at: reviewedAt,
    }, { onConflict: 'attempt_id' })
    .select('*')
    .single()
  const review = unwrap(reviewData as EssayReview | null, reviewError)
  const { data: attemptData, error: attemptError } = await client()
    .from('attempts')
    .update({ answers_json: answers, essay_score: essayScore, total_percentage: totalPercentage })
    .eq('id', attempt.id)
    .select('*')
    .single()
  const updatedAttempt = unwrap(attemptData as Attempt | null, attemptError)
  const { error: activityError } = await client().from('activity_log').insert({
    user_id: attempt.user_id,
    action_type: 'essay_reviewed',
    entity_type: 'attempt',
    entity_id: attempt.id,
    metadata_json: {
      assessment_id: attempt.assessment_id,
      learning_unit_id: attempt.learning_unit_id,
      essay_score: essayScore,
      total_percentage: totalPercentage,
      coach_id: coachId,
    },
  })
  return { review, attempt: updatedAttempt, activityWarning: activityError?.message }
}

export async function resetLatestUnitAttempt({
  studentId,
  learningUnitId,
  coachId,
}: {
  studentId: string
  learningUnitId: string
  coachId: string
}) {
  const { data: latest, error: latestError } = await client()
    .from('attempts')
    .select('*')
    .eq('user_id', studentId)
    .eq('learning_unit_id', learningUnitId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestError) throw new Error(latestError.message)
  if (!latest) throw new Error('No attempt is available to reset for this unit.')

  const attempt = latest as Attempt
  const { error: deleteError } = await client()
    .from('attempts')
    .delete()
    .eq('id', attempt.id)
    .eq('user_id', studentId)
  if (deleteError) throw new Error(deleteError.message)

  const { error: activityError } = await client().from('activity_log').insert({
    user_id: studentId,
    action_type: 'coach_unit_reset',
    entity_type: 'learning_unit',
    entity_id: learningUnitId,
    metadata_json: {
      coach_id: coachId,
      reset_attempt_id: attempt.id,
      reset_attempt_number: attempt.attempt_number,
      assessment_id: attempt.assessment_id,
    },
  })
  return { resetAttempt: attempt, activityWarning: activityError?.message }
}

export async function unlockLearningUnit({
  studentId,
  learningUnitId,
  assessmentId,
  coachId,
}: {
  studentId: string
  learningUnitId: string
  assessmentId: string
  coachId: string
}) {
  const { data: existing, error: existingError } = await client()
    .from('activity_log')
    .select('*')
    .eq('user_id', studentId)
    .eq('action_type', 'coach_unit_unlocked')
    .eq('entity_type', 'learning_unit')
    .eq('entity_id', learningUnitId)
    .limit(1)
    .maybeSingle()
  if (existingError) throw new Error(existingError.message)
  if (existing) return { activity: existing as ActivityLog, alreadyUnlocked: true }

  const { data, error } = await client().from('activity_log').insert({
    user_id: studentId,
    action_type: 'coach_unit_unlocked',
    entity_type: 'learning_unit',
    entity_id: learningUnitId,
    metadata_json: { coach_id: coachId, assessment_id: assessmentId },
  }).select('*').single()
  return { activity: unwrap(data as ActivityLog | null, error), alreadyUnlocked: false }
}

export async function startRevisionPracticeAttempt({
  userId,
  assessmentId,
  learningUnitId,
  selectedQuestionIds,
}: {
  userId: string
  assessmentId: string
  learningUnitId: string
  selectedQuestionIds: string[]
}) {
  const attemptNumber = await getNextAttemptNumber(userId, learningUnitId)
  const { data, error } = await client()
    .from('attempts')
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      learning_unit_id: learningUnitId,
      attempt_number: attemptNumber,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      selected_question_ids: selectedQuestionIds,
      answers_json: {},
      mcq_correct: 0,
      mcq_total: 10,
      objective_percentage: 0,
      essay_word_count: 0,
      weak_topics_json: [],
    })
    .select('*')
    .single()

  const attempt = unwrap(data as Attempt | null, error)
  const { error: activityError } = await client().from('activity_log').insert({
    user_id: userId,
    action_type: 'revision_practice_started',
    entity_type: 'attempt',
    entity_id: attempt.id,
    metadata_json: {
      assessment_id: assessmentId,
      learning_unit_id: learningUnitId,
      attempt_number: attemptNumber,
    },
  })

  return { attempt, activityWarning: activityError?.message }
}

export async function submitRevisionPracticeAttempt({
  attemptId,
  userId,
  answers,
  correct,
  total,
  percentage,
  weakTopics,
  durationSeconds,
}: {
  attemptId: string
  userId: string
  answers: Attempt['answers_json']
  correct: number
  total: number
  percentage: number
  weakTopics: string[]
  durationSeconds: number
}) {
  const { data, error } = await client()
    .from('attempts')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      answers_json: answers,
      mcq_correct: correct,
      mcq_total: total,
      objective_percentage: percentage,
      weak_topics_json: weakTopics,
      duration_seconds: durationSeconds,
    })
    .eq('id', attemptId)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .select('*')
    .single()

  const attempt = unwrap(data as Attempt | null, error)
  const { error: activityError } = await client().from('activity_log').insert({
    user_id: userId,
    action_type: 'revision_practice_submitted',
    entity_type: 'attempt',
    entity_id: attempt.id,
    metadata_json: {
      assessment_id: attempt.assessment_id,
      learning_unit_id: attempt.learning_unit_id,
      attempt_number: attempt.attempt_number,
      mcq_correct: correct,
      mcq_total: total,
      objective_percentage: percentage,
      weak_topics: weakTopics,
    },
  })

  return { attempt, activityWarning: activityError?.message }
}

export async function completeRevisionUnit({
  userId,
  assessmentId,
  learningUnitId,
}: {
  userId: string
  assessmentId: string
  learningUnitId: string
}) {
  const { data: existing, error: existingError } = await client()
    .from('attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('learning_unit_id', learningUnitId)
    .eq('status', 'passed')
    .eq('mcq_total', 0)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing) return { attempt: existing as Attempt, activityWarning: undefined }

  const attemptNumber = await getNextAttemptNumber(userId, learningUnitId)
  const completedAt = new Date().toISOString()
  const { data, error } = await client()
    .from('attempts')
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      learning_unit_id: learningUnitId,
      attempt_number: attemptNumber,
      status: 'passed',
      started_at: completedAt,
      submitted_at: completedAt,
      selected_question_ids: [],
      answers_json: {},
      mcq_correct: 0,
      mcq_total: 0,
      objective_percentage: 0,
      essay_word_count: 0,
      weak_topics_json: [],
      duration_seconds: 0,
    })
    .select('*')
    .single()

  const attempt = unwrap(data as Attempt | null, error)
  const { error: activityError } = await client().from('activity_log').insert({
    user_id: userId,
    action_type: 'revision_completed',
    entity_type: 'learning_unit',
    entity_id: learningUnitId,
    metadata_json: {
      assessment_id: assessmentId,
      learning_unit_id: learningUnitId,
      attempt_id: attempt.id,
      attempt_number: attemptNumber,
    },
  })

  return { attempt, activityWarning: activityError?.message }
}

export async function getActivity(userId: string, limit = 50) {
  const { data, error } = await client()
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return unwrap(data as ActivityLog[] | null, error)
}

export async function completeManualStudyTask(userId: string, task: StudyTask) {
  const existing = await client()
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .eq('action_type', 'manual_task_completed')
    .eq('entity_type', 'study_task')
    .eq('entity_id', task.id)
    .limit(1)
    .maybeSingle()

  if (existing.error) throw new Error(existing.error.message)
  if (existing.data) return existing.data as ActivityLog

  const { data, error } = await client()
    .from('activity_log')
    .insert({
      user_id: userId,
      action_type: 'manual_task_completed',
      entity_type: 'study_task',
      entity_id: task.id,
      metadata_json: {
        assessment_id: task.assessment_id,
        learning_unit_id: task.learning_unit_id,
        task_date: task.task_date,
        task_type: task.task_type,
      },
    })
    .select('*')
    .single()

  return unwrap(data as ActivityLog | null, error)
}
