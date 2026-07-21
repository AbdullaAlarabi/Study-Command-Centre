import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, relative, resolve } from 'node:path'

export const DEFAULT_CONTENT_ROOT = resolve('STUDY_COMMAND_CENTRE_ACADEMIC_CONTENT')

export type FrontmatterValue = string | number | boolean | Array<string | number>
export type Frontmatter = Record<string, FrontmatterValue>

export interface MarkdownSection {
  id: string
  title: string
  markdown: string
}

export interface ParsedMarkdownFile {
  path: string
  relativePath: string
  frontmatter: Frontmatter
  body: string
}

export interface ChapterPack extends ParsedMarkdownFile {
  stableId: string
  courseId: string
  chapter: number
  assessmentBlock: 'midterm' | 'final'
  title: string
  sections: MarkdownSection[]
}

export interface ChapterQuestion {
  stableId: string
  type: 'mcq' | 'essay'
  topic: string
  sourceSlides: string
  prompt: string
  options: string[] | null
  correctAnswer: string | null
  explanation: string | null
  modelAnswer: string | null
  markingPoints: string[] | null
}

export interface ChapterQuestionBank extends ParsedMarkdownFile {
  stableId: string
  courseId: string
  chapter: number
  assessmentBlock: 'midterm' | 'final'
  questions: ChapterQuestion[]
}

export interface RevisionPack extends ParsedMarkdownFile {
  stableId: string
  courseId: string
  assessmentBlock: 'midterm' | 'final'
  chapters: number[]
  sections: MarkdownSection[]
}

export interface MockPaperQuestion {
  stableId: string
  number: number
  type: 'mcq' | 'essay'
  prompt: string
  options: string[] | null
  maximumMark: number
}

export interface MockPaper extends ParsedMarkdownFile {
  stableId: string
  courseId: string
  assessmentBlock: 'midterm' | 'final'
  mockNumber: number
  chapters: number[]
  timeMinutes: number
  questions: MockPaperQuestion[]
}

export interface MockAnswer {
  number: number
  type: 'mcq' | 'essay'
  correctAnswer: string | null
  explanation: string | null
  topic: string
  source: string
  prompt: string | null
  modelAnswer: string | null
  markingPoints: string[] | null
}

export interface MockAnswerKey extends ParsedMarkdownFile {
  stableId: string
  mockId: string
  courseId: string
  assessmentBlock: 'midterm' | 'final'
  mockNumber: number
  answers: MockAnswer[]
}

export interface AcademicPackage {
  root: string
  courseMaps: ParsedMarkdownFile[]
  chapterPacks: ChapterPack[]
  questionBanks: ChapterQuestionBank[]
  revisionPacks: RevisionPack[]
  mockPapers: MockPaper[]
  answerKeys: MockAnswerKey[]
}

function parseScalar(value: string): FrontmatterValue {
  const trimmed = value.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => /^-?\d+(?:\.\d+)?$/.test(item) ? Number(item) : item.replace(/^['"]|['"]$/g, ''))
  }
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed)
  return trimmed.replace(/^['"]|['"]$/g, '')
}

export function parseMarkdownFile(path: string, root = DEFAULT_CONTENT_ROOT): ParsedMarkdownFile {
  const raw = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
  if (!raw.startsWith('---\n')) throw new Error(`${relative(root, path)}: missing YAML frontmatter`)
  const closing = raw.indexOf('\n---\n', 4)
  if (closing < 0) throw new Error(`${relative(root, path)}: unclosed YAML frontmatter`)
  const frontmatterText = raw.slice(4, closing)
  const frontmatter: Frontmatter = {}
  frontmatterText.split('\n').forEach((line) => {
    const match = line.match(/^([a-z_]+):\s*(.*)$/)
    if (!match) throw new Error(`${relative(root, path)}: invalid frontmatter line "${line}"`)
    frontmatter[match[1]] = parseScalar(match[2])
  })
  return {
    path,
    relativePath: relative(root, path),
    frontmatter,
    body: raw.slice(closing + 5).trim(),
  }
}

function requiredString(file: ParsedMarkdownFile, key: string) {
  const value = file.frontmatter[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${file.relativePath}: missing ${key}`)
  return value
}

function requiredNumber(file: ParsedMarkdownFile, key: string) {
  const value = file.frontmatter[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${file.relativePath}: missing ${key}`)
  return value
}

function requiredNumberArray(file: ParsedMarkdownFile, key: string) {
  const value = file.frontmatter[key]
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'number')) throw new Error(`${file.relativePath}: missing ${key}`)
  return value as number[]
}

