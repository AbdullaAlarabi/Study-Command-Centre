import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import coreSeed from '../src/data/core-seed.json'
import type { CoreSeed } from '../src/types/database'

const supabaseUrl = process.env.SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the local .env.seed file.',
  )
}

if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Never expose the service-role key through a VITE_ variable.')
}

const seed = coreSeed as CoreSeed
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
})

async function upsertRows(
  table: string,
  rows: Array<Record<string, unknown>>,
) {
  if (rows.length === 0) {
    console.log(`${table}: 0 rows (nothing to seed)`)
    return
  }

  const { error } = await admin.from(table).upsert(rows, { onConflict: 'id' })
  if (error) throw new Error(`${table}: ${error.message}`)
  console.log(`${table}: upserted ${rows.length}`)
}

async function verifyCount(table: string, expected: number) {
  const { count, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) throw new Error(`${table} verification: ${error.message}`)
  if ((count ?? 0) < expected) {
    throw new Error(`${table} verification: expected at least ${expected}, found ${count ?? 0}`)
  }
  console.log(`${table}: verified ${count ?? 0} rows`)
}

async function run() {
  await upsertRows('courses', seed.courses)
  await upsertRows('assessment_blocks', seed.assessmentBlocks)
  await upsertRows('learning_units', seed.learningUnits)
  await upsertRows('study_tasks', seed.studyTasks)

  await verifyCount('courses', seed.courses.length)
  await verifyCount('assessment_blocks', seed.assessmentBlocks.length)
  await verifyCount('learning_units', seed.learningUnits.length)
  await verifyCount('study_tasks', seed.studyTasks.length)
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
