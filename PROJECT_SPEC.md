# Study Command Centre — Project Specification

## Purpose

Study Command Centre is a private, mobile-first study tracker for one university student and one coach. It supports MKT112 Principles of Marketing II and MGT112 Principles of Management II for the July–September 2026 assessment cycle. The experience must be simple, direct, visual, motivating, and distinct from a traditional university LMS.

The fixed learning path for each assessment is:

`Chapter 1 → Quiz → Chapter 2 → Quiz → Chapter 3 → Quiz → Full Revision → Mock 1 → Mock 2 → Mock 3 → Real exam`

## Academic structure

| Assessment | Chapters | Exam date | Mock format |
| --- | --- | --- | --- |
| MKT112 Midterm | 4, 5, 10 | 3 Aug 2026 | 5 MCQs + 2 essays |
| MGT112 Midterm | 7, 8, 9 | 5 Aug 2026 | 5 MCQ/TF + 2 essays |
| MKT112 Final | 14, 17, 18 | 31 Aug 2026 | 5 MCQs + 3 essays |
| MGT112 Final | 10, 11, 12 | 2 Sep 2026 | 5 MCQ/TF + 3 essays |

Assessment formats must remain data-driven.

## Users and access

- Exactly two manually created Supabase email/password accounts: one student and one coach.
- No registration, password reset, social login, email-verification flow, or multi-tenant support.
- The role comes from the matching row in `profiles` and controls routing.
- This is a private, low-risk app with no sensitive data.

The student sees today’s task, next exam, progress, readiness, roadmaps, study packs, quizzes, revision, mocks, results, and weak topics. The coach sees completion, readiness, overdue work, attempts, all submitted answers, mock results, weak topics, activity, and inactivity. The coach may comment on and optionally score essays, reset units, or unlock units.

## Learning and completion rules

Each assessment has seven weighted units: three chapters at 15% each, full revision at 10%, and three mocks at 15% each. Units unlock sequentially. A chapter cannot be completed manually: the student must score at least 4/5 on a randomly selected MCQ set and submit an essay of at least 60 words. The essay is saved for coach review but pending review does not block progress.

Revision unlocks after all three chapter gates pass. Mock 1 unlocks after revision, then Mock 2 and Mock 3 unlock after the preceding mock is submitted. Simple practice and revision schedule tasks may be completed manually.

Completion is the weighted percentage of finished units. Readiness averages the latest passed chapter objective scores and latest submitted mock objective scores; coach essay scores are included only when available.

Status rules:

- On Track: no overdue tasks and readiness ≥ 70%.
- Needs Attention: one overdue task or readiness 50–69%.
- Behind: at least two overdue tasks or no activity for three days.
- High Risk: exam within three days and readiness below 50%.

## Study, quiz, revision, and mock content

Each chapter page contains a short overview, definitions, models/processes/lists, comparisons, common confusions, likely essay themes, a “Can you explain these?” checklist, and the quiz action. Each chapter requires a bank of at least 12 MCQs and 4 essays. Attempts select 5 MCQs and 1 essay, store every response and attempt number, show objective feedback and weak topics, and use a new random selection after failure.

Questions must be direct, source-based, non-tricky, and contain stable topic tags, a source reference, correct answer, explanation, and an essay model answer or marking points. MCQs use one clear answer, plausible distractors, no “all/none of the above,” and balanced A–D answers.

Each assessment revision area includes three concise chapter summaries, essential definitions, important processes and lists, comparisons, likely essays with plans, personalized weak topics, and mixed practice.

Each assessment has three mocks: an untimed diagnostic Mock 1, timed standard Mock 2, and timed final-rehearsal Mock 3. Objective items auto-grade; essays await optional coach scoring. In-progress answers use localStorage as a temporary safety backup and clear after successful submission.

## Dashboard expectations

The student dashboard must immediately answer:

1. What do I need to do today?
2. How much have I completed?
3. How ready am I?
4. What is next?

It includes one primary Today’s Task action, next-exam countdown, completion and readiness, four assessment cards, upcoming tasks, and a restrained overdue indicator. Coach analytics include overall and course progress, readiness/status, trends, weak topics, activity, essays awaiting review, and days since last activity.

## Technical architecture

- Vite, React, TypeScript, Tailwind CSS, Supabase JavaScript client, Recharts, and Lucide.
- Static GitHub Pages deployment using `HashRouter`.
- Supabase Postgres tables centered on profiles, courses, assessment blocks, learning units, study tasks, questions, attempts, essay reviews, and activity log.
- No Row Level Security, Edge Functions, AI API, Next.js, SSR, Docker, Redux, complex state management, background jobs, notifications, payments, or CMS.
- The Supabase anon key is used by the frontend. The service-role key is local-only in an uncommitted `.env.seed` and must never enter frontend code or GitHub.
- The source files in `source-materials/` are the only academic source of truth. Extraction tooling is local-only and content must not be called verified until checked against those sources.

## Design direction

Mobile-first and polished on iPhone and desktop: warm off-white canvas, deep navy primary, teal progress/success, muted gold milestones, and sparing red for risk. Use readable typography, generous space, clear cards, subtle borders/shadows, accessible contrast, and touch targets of at least 44px. Avoid childish gamification and dense mobile tables.

## Delivery method and scope guardrails

Work through the supplied phases in order and stop after each for testing. Preserve working functionality, run type checking and a production build after every phase, fix errors before completion, and report changed files, database/manual steps, and tests. Maintain `PROJECT_SPEC.md`, `IMPLEMENTATION_LOG.md`, and later `CONTENT_AUDIT.md`.

Do not add public sign-up, multi-student management, RLS work, AI grading/chat, notifications, calendar integration, uploads/slide viewer, a CMS, dark mode, avatars, badges, leaderboards, or unrelated redesign.

Success means the student always knows the next task, cannot fake chapter completion, receives realistic source-grounded practice, and the coach can understand progress and weaknesses without screenshots.
