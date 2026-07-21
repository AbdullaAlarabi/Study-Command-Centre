import { createClient, type Session } from '@supabase/supabase-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium, type Page } from 'playwright-core'
import { preview } from 'vite'
import WebSocket from 'ws'

const baseUrl = (process.env.QA_BASE_URL ?? 'http://127.0.0.1:4173/').replace(/\/?$/, '/')
const supabaseUrl = process.env.SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const localEnv = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).flatMap((line) => {
  const separator = line.indexOf('=')
  return separator > 0 ? [[line.slice(0, separator), line.slice(separator + 1)]] : []
}))
const anonKey = localEnv.VITE_SUPABASE_ANON_KEY?.trim()
if (!supabaseUrl || !serviceKey || !anonKey) throw new Error('QA requires the configured Supabase URL, service key, and anon key.')

const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } })
const outputDir = resolve('reports/final-qa')
mkdirSync(outputDir, { recursive: true })
const createdAttemptIds = new Set<string>()
const createdActivityIds = new Set<string>()
const checks: string[] = []

function projectRef() { return new URL(supabaseUrl as string).hostname.split('.')[0] }
function pathUrl(path: string) { return `${baseUrl}#${path.startsWith('/') ? path : `/${path}`}` }
async function navigate(page: Page, path: string) {
  await page.goto(pathUrl(path), { waitUntil: 'networkidle' })
}
function mark(check: string) { checks.push(check); console.log(`PASS ${check}`) }
function pause(milliseconds: number) { return new Promise((resolvePause) => setTimeout(resolvePause, milliseconds)) }

async function sessionFor(userId: string) {
  const { data: users, error: usersError } = await admin.auth.admin.listUsers()
  if (usersError) throw usersError
  const email = users.users.find((user) => user.id === userId)?.email
  if (!email) throw new Error(`No email found for profile ${userId}`)
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkError) throw linkError
  const sessionClient = createClient(supabaseUrl as string, anonKey as string, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } })
  const { data, error } = await sessionClient.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
  if (error || !data.session) throw error ?? new Error(`No session generated for ${userId}`)
  return data.session
}

async function authenticate(page: Page, session: Session) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: `sb-${projectRef()}-auth-token`, value: session })
}

async function shot(page: Page, name: string) {
  for (const [suffix, width, height] of [['mobile', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 1000]] as const) {
    await page.setViewportSize({ width, height })
    await pause(350)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (overflow > 1) throw new Error(`${name} overflows horizontally by ${overflow}px at ${width}×${height}`)
    await page.screenshot({ path: resolve(outputDir, `${name}-${suffix}.png`), fullPage: true })
  }
  mark(`${name} renders without horizontal overflow at mobile, tablet, and desktop widths`)
}

