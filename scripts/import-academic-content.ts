import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import coreSeed from '../src/data/core-seed.json'
import type { CoreSeed } from '../src/types/database'
import { buildAcademicImportPayload } from './content/build-import'
import { loadAcademicPackage } from './content/content-package'

const supabaseUrl = process.env.SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) throw new Error('Never expose the service-role key through a VITE_ variable.')

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
})
const academicPackage = loadAcademicPackage()
const payload = buildAcademicImportPayload(academicPackage, coreSeed as CoreSeed)

const requiredCounts = {
  courseMaps: 2,
  chapterPacks: 12,
  chapterBankMcqs: 144,
  chapterBankEssays: 48,
  revisionPacks: 4,
  mockExams: 12,
  mockMcqs: 60,
  mockEssays: 30,
  answerKeys: 12,
}
Object.entries(requiredCounts).forEach(([key, expected]) => {
  const actual = payload.counts[key as keyof typeof payload.counts]
  if (actual !== expected) throw new Error(`${key}: expected ${expected}, found ${actual}`)
})

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function equalFields(existing: Record<string, unknown>, desired: Record<string, unknown>) {
  return Object.entries(desired).every(([key, value]) => canonical(existing[key]) === canonical(value))
}

async function existingRows(table: string, ids: string[]) {
  const rows: Array<Record<string, unknown>> = []
  for (let index = 0; index < ids.length; index += 100) {
    const { data, error } = await admin.from(table).select('*').in('id', ids.slice(index, index + 100))
    if (error) throw new Error(`${table} preflight: ${error.message}`)
    rows.push(...(data ?? []))
  }
  return new Map(rows.map((row) => [String(row.id), row]))
}

async function count(table: string) {
  const { count: value, error } = await admin.from(table).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`${table}: ${error.message}`)
  return value ?? 0
}

async function run() {
  const questionIds = payload.questions.map((question) => question.id)
  const unitIds = payload.learningUnitUpdates.map((unit) => unit.id)
  const courseIds = payload.courseUpdates.map((course) => course.id)
  const [currentQuestions, currentUnits, currentCourses, totalQuestionCount, attemptCount] = await Promise.all([
    existingRows('questions', questionIds),
    existingRows('learning_units', unitIds),
    existingRows('courses', courseIds),
    count('questions'),
    count('attempts'),
  ])

  const unexpectedQuestionCount = totalQuestionCount - currentQuestions.size
  if (unexpectedQuestionCount > 0) {
    throw new Error(`Found ${unexpectedQuestionCount} question records outside the approved deterministic import. Review them before importing.`)
  }

  const summary = {
    courses: { inserted: 0, updated: 0, skipped: 0, invalid: 0 },
    learningUnits: { inserted: 0, updated: 0, skipped: 0, invalid: 0 },
    questions: { inserted: 0, updated: 0, skipped: 0, invalid: 0 },
  }

  for (const course of payload.courseUpdates) {
    const current = currentCourses.get(course.id)
    if (!current) throw new Error(`Course ${course.id} is missing; run the core seed first.`)
    if (equalFields(current, course)) {
      summary.courses.skipped += 1
      continue
    }
    const { error } = await admin.from('courses').update({ title: course.title }).eq('id', course.id)
    if (error) throw new Error(`Course ${course.id}: ${error.message}`)
    summary.courses.updated += 1
  }

  for (const unit of payload.learningUnitUpdates) {
    const current = currentUnits.get(unit.id)
    if (!current) throw new Error(`Learning unit ${unit.id} is missing; run the core seed first.`)
    if (equalFields(current, unit)) {
      summary.learningUnits.skipped += 1
      continue
    }
    const { error } = await admin.from('learning_units').update({ title: unit.title, content_json: unit.content_json }).eq('id', unit.id)
    if (error) throw new Error(`Learning unit ${unit.id}: ${error.message}`)
    summary.learningUnits.updated += 1
  }

  const changedQuestions = payload.questions.filter((question) => {
    const current = currentQuestions.get(question.id)
    if (!current) {
      summary.questions.inserted += 1
      return true
    }
    if (equalFields(current, question)) {
      summary.questions.skipped += 1
      return false
    }
    summary.questions.updated += 1
    return true
  })

  for (let index = 0; index < changedQuestions.length; index += 100) {
    const { error } = await admin.from('questions').upsert(changedQuestions.slice(index, index + 100), { onConflict: 'id' })
    if (error) throw new Error(`Question import: ${error.message}`)
  }

  const [{ count: verifiedQuestions, error: verifyQuestionError }, { data: verifiedUnits, error: verifyUnitError }] = await Promise.all([
    admin.from('questions').select('*', { count: 'exact', head: true }).in('id', questionIds),
    admin.from('learning_units').select('id,content_json').in('id', unitIds),
  ])
  if (verifyQuestionError) throw new Error(`Question verification: ${verifyQuestionError.message}`)
  if (verifyUnitError) throw new Error(`Learning-unit verification: ${verifyUnitError.message}`)
  if (verifiedQuestions !== payload.questions.length) throw new Error(`Question verification: expected ${payload.questions.length}, found ${verifiedQuestions ?? 0}`)
  const stableUnitCount = verifiedUnits?.filter((unit) => typeof unit.content_json?.stableId === 'string').length ?? 0
  if (stableUnitCount !== payload.learningUnitUpdates.length) throw new Error(`Learning-unit verification: expected ${payload.learningUnitUpdates.length}, found ${stableUnitCount}`)

  console.log('Study Command Centre academic content import')
  console.log('============================================')
  console.log(`Pre-import question records: ${totalQuestionCount}`)
  console.log(`Pre-import attempt records:  ${attemptCount}`)
  console.log(`Courses:        ${JSON.stringify(summary.courses)}`)
  console.log(`Learning units: ${JSON.stringify(summary.learningUnits)}`)
  console.log(`Questions:      ${JSON.stringify(summary.questions)}`)
  console.log(`Verified learning-unit content records: ${stableUnitCount}`)
  console.log(`Verified question records:              ${verifiedQuestions}`)
  console.log(`Chapter questions: 192 (144 MCQs, 48 essays)`)
  console.log(`Fixed mock questions: 90 (60 MCQs, 30 essays)`)
  console.log('Invalid records: 0')
  console.log('Result: PASS — approved content imported deterministically.')
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
