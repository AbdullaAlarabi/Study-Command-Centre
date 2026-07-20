import { supabase } from './supabase'
import type {
  ActivityLog,
  AssessmentBlock,
  Attempt,
  Course,
  LearningUnit,
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
