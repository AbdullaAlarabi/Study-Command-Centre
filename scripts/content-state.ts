import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

const supabaseUrl = process.env.SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing seed environment credentials.')

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
})

async function count(table: string) {
  const { count: value, error } = await admin.from(table).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`${table}: ${error.message}`)
  return value ?? 0
}

const { data: units, error: unitError } = await admin.from('learning_units').select('id,unit_type,content_json')
if (unitError) throw new Error(unitError.message)
const { data: questions, error: questionError } = await admin.from('questions').select('id,question_scope,source_reference')
if (questionError) throw new Error(questionError.message)

const snapshot = {
  capturedAt: new Date().toISOString(),
  counts: {
    courses: await count('courses'),
    assessmentBlocks: await count('assessment_blocks'),
    learningUnits: units?.length ?? 0,
    studyTasks: await count('study_tasks'),
    questions: questions?.length ?? 0,
    attempts: await count('attempts'),
    essayReviews: await count('essay_reviews'),
    activityLog: await count('activity_log'),
  },
  learningUnitContent: {
    empty: units?.filter((unit) => Object.keys(unit.content_json ?? {}).length === 0).length ?? 0,
    populated: units?.filter((unit) => Object.keys(unit.content_json ?? {}).length > 0).length ?? 0,
  },
  questionScopes: Object.fromEntries(
    ['chapter_quiz', 'revision_practice', 'mock'].map((scope) => [
      scope,
      questions?.filter((question) => question.question_scope === scope).length ?? 0,
    ]),
  ),
  approvedAcademicQuestions: questions?.filter((question) => {
    try {
      return Boolean(JSON.parse(question.source_reference).stableId)
    } catch {
      return false
    }
  }).length ?? 0,
}

console.log(JSON.stringify(snapshot, null, 2))
