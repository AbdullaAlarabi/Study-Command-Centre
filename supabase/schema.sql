-- Study Command Centre database
-- WARNING: The first section permanently removes the retired Fitness Desk data.
-- Run this complete file once in the existing Supabase project's SQL Editor.

begin;

create extension if not exists pgcrypto;

-- Retired Fitness Desk objects. CASCADE also removes their indexes, triggers,
-- constraints, and policies. These statements are intentionally irreversible.
drop table if exists public.habit_logs cascade;
drop table if exists public.habits cascade;
drop table if exists public.intake_logs cascade;
drop table if exists public.intake_items cascade;
drop table if exists public.body_metric_values cascade;
drop table if exists public.body_metric_definitions cascade;
drop table if exists public.body_checkins cascade;
drop table if exists public.running_sessions cascade;
drop table if exists public.workout_set_logs cascade;
drop table if exists public.workout_exercise_logs cascade;
drop table if exists public.workout_sessions cascade;
drop table if exists public.scheduled_workouts cascade;
drop table if exists public.template_exercises cascade;
drop table if exists public.workout_templates cascade;
drop table if exists public.exercise_set_logs cascade;
drop table if exists public.workout_logs cascade;
drop table if exists public.weekly_body_scans cascade;
drop table if exists public.daily_checkins cascade;
drop function if exists public.set_updated_at_timestamp() cascade;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null check (role in ('student', 'coach')),
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  display_order integer not null
);

create table if not exists public.assessment_blocks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  assessment_type text not null check (assessment_type in ('midterm', 'final')),
  title text not null,
  exam_date date not null,
  mcq_count integer not null check (mcq_count > 0),
  essay_count integer not null check (essay_count > 0),
  duration_minutes integer not null check (duration_minutes > 0),
  display_order integer not null,
  unique (course_id, assessment_type)
);

create table if not exists public.learning_units (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessment_blocks(id) on delete cascade,
  unit_type text not null check (unit_type in ('chapter', 'revision', 'mock')),
  chapter_number integer,
  mock_number integer,
  title text not null,
  short_title text not null,
  description text not null,
  unlock_order integer not null check (unlock_order between 1 and 7),
  completion_weight numeric(5, 2) not null check (completion_weight > 0),
  content_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  check (
    (unit_type = 'chapter' and chapter_number is not null and mock_number is null)
    or (unit_type = 'revision' and chapter_number is null and mock_number is null)
    or (unit_type = 'mock' and chapter_number is null and mock_number is not null)
  ),
  unique (assessment_id, unlock_order),
  unique (assessment_id, chapter_number),
  unique (assessment_id, mock_number)
);

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  task_date date not null,
  course_id uuid references public.courses(id) on delete set null,
  assessment_id uuid references public.assessment_blocks(id) on delete set null,
  learning_unit_id uuid references public.learning_units(id) on delete set null,
  task_type text not null check (task_type in ('chapter', 'practice', 'revision', 'mock', 'exam', 'admin')),
  title text not null,
  description text not null,
  completion_mode text not null check (completion_mode in ('unit', 'manual', 'milestone')),
  display_order integer not null default 0
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessment_blocks(id) on delete cascade,
  learning_unit_id uuid references public.learning_units(id) on delete cascade,
  question_scope text not null check (question_scope in ('chapter_quiz', 'revision_practice', 'mock')),
  mock_number integer,
  question_type text not null check (question_type in ('mcq', 'true_false', 'essay')),
  topic text not null,
  prompt text not null,
  options_json jsonb,
  correct_answer text,
  explanation text,
  model_answer text,
  marking_points_json jsonb,
  source_reference text not null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  display_order integer not null default 0,
  is_active boolean not null default true,
  check (
    (question_scope = 'mock' and mock_number is not null)
    or (question_scope <> 'mock' and mock_number is null)
  )
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid not null references public.assessment_blocks(id) on delete cascade,
  learning_unit_id uuid not null references public.learning_units(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('in_progress', 'submitted', 'passed', 'failed')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  selected_question_ids jsonb not null default '[]'::jsonb,
  answers_json jsonb not null default '{}'::jsonb,
  mcq_correct integer not null default 0 check (mcq_correct >= 0),
  mcq_total integer not null default 0 check (mcq_total >= 0),
  objective_percentage numeric(5, 2) not null default 0 check (objective_percentage between 0 and 100),
  essay_word_count integer not null default 0 check (essay_word_count >= 0),
  essay_score numeric(5, 2) check (essay_score between 0 and 100),
  total_percentage numeric(5, 2) check (total_percentage between 0 and 100),
  weak_topics_json jsonb not null default '[]'::jsonb,
  duration_seconds integer check (duration_seconds >= 0),
  unique (user_id, learning_unit_id, attempt_number)
);

create table if not exists public.essay_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.attempts(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  score numeric(5, 2) check (score between 0 and 100),
  feedback text,
  reviewed_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assessment_blocks_course_order_idx
  on public.assessment_blocks (course_id, display_order);
create index if not exists assessment_blocks_exam_date_idx
  on public.assessment_blocks (exam_date);
create index if not exists learning_units_assessment_order_idx
  on public.learning_units (assessment_id, unlock_order) where is_active;
create index if not exists study_tasks_date_order_idx
  on public.study_tasks (task_date, display_order);
create index if not exists study_tasks_assessment_idx
  on public.study_tasks (assessment_id, task_date);
create index if not exists questions_chapter_lookup_idx
  on public.questions (assessment_id, learning_unit_id, question_scope, question_type) where is_active;
create index if not exists questions_mock_lookup_idx
  on public.questions (assessment_id, mock_number, question_type) where is_active;
create index if not exists questions_topic_idx
  on public.questions (assessment_id, topic) where is_active;
create index if not exists attempts_user_unit_idx
  on public.attempts (user_id, learning_unit_id, attempt_number desc);
create index if not exists attempts_user_submitted_idx
  on public.attempts (user_id, submitted_at desc);
create index if not exists activity_log_user_created_idx
  on public.activity_log (user_id, created_at desc);
create index if not exists activity_log_created_idx
  on public.activity_log (created_at desc);

-- This private, low-risk application intentionally does not use RLS.
alter table public.profiles disable row level security;
alter table public.courses disable row level security;
alter table public.assessment_blocks disable row level security;
alter table public.learning_units disable row level security;
alter table public.study_tasks disable row level security;
alter table public.questions disable row level security;
alter table public.attempts disable row level security;
alter table public.essay_reviews disable row level security;
alter table public.activity_log disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

commit;
