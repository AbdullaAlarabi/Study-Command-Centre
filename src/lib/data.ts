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

export async function getActivity(userId: string, limit = 50) {
  const { data, error } = await client()
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return unwrap(data as ActivityLog[] | null, error)
}