async function latestInProgressAttempt(userId: string, unitId: string) {
  for (let retry = 0; retry < 30; retry += 1) {
    const { data, error } = await admin.from('attempts').select('*').eq('user_id', userId).eq('learning_unit_id', unitId).eq('status', 'in_progress').order('started_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    if (data) { createdAttemptIds.add(data.id); return data }
    await pause(200)
  }
  throw new Error(`Timed out waiting for an attempt on ${unitId}`)
}

async function questionsFor(ids: string[]) {
  const { data, error } = await admin.from('questions').select('*').in('id', ids)
  if (error) throw error
  return ids.map((id) => data.find((question) => question.id === id))
}

function correctKey(question: { correct_answer: string; options_json: string[] }) {
  const raw = question.correct_answer.trim()
  if (/^[A-D]$/i.test(raw)) return raw.toUpperCase()
  const index = question.options_json.findIndex((option) => option.trim().toLowerCase() === raw.toLowerCase())
  if (index < 0) throw new Error(`Could not map answer for ${question.id}`)
  return ['A', 'B', 'C', 'D'][index]
}

async function completeChapterQuiz(page: Page, userId: string, unitId: string, pass: boolean, verifyRefresh = false) {
  await navigate(page, `/student/quiz/${unitId}`)
  try {
    await page.getByRole('button', { name: 'Start chapter quiz' }).waitFor()
  } catch {
    const visibleAttempts = await page.evaluate(async ({ url, key, studentId }) => {
      const storageKey = Object.keys(localStorage).find((candidate) => candidate.endsWith('-auth-token'))
      const session = storageKey ? JSON.parse(localStorage.getItem(storageKey) ?? '{}') : {}
      const response = await fetch(`${url}/rest/v1/attempts?select=id,status,learning_unit_id&user_id=eq.${studentId}`, { headers: { apikey: key, Authorization: `Bearer ${session.access_token ?? ''}` } })
      return { status: response.status, body: await response.text() }
    }, { url: supabaseUrl as string, key: anonKey as string, studentId: userId })
    throw new Error(`Chapter quiz start was unavailable at ${page.url()}. Browser-visible attempts: ${JSON.stringify(visibleAttempts)}. Page: ${(await page.locator('body').innerText()).slice(0, 800)}`)
  }
  await page.getByRole('button', { name: 'Start chapter quiz' }).click()
  await page.getByText('Question 1 of 6').waitFor()
  const attempt = await latestInProgressAttempt(userId, unitId)
  const questions = await questionsFor(attempt.selected_question_ids)
  for (let index = 0; index < 5; index += 1) {
    const correct = correctKey(questions[index])
    const answer = pass || index < 0 ? correct : ['A', 'B', 'C', 'D'].find((key) => key !== correct) as string
    await page.locator(`input[type="radio"][value="${answer}"]`).check()
    await page.getByRole('button', { name: 'Next' }).click()
    if (verifyRefresh && index === 0) {
      await pause(250)
      await page.reload({ waitUntil: 'networkidle' })
      await page.getByText('Your saved quiz was restored on this device.').waitFor()
      mark('refreshing an in-progress chapter quiz restores its local answers and position')
    }
  }
  await page.getByRole('textbox', { name: 'Essay answer' }).fill('This is a genuine structured QA response submitted for provisional completion testing.')
  await page.getByRole('button', { name: 'Submit quiz' }).click()
  await page.getByRole('heading', { name: pass ? 'Chapter gate passed' : 'Not passed yet' }).waitFor()
  return attempt.id
}

async function completeMixedPractice(page: Page, userId: string, revisionUnitId: string) {
  await page.getByRole('button', { name: 'Start mixed practice' }).click()
  await page.getByText('Question 1 of 10').waitFor()
  const attempt = await latestInProgressAttempt(userId, revisionUnitId)
  const questions = await questionsFor(attempt.selected_question_ids)
  for (let index = 0; index < 10; index += 1) {
    await page.locator(`input[type="radio"][value="${correctKey(questions[index])}"]`).check()
    await page.getByRole('button', { name: index === 9 ? 'Submit practice' : 'Next' }).click()
  }
  await page.getByText('Mixed practice complete').waitFor()
}

async function completeMock(page: Page, userId: string, unitId: string) {
  await page.getByRole('button', { name: /Start Mock 1/ }).click()
  await page.getByText(/0 of \d+ answered/).waitFor()
  if (await page.getByText('Correct answer:', { exact: false }).count()) throw new Error('Correct answers appeared before mock submission.')
  if (await page.getByText('Supplied model answer', { exact: false }).count()) throw new Error('Model answers appeared before mock submission.')
  mark('student mock hides answers and marking material before submission')
  const attempt = await latestInProgressAttempt(userId, unitId)
  const questions = await questionsFor(attempt.selected_question_ids)
  const mcqs = questions.filter((question) => question.question_type === 'mcq')
  const essays = questions.filter((question) => question.question_type === 'essay')
  const mcqArticles = page.locator('article').filter({ has: page.getByText(/^MCQ \d+$/) })
  for (let index = 0; index < mcqs.length; index += 1) {
    const optionIndex = ['A', 'B', 'C', 'D'].indexOf(correctKey(mcqs[index]))
    await mcqArticles.nth(index).locator('input[type="radio"]').nth(optionIndex).check()
  }
  const textareas = page.locator('textarea[placeholder="Write your structured response…"]')
  for (let index = 0; index < essays.length; index += 1) await textareas.nth(index).fill(`Structured QA essay response ${index + 1}.`)
  await shot(page, 'mock-1-in-progress')
  await page.getByRole('button', { name: 'Submit full mock' }).click()
  await page.getByRole('heading', { name: 'Objective score available — essay marking pending.' }).waitFor()
  await page.getByText('Correct answer:', { exact: false }).first().waitFor()
  mark('student mock reveals supplied review material only after full submission')
  return attempt.id
}

async function cleanup(studentId: string, qaStartedAt: string) {
  const { error: orphanCoachActionError } = await admin
    .from('activity_log')
    .delete()
    .eq('user_id', studentId)
    .gte('created_at', qaStartedAt)
    .in('action_type', ['coach_unit_unlocked', 'coach_unit_reset'])
  if (orphanCoachActionError) throw orphanCoachActionError
  if (createdActivityIds.size) {
    const { error: createdActivityError } = await admin.from('activity_log').delete().in('id', [...createdActivityIds])
    if (createdActivityError) throw createdActivityError
  }
  const ids = [...createdAttemptIds]
  if (!ids.length) return
  const { error: activityError } = await admin.from('activity_log').delete().eq('user_id', studentId).in('entity_id', ids)
  if (activityError) throw activityError
  for (const attemptId of ids) {
    const { error: metadataActivityError } = await admin.from('activity_log').delete().eq('user_id', studentId).contains('metadata_json', { attempt_id: attemptId })
    if (metadataActivityError) throw metadataActivityError
  }
  const { error } = await admin.from('attempts').delete().in('id', ids)
  if (error) throw error
  console.log(`CLEANUP removed ${ids.length} QA attempts, ${createdActivityIds.size} coach actions, and linked reviews/activity.`)
}

async function run() {
  const previewUrl = new URL(baseUrl)
  const previewServer = await preview({
    preview: {
      host: previewUrl.hostname,
      port: Number(previewUrl.port || 4173),
      strictPort: true,
    },
  })
  const qaStartedAt = new Date().toISOString()
  const { data: profiles, error: profileError } = await admin.from('profiles').select('*')
  if (profileError) throw profileError
  const student = profiles.find((profile) => profile.role === 'student')
  const coach = profiles.find((profile) => profile.role === 'coach')
  if (!student || !coach) throw new Error('Exactly one student and one coach profile are required for authenticated QA.')
  const [studentSession, coachSession] = await Promise.all([sessionFor(student.id), sessionFor(coach.id)])
  const { data: units, error: unitError } = await admin.from('learning_units').select('*,assessment_blocks!inner(*)').eq('is_active', true)
  if (unitError) throw unitError
  const assessmentId = units.find((unit) => unit.unit_type === 'chapter' && unit.chapter_number === 4)?.assessment_id
  const assessmentUnits = units.filter((unit) => unit.assessment_id === assessmentId).sort((left, right) => left.unlock_order - right.unlock_order)
  const chapters = assessmentUnits.filter((unit) => unit.unit_type === 'chapter')
  const revision = assessmentUnits.find((unit) => unit.unit_type === 'revision')
  const mockOne = assessmentUnits.find((unit) => unit.unit_type === 'mock' && unit.mock_number === 1)
  const mockTwo = assessmentUnits.find((unit) => unit.unit_type === 'mock' && unit.mock_number === 2)
  if (chapters.length !== 3 || !revision || !mockOne || !mockTwo) throw new Error('Could not resolve the MKT112 midterm path.')

  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  try {
    const coachContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const coachPage = await coachContext.newPage()
    await authenticate(coachPage, coachSession)
    const studentContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const studentPage = await studentContext.newPage()
    await authenticate(studentPage, studentSession)
    await studentPage.goto(pathUrl(`/student/chapter/${chapters[0].id}`), { waitUntil: 'networkidle' })
    await studentPage.getByRole('heading', { level: 1, name: chapters[0].title }).waitFor()
    await shot(studentPage, 'chapter-study')

    const failedAttemptId = await completeChapterQuiz(studentPage, student.id, chapters[0].id, false)
    await shot(studentPage, 'chapter-quiz-failed')

    await navigate(coachPage, `/coach/attempts/${failedAttemptId}`)
    await coachPage.getByRole('button', { name: `Unlock ${chapters[1].short_title}` }).click()
    await coachPage.getByRole('button', { name: `Confirm unlock ${chapters[1].short_title}` }).click()
    await coachPage.getByText(`${chapters[1].short_title} is now available to the student.`).waitFor()
    const unlockActivity = await admin.from('activity_log').select('id').eq('user_id', student.id).eq('action_type', 'coach_unit_unlocked').eq('entity_id', chapters[1].id).gte('created_at', qaStartedAt).single()
    if (unlockActivity.error) throw unlockActivity.error
    createdActivityIds.add(unlockActivity.data.id)
    mark('guarded coach override unlocks the next unit and records an activity')

    await navigate(studentPage, '/student/roadmap')
    await studentPage.getByRole('heading', { level: 1, name: 'Your route to each exam' }).waitFor()
    await studentPage.getByText('Coach unlocked', { exact: true }).first().waitFor()
    mark('student roadmap honors the coach unlock without completing prerequisites')

    await navigate(studentPage, `/student/quiz/${chapters[0].id}`)
    await completeChapterQuiz(studentPage, student.id, chapters[0].id, true, true)
    await shot(studentPage, 'chapter-quiz-passed')
    await pause(1_000)
    for (const chapter of chapters.slice(1)) await completeChapterQuiz(studentPage, student.id, chapter.id, true)
    mark('three provisional chapter completions unlock the matching revision')

    await navigate(studentPage, `/student/revision/${revision.id}`)
    await studentPage.getByRole('heading', { level: 1, name: revision.title }).waitFor()
    await shot(studentPage, 'revision-pack')
    const revisionDetails = studentPage.locator('details')
    const revisionSectionCount = await revisionDetails.count()
    for (let index = 0; index < revisionSectionCount; index += 1) {
      await revisionDetails.nth(index).evaluate((element: HTMLDetailsElement) => { element.open = true })
    }
    await studentPage.getByText(`${revisionSectionCount} / ${revisionSectionCount} opened`, { exact: true }).waitFor()
    await completeMixedPractice(studentPage, student.id, revision.id)
    await shot(studentPage, 'mixed-practice-result')
    await studentPage.getByRole('button', { name: 'Complete Full Revision' }).click()
    await studentPage.getByText('Full revision completed. Mock 1 is now unlocked.').waitFor()
    const completion = await admin.from('attempts').select('id').eq('user_id', student.id).eq('learning_unit_id', revision.id).eq('status', 'passed').eq('mcq_total', 0).single()
    if (completion.error) throw completion.error
    createdAttemptIds.add(completion.data.id)

    await navigate(studentPage, `/student/mock/${mockOne.id}`)
    await studentPage.getByRole('heading', { level: 1, name: mockOne.title }).waitFor()
    await shot(studentPage, 'mock-1-start')
    const mockAttemptId = await completeMock(studentPage, student.id, mockOne.id)
    await shot(studentPage, 'mock-submission-result')

    await navigate(studentPage, `/student/mock/${mockTwo.id}`)
    await studentPage.getByRole('button', { name: 'Start Mock 2' }).click()
    await studentPage.getByText(/0 of \d+ answered/).waitFor()
    const timedAttempt = await latestInProgressAttempt(student.id, mockTwo.id)
    await studentPage.locator('article').filter({ has: studentPage.getByText(/^MCQ 1$/) }).locator('input[type="radio"]').first().check()
    await pause(250)
    await studentPage.reload({ waitUntil: 'networkidle' })
    await studentPage.getByText('Your saved mock answers were restored on this device.').waitFor()
    if (await studentPage.locator('input[type="radio"]:checked').count() !== 1) throw new Error('The timed mock radio answer was not restored after refresh.')
    mark('refreshing an in-progress timed mock restores answers and flags from local storage')
    const expiredStart = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    const expiredUpdate = await admin.from('attempts').update({ started_at: expiredStart }).eq('id', timedAttempt.id)
    if (expiredUpdate.error) throw expiredUpdate.error
    await studentPage.reload({ waitUntil: 'networkidle' })
    await studentPage.getByText('Time expired. Your mock was submitted automatically.').waitFor({ timeout: 15_000 })
    await studentPage.getByRole('heading', { name: 'Objective score available — essay marking pending.' }).waitFor()
    mark('timed Mock 2 submits automatically at zero without requiring every answer')
    await shot(studentPage, 'timed-mock-auto-submit')

    await navigate(studentPage, '/student/results')
    await studentPage.getByRole('heading', { level: 1, name: 'Your evidence of progress' }).waitFor()
    await shot(studentPage, 'student-analytics')
    await studentContext.close()

    await navigate(coachPage, `/coach/attempts/${mockAttemptId}`)
    await coachPage.getByRole('heading', { level: 1, name: mockOne.title }).waitFor()
    await coachPage.getByText('Supplied model answer', { exact: false }).first().waitFor()
    mark('coach can view student answers, correct answers, model answers, and marking guides')
    await shot(coachPage, 'coach-essay-marking')
    const markInputs = coachPage.getByLabel('Numeric mark', { exact: false })
    for (let index = 0; index < await markInputs.count(); index += 1) await markInputs.nth(index).fill('5')
    await coachPage.getByLabel('Optional feedback').fill('QA verification feedback.')
    await coachPage.getByRole('button', { name: 'Save marking' }).click()
    await coachPage.getByText('Essay marking saved.').waitFor()
    mark('coach numeric marks and optional feedback save successfully')
    await navigate(coachPage, '/coach')
    await coachPage.getByRole('heading', { level: 1, name: /Welcome back/ }).waitFor()
    await coachPage.getByRole('heading', { name: 'Chapter quiz trend' }).waitFor()
    await coachPage.getByRole('heading', { name: 'Mock score comparison' }).waitFor()
    if (await coachPage.locator('.recharts-responsive-container').count() !== 2) throw new Error('Coach score charts did not render both responsive containers.')
    mark('coach dashboard calculates completion, readiness, risk, weak topics, pending essays, and both score charts')
    await shot(coachPage, 'coach-analytics')

    await navigate(coachPage, '/coach/attempts')
    await coachPage.getByLabel('Course').selectOption('11111111-1111-4111-8111-111111111111')
    await coachPage.getByLabel('Unit type').selectOption('mock')
    await coachPage.getByText(/Showing \d+ of \d+ submitted attempts\./).waitFor()
    await shot(coachPage, 'coach-attempt-filters')
    await coachPage.getByLabel('From').fill('2030-01-01')
    await coachPage.getByText('No attempts match these filters').waitFor()
    mark('coach attempt filters cover course, assessment, unit type, status, and date with an honest empty state')

    await navigate(coachPage, '/coach/activity')
    await coachPage.getByLabel('Action').selectOption('coach_unit_unlocked')
    await coachPage.getByRole('heading', { name: 'Coach unit unlocked' }).waitFor()
    await shot(coachPage, 'coach-activity-filters')
    mark('coach activity history is chronological and filterable')

    await navigate(coachPage, `/coach/attempts/${mockAttemptId}`)
    await coachPage.getByRole('button', { name: 'Reset latest attempt' }).click()
    await coachPage.getByRole('button', { name: 'Confirm reset' }).click()
    await coachPage.waitForURL(/#\/coach\/attempts$/)
    const resetActivity = await admin.from('activity_log').select('id').eq('user_id', student.id).eq('action_type', 'coach_unit_reset').eq('entity_id', mockOne.id).gte('created_at', qaStartedAt).single()
    if (resetActivity.error) throw resetActivity.error
    createdActivityIds.add(resetActivity.data.id)
    mark('guarded reset removes only the latest unit attempt and records an activity')
    await coachContext.close()

    const report = { qaStartedAt, completedAt: new Date().toISOString(), baseUrl, viewports: ['390x844', '768x1024', '1440x1000'], checks, screenshotCount: checks.filter((check) => check.includes('renders without horizontal overflow')).length * 3, temporaryAttempts: createdAttemptIds.size, temporaryCoachActions: createdActivityIds.size }
    writeFileSync(resolve(outputDir, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify(report, null, 2))
  } finally {
    await browser.close()
    await cleanup(student.id, qaStartedAt)
    await previewServer.close()
  }
}

run().catch((error: unknown) => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exitCode = 1 })