function requiredBlock(file: ParsedMarkdownFile) {
  const block = requiredString(file, 'assessment_block')
  if (block !== 'midterm' && block !== 'final') throw new Error(`${file.relativePath}: invalid assessment_block`)
  return block
}

function slug(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function stripDocumentTitle(body: string) {
  return body.replace(/^# .+\n+/, '')
}

function sectionize(body: string, headingPattern: RegExp) {
  const source = stripDocumentTitle(body)
  const matches = [...source.matchAll(headingPattern)]
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length
    const end = matches[index + 1]?.index ?? source.length
    const title = match[1].trim()
    return {
      id: `${String(index + 1).padStart(2, '0')}-${slug(title)}`,
      title,
      markdown: source.slice(start, end).trim().replace(/^---\s*/, '').trim(),
    }
  })
}

function chapterSections(body: string) {
  return sectionize(body, /^## (.+)$/gm)
}

function revisionSections(body: string) {
  const source = stripDocumentTitle(body)
  const headings = [...source.matchAll(/^(## How to use this pack|# (.+))$/gm)]
  return headings.map((match, index) => {
    const title = (match[2] ?? match[1].replace(/^## /, '')).trim()
    const start = (match.index ?? 0) + match[0].length
    const end = headings[index + 1]?.index ?? source.length
    return {
      id: `${String(index + 1).padStart(2, '0')}-${slug(title)}`,
      title,
      markdown: source.slice(start, end).trim().replace(/^---\s*/, '').trim(),
    }
  })
}

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function bulletField(block: string, label: string) {
  return block.match(new RegExp(`^- \\*\\*${escaped(label)}:\\*\\*\\s*(.+)$`, 'm'))?.[1]?.trim() ?? ''
}

function optionField(block: string, letter: string) {
  return block.match(new RegExp(`^- \\*\\*${letter}\\.\\*\\*\\s*(.+)$`, 'm'))?.[1]?.trim() ?? ''
}

function boldField(block: string, label: string) {
  return block.match(new RegExp(`^\\*\\*${escaped(label)}:\\*\\*\\s*(.+)$`, 'm'))?.[1]?.trim() ?? ''
}

function between(block: string, startLabel: string, endLabel?: string) {
  const start = block.indexOf(startLabel)
  if (start < 0) return ''
  const contentStart = start + startLabel.length
  const end = endLabel ? block.indexOf(endLabel, contentStart) : -1
  return block.slice(contentStart, end >= 0 ? end : undefined).trim()
}

function listItems(markdown: string) {
  return markdown.split('\n').flatMap((line) => {
    const match = line.match(/^[-*] (.+)$/)
    return match ? [match[1].trim()] : []
  })
}

function parseChapterQuestionBank(file: ParsedMarkdownFile): ChapterQuestionBank {
  const headings = [...file.body.matchAll(/^### ([A-Z0-9-]+)$/gm)]
  const questions = headings.map((match, index): ChapterQuestion => {
    const stableId = match[1]
    const start = (match.index ?? 0) + match[0].length
    const end = headings[index + 1]?.index ?? file.body.length
    const block = file.body.slice(start, end).trim()
    const type = stableId.includes('-MCQ-') ? 'mcq' : stableId.includes('-ESSAY-') ? 'essay' : undefined
    if (!type) throw new Error(`${file.relativePath}: unrecognized question ID ${stableId}`)
    const topic = bulletField(block, 'Topic')
    const sourceSlides = bulletField(block, 'Source slides')
    const prompt = bulletField(block, 'Question')
    if (!topic || !sourceSlides || !prompt) throw new Error(`${file.relativePath}: incomplete ${stableId}`)

    if (type === 'mcq') {
      const options = ['A', 'B', 'C', 'D'].map((letter) => optionField(block, letter))
      return {
        stableId,
        type,
        topic,
        sourceSlides,
        prompt,
        options,
        correctAnswer: bulletField(block, 'Correct answer'),
        explanation: bulletField(block, 'Explanation'),
        modelAnswer: null,
        markingPoints: null,
      }
    }

    const modelAnswer = between(block, '**Model answer**', '**Marking points**')
    const markingPoints = listItems(between(block, '**Marking points**'))
    return {
      stableId,
      type,
      topic,
      sourceSlides,
      prompt,
      options: null,
      correctAnswer: null,
      explanation: null,
      modelAnswer,
      markingPoints,
    }
  })

  return {
    ...file,
    stableId: requiredString(file, 'id'),
    courseId: requiredString(file, 'course_id'),
    chapter: requiredNumber(file, 'chapter'),
    assessmentBlock: requiredBlock(file),
    questions,
  }
}

function parseMockPaper(file: ParsedMarkdownFile): MockPaper {
  const stableId = requiredString(file, 'id')
  const mcqMatches = [...file.body.matchAll(/^### (\d+)\. (.+)$/gm)]
  const questionTwoIndex = file.body.search(/^## Question 2:/m)
  const mcqs = mcqMatches
    .filter((match) => (match.index ?? 0) < questionTwoIndex)
    .map((match, index): MockPaperQuestion => {
      const start = (match.index ?? 0) + match[0].length
      const end = mcqMatches[index + 1]?.index ?? questionTwoIndex
      return {
        stableId: `${stableId}-MCQ-${String(Number(match[1])).padStart(2, '0')}`,
        number: Number(match[1]),
        type: 'mcq',
        prompt: match[2].trim(),
        options: ['A', 'B', 'C', 'D'].map((letter) => optionField(file.body.slice(start, end), letter)),
        maximumMark: 2,
      }
    })

  const essayHeadings = [...file.body.matchAll(/^## Question (\d+): Essay \((\d+) marks\)$/gm)]
  const essays = essayHeadings.map((match, index): MockPaperQuestion => {
    const start = (match.index ?? 0) + match[0].length
    const end = essayHeadings[index + 1]?.index ?? file.body.length
    const block = file.body.slice(start, end).trim()
    const prompt = block.split(/^\*\*Student answer:\*\*$/m)[0].trim()
    return {
      stableId: `${stableId}-ESSAY-${String(Number(match[1])).padStart(2, '0')}`,
      number: Number(match[1]),
      type: 'essay',
      prompt,
      options: null,
      maximumMark: Number(match[2]),
    }
  })

  return {
    ...file,
    stableId,
    courseId: requiredString(file, 'course_id'),
    assessmentBlock: requiredBlock(file),
    mockNumber: requiredNumber(file, 'mock_number'),
    chapters: requiredNumberArray(file, 'chapters'),
    timeMinutes: requiredNumber(file, 'time_minutes'),
    questions: [...mcqs, ...essays],
  }
}

function parseMockAnswerKey(file: ParsedMarkdownFile): MockAnswerKey {
  const mcqHeadings = [...file.body.matchAll(/^### (\d+)\. Correct answer: ([A-D])$/gm)]
  const questionTwoIndex = file.body.search(/^## Question 2:/m)
  const mcqs = mcqHeadings.map((match, index): MockAnswer => {
    const start = (match.index ?? 0) + match[0].length
    const end = mcqHeadings[index + 1]?.index ?? questionTwoIndex
    const block = file.body.slice(start, end)
    return {
      number: Number(match[1]),
      type: 'mcq',
      correctAnswer: match[2],
      explanation: bulletField(block, 'Explanation'),
      topic: bulletField(block, 'Topic'),
      source: bulletField(block, 'Source'),
      prompt: null,
      modelAnswer: null,
      markingPoints: null,
    }
  })

  const essayHeadings = [...file.body.matchAll(/^## Question (\d+): Model answer and marking guide$/gm)]
  const essays = essayHeadings.map((match, index): MockAnswer => {
    const start = (match.index ?? 0) + match[0].length
    const end = essayHeadings[index + 1]?.index ?? file.body.length
    const block = file.body.slice(start, end).trim()
    return {
      number: Number(match[1]),
      type: 'essay',
      correctAnswer: null,
      explanation: null,
      topic: '',
      source: boldField(block, 'Source'),
      prompt: boldField(block, 'Question'),
      modelAnswer: between(block, '**Model answer**', '**Marking points**'),
      markingPoints: listItems(between(block, '**Marking points**', '**Source:**')),
    }
  })

  return {
    ...file,
    stableId: requiredString(file, 'id'),
    mockId: requiredString(file, 'mock_id'),
    courseId: requiredString(file, 'course_id'),
    assessmentBlock: requiredBlock(file),
    mockNumber: requiredNumber(file, 'mock_number'),
    answers: [...mcqs, ...essays],
  }
}

function filesUnder(path: string) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(path, entry.name)
    if (entry.isDirectory()) return filesUnder(child)
    return entry.name.endsWith('.md') ? [child] : []
  }).sort()
}

export function loadAcademicPackage(root = DEFAULT_CONTENT_ROOT): AcademicPackage {
  const readFolder = (folder: string) => filesUnder(resolve(root, folder)).map((path) => parseMarkdownFile(path, root))
  const chapterPacks = readFolder('02_chapter_packs').map((file): ChapterPack => ({
    ...file,
    stableId: requiredString(file, 'id'),
    courseId: requiredString(file, 'course_id'),
    chapter: requiredNumber(file, 'chapter'),
    assessmentBlock: requiredBlock(file),
    title: requiredString(file, 'title'),
    sections: chapterSections(file.body),
  }))
  const revisionPacks = readFolder('04_revision_packs').map((file): RevisionPack => ({
    ...file,
    stableId: requiredString(file, 'id'),
    courseId: requiredString(file, 'course_id'),
    assessmentBlock: requiredBlock(file),
    chapters: requiredNumberArray(file, 'chapters'),
    sections: revisionSections(file.body),
  }))

  return {
    root,
    courseMaps: readFolder('01_course_overview'),
    chapterPacks,
    questionBanks: readFolder('03_question_banks').map(parseChapterQuestionBank),
    revisionPacks,
    mockPapers: readFolder('05_mock_exams').map(parseMockPaper),
    answerKeys: readFolder('06_mock_answer_keys').map(parseMockAnswerKey),
  }
}

export function deterministicUuid(stableId: string) {
  const hex = createHash('sha256').update(`study-command-centre:${stableId}`).digest('hex').slice(0, 32).split('')
  hex[12] = '5'
  hex[16] = ['8', '9', 'a', 'b'][Number.parseInt(hex[16], 16) % 4]
  const joined = hex.join('')
  return `${joined.slice(0, 8)}-${joined.slice(8, 12)}-${joined.slice(12, 16)}-${joined.slice(16, 20)}-${joined.slice(20)}`
}

export function sourceReference(value: Record<string, unknown>) {
  return JSON.stringify(value)
}

export function contentFilename(file: ParsedMarkdownFile) {
  return basename(file.path)
}
