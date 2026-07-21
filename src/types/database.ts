import type { UserRole } from './auth'

export type AssessmentType = 'midterm' | 'final'
export type UnitType = 'chapter' | 'revision' | 'mock'
export type TaskType = 'chapter' | 'practice' | 'revision' | 'mock' | 'exam' | 'admin'
export type CompletionMode = 'unit' | 'manual' | 'milestone'
export type QuestionScope = 'chapter_quiz' | 'revision_practice' | 'mock'
export type QuestionType = 'mcq' | 'true_false' | 'essay'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type AttemptStatus = 'in_progress' | 'submitted' | 'passed' | 'failed'

export interface ProfileRow {
  id: string
  display_name: string | null
  role: UserRole
  created_at: string
}

export interface Course {
  id: string
  code: string
  title: string
  display_order: number
}

export interface AssessmentBlock {
  id: string
  course_id: string
  assessment_type: AssessmentType
  title: string
  exam_date: string
  mcq_count: number
  essay_count: number
  duration_minutes: number
  display_order: number
}

export interface StudyPackContent {
  academicContentVersion?: number
  academicFormat?: 'markdown-v1'
  stableId?: string
  contentType?: 'chapter_pack' | 'assessment_revision_pack' | 'mock_exam'
  sourceFile?: string
  sourceMetadata?: Record<string, unknown>
  markdownBody?: string
  markdownSections?: Array<{ id: string; title: string; markdown: string }>
  questionBankStableId?: string
  questionBankSourceFile?: string
  questionIds?: string[]
  answerKeyStableId?: string
  answerKeySourceFile?: string
  answerKeyMarkdown?: string
  answerKeyMetadata?: Record<string, unknown>
  timeMinutes?: number
  chapters?: number[]
  examStructure?: string
  examStructureBasis?: string
  formatStatus?: 'documented-project-assumption' | 'official-syllabus'
  overview?: string
  keyDefinitions?: Array<{ term: string; definition: string }>
  mainIdeas?: string[]
  processesOrModels?: Array<{ title: string; points: string[] }>
  comparisons?: Array<{ title: string; rows: string[][] }>
  commonConfusions?: string[]
  likelyEssayThemes?: string[]
  canYouExplain?: string[]
  assessmentOverview?: string
  chapterSummaries?: Array<{ title: string; summary: string; topic?: string }>
  essentialDefinitions?: Array<{ term: string; definition: string }>
  mustRememberLists?: Array<{ title: string; items: string[] }>
  comparisonTables?: Array<{ title: string; rows: string[][] }>
  likelyEssayQuestions?: string[]
  answerPlans?: Array<{ question: string; points: string[] }>
  commonMistakes?: string[]
  weakTopicReminders?: Record<string, string>
  [key: string]: unknown
}

export interface LearningUnit {
  id: string
  assessment_id: string
  unit_type: UnitType
  chapter_number: number | null
  mock_number: number | null
  title: string
  short_title: string
  description: string
  unlock_order: number
  completion_weight: number
  content_json: StudyPackContent
  is_active: boolean
}

export interface StudyTask {
  id: string
  task_date: string
  course_id: string | null
  assessment_id: string | null
  learning_unit_id: string | null
  task_type: TaskType
  title: string
  description: string
  completion_mode: CompletionMode
  display_order: number
}

export interface Question {
  id: string
  assessment_id: string
  learning_unit_id: string | null
  question_scope: QuestionScope
  mock_number: number | null
  question_type: QuestionType
  topic: string
  prompt: string
  options_json: string[] | null
  correct_answer: string | null
  explanation: string | null
  model_answer: string | null
  marking_points_json: string[] | null
  source_reference: string
  difficulty: Difficulty
  display_order: number
  is_active: boolean
}

export interface AttemptAnswer {
  questionId: string
  answer: string
  isCorrect?: boolean
  coachMark?: number
  coachFeedback?: string
}

export interface Attempt {
  id: string
  user_id: string
  assessment_id: string
  learning_unit_id: string
  attempt_number: number
  status: AttemptStatus
  started_at: string
  submitted_at: string | null
  selected_question_ids: string[]
  answers_json: Record<string, AttemptAnswer>
  mcq_correct: number
  mcq_total: number
  objective_percentage: number
  essay_word_count: number
  essay_score: number | null
  total_percentage: number | null
  weak_topics_json: string[]
  duration_seconds: number | null
}

export interface EssayReview {
  id: string
  attempt_id: string
  coach_id: string
  score: number | null
  feedback: string | null
  reviewed_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  action_type: string
  entity_type: string
  entity_id: string | null
  metadata_json: Record<string, unknown>
  created_at: string
}

export interface CoreSeed {
  courses: Course[]
  assessmentBlocks: AssessmentBlock[]
  learningUnits: LearningUnit[]
  studyTasks: StudyTask[]
}
