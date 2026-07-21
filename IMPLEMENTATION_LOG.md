# Implementation Log

## Phase 0 — Permanent project brief

- Preserved the product requirements and locked constraints in `PROJECT_SPEC.md`.
- Retained the original Word prompt pack at the repository root.

## Phase 1 — Project bootstrap

Status: complete on 20 July 2026.

Implemented:

- Initialized the Git repository and retained the original Word prompt pack.
- Added Vite, React, TypeScript, Tailwind CSS, Lucide React, Recharts, React Router, and the Supabase JavaScript client.
- Added the requested feature-first source structure and reserved later-phase directories.
- Configured `HashRouter` and relative Vite asset paths for GitHub Pages and custom-domain compatibility.
- Added a Supabase client that reads only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Added email/password login without registration, profile role lookup, student/coach route guards, role redirects, temporary role shells, logout, and a not-found page.
- Added frontend and local seed environment templates and ignored all real environment files.
- Added the GitHub Actions Pages build/deploy workflow and project setup documentation.

Verification:

- `npm install`: passed; 190 packages audited with 0 vulnerabilities.
- `npm run typecheck`: passed.
- `npm run build`: passed with Vite 6.4.3.
- Development server startup: passed.

Manual dependency: login cannot be exercised until the Phase 2 schema exists and the two Supabase Auth users have matching `profiles` rows.

## Phase 2 — Supabase schema and seed architecture

Status: complete on 21 July 2026.

Implemented locally:

- Added a transactional replacement schema that permanently drops the 18 retired Fitness Desk tables and its trigger function.
- Added the nine Study Command Centre tables, constraints, foreign keys, indexes, grants, and explicit no-RLS configuration.
- Added deterministic core JSON for 2 courses, 4 assessment blocks, and 28 learning units; each assessment's weights total 100%.
- Reserved four assessment content directories; academic content remains intentionally empty.
- Added typed application data models and small query helpers.
- Added a service-role-only, idempotent seed script with row-count verification.

Verification:

- Core seed audit: 2 courses, 4 assessments, 28 units, and 100% total weight per assessment.
- `npm install`: passed; 195 packages audited with 0 vulnerabilities.
- `npm run typecheck`: passed.
- `npm run build`: passed with Vite 6.4.3.
- Reused Supabase project: replacement schema applied successfully.
- Permanent cleanup audit: all 18 retired Fitness Desk tables return `PGRST205` and are confirmed removed.
- Live seed: verified 2 courses, 4 assessment blocks, 28 learning units, and 0 schedule tasks.
- Authentication verification: two email-confirmed Auth users exist; Khalid maps to `student` and Abdulla maps to `coach`. The frontend anon credentials can read both role rows.
- GitHub `main` was force-replaced at commit `27e36dc`; the Pages build and deployment both passed.
- Added a one-time service-worker and cache cleanup after the retired Fitness Desk PWA continued serving its offline shell from users' browsers.

## Phase 3 — Design system and application shell

Status: complete on 21 July 2026.

Implemented:

- Added the warm off-white, deep navy, teal, muted-gold, and restrained-risk visual tokens with reusable card shadows and accessible focus/reduced-motion behavior.
- Added `AppHeader`, `DesktopSidebar`, `MobileBottomNav`, `PageContainer`, `StatCard`, `ProgressBar`, `ProgressRing`, `StatusBadge`, `AssessmentCard`, `TodayTaskCard`, `EmptyState`, `LoadingState`, `ErrorState`, and `ConfirmDialog`.
- Replaced the temporary role shells with a responsive application shell and role-specific navigation.
- Added every specified student and coach route, with explicit honest empty states where later phases own the data or feature.
- Polished the login page around the message: “One task at a time. Finish it. Prove it. Move forward.”
- Kept logout, role guards, redirects, and Supabase authentication behavior intact.

Verification:

- Authenticated visual QA passed for student and coach at 390 × 844 and 1440 × 1000.
- Login visual QA passed at both widths.
- All tested pages reported viewport width equal to document width; no horizontal overflow.
- No fabricated academic scores, task completion, or activity were introduced.
- `npm run typecheck`: passed.
- `npm run build`: passed.

## Phase 4 — Student dashboard and roadmap

Status: complete on 21 July 2026.

Implemented:

- Connected the student dashboard to live Supabase courses, assessments, learning units, study tasks, attempts, and activity.
- Added the live Today’s Task state, type-aware task routing, and idempotent manual task completion recorded in `activity_log`.
- Added next-exam countdown and weighted assessment progress.
- Added distinct plan-completion and readiness metrics without treating missing data as a zero score.
- Added four live assessment cards with completed units, weighted progress, readiness, dates, and risk status.
- Added the next-five-tasks list and recent weak-topic preview.
- Added four responsive seven-step assessment roadmaps with completed, current, up-next/locked, and locked states.
- Enforced direct-route unit locks for students and verified coach lock bypass.
- Added pure progress utilities for unit completion, weighted completion, readiness, overdue tasks, risk state, next unit, roadmap state, and date/percentage calculations.

Current honest data state:

- The Phase 9 schedule is not seeded yet, so Today’s Task and upcoming tasks show live empty states.
- No quiz/mock attempts exist yet, so readiness is shown as unavailable rather than as a fabricated 0%.
- Each assessment correctly exposes its first chapter and locks later units.

Verification:

- `npm run test:progress`: 7/7 tests passed.
- Authenticated student dashboard and roadmap QA passed at 390 × 844 and 1440 × 1000.
- Four assessments, four current-unit labels, and four up-next labels verified at both widths.
- Locked student deep-link, unlocked student deep-link, and coach bypass behaviors passed.
- No tested page produced horizontal overflow.
- `npm run typecheck`: passed.
- `npm run build`: passed.

## Phase 5 — Chapter study packs and quiz gate

Status: complete on 21 July 2026.

Implemented:

- Added live chapter study pages driven only by the populated sections in `learning_units.content_json`: overview, definitions, main ideas, processes/models, comparisons, common confusions, likely essay themes, and explain-it-yourself prompts.
- Added an honest study-pack empty state and sticky chapter-quiz action without inventing academic content.
- Added active chapter-question loading and randomized selection of exactly five MCQs and one essay, with immediate-selection repetition avoided whenever alternatives exist.
- Added persisted in-progress attempts, attempt numbering, selected question IDs, start/submit activity logs, and guarded single submission.
- Added one-question-at-a-time navigation with free numbered navigation, required MCQs, a live essay word count, and the 60-word minimum.
- Added objective grading with the chapter pass gate of at least 4/5 MCQs plus a submitted 60-word essay. Essays are stored for coach review and are never auto-graded.
- Added result review for every MCQ, correct answers, explanations, weak-topic extraction, essay submission status, retry, and next-unlocked-unit routing.
- Added automatic device-local answer backup, refresh recovery tied to the matching Supabase attempt, and backup removal only after a successful submission.
- Added coach-only, non-mutating quiz preview behavior so coach navigation cannot create attempts or alter student progress.

Current honest data state:

- Chapter `content_json` fields and chapter question banks are not populated yet, so the live pages clearly report what is missing.
- No fake questions, answers, scores, or attempts were inserted for visual QA.

Verification:

- `npm run test:quiz`: 5/5 tests passed for selection size, non-repetition, essay word count, pass rules, and weak-topic extraction.
- `npm run test:progress`: 7/7 regression tests passed.
- Authenticated student study/quiz routes passed at 390 × 844; authenticated coach preview routes passed at 1440 × 1000.
- No tested page produced horizontal overflow.
- `npm run typecheck`: passed.
- `npm run build`: passed.

## Phase 6 — Revision centre and weak-topic practice

Status: complete on 21 July 2026.

Implemented:

- Replaced the revision placeholder with a four-assessment revision hub that follows the live sequential roadmap state.
- Added concise revision-pack rendering for assessment overview, chapter summaries, essential definitions, must-remember lists, comparison tables, likely essay questions, answer plans, and common mistakes.
- Added collapsible revision sections and persisted which available sections the student has opened on the current device.
- Added personalized weak-topic frequency ranking across submitted chapter quizzes, mixed practice, and future mock attempts.
- Added revision-content reminders for weak topics using direct reminders, essential definitions, chapter summaries, or must-remember lists when available.
- Added mixed-practice selection of exactly 10 active revision MCQs, including all three chapters where their banks are populated and prioritizing frequently missed topics.
- Added one-question-at-a-time mixed practice, free navigation, required answers, local answer backup, guarded submission, immediate grading, explanations, score review, and weak-topic updates.
- Added persisted practice starts/submissions with selected question IDs, every answer, objective score, duration, attempt number, weak topics, and activity entries.
- Added a dedicated Full Revision completion gate that requires every populated main section to have been opened and at least one mixed-practice set to have been submitted.
- Stored revision completion as a separate passed attempt plus activity entry, preventing practice scores from unlocking Mock 1 prematurely.
- Added non-mutating coach preview behavior for revision content and question-bank availability.

Current honest data state:

- Revision `content_json` fields and revision-practice question banks are not populated yet, so the live pages clearly report what is missing.
- The four revision cards remain locked for the student until their three preceding chapter gates pass.
- No fake content, questions, attempts, completions, or weak topics were inserted for visual QA.

Verification:

- `npm run test:revision`: 5/5 tests passed for weak-topic frequency, three-chapter selection, weak-topic prioritization, grading, and reminder lookup.
- `npm run test:quiz`: 5/5 regression tests passed.
- `npm run test:progress`: 7/7 regression tests passed, including attempt-backed revision completion.
- Authenticated student revision hub and deep-link lock passed at 390 × 844.
- Authenticated coach revision preview and honest content/practice empty states passed at 1440 × 1000.
- No tested page produced horizontal overflow, and coach preview exposed no completion action.
- `npm run typecheck`: passed.
- `npm run build`: passed.

## Phase 7 — Verified academic content integration

Status: complete on 21 July 2026.

Implemented:

- Audited and imported the supplied package as the only academic source: 2 course maps, 12 chapter packs, 12 question banks, 4 revision packs, 12 fixed mocks, and 12 answer keys.
- Added deterministic Markdown parsing, stable-ID-to-UUID mapping, idempotent Supabase upserts, pre-import state documentation, and terminal summaries for inserted, updated, skipped, and invalid records.
- Populated all 12 existing chapter pages and all four existing eight-section revision packs with exact supplied Markdown rendered through the current design system.
- Reused the 144 supplied chapter MCQs and 48 essays for chapter gates, and reused the same MCQ banks for balanced 10-question mixed practice without duplicating academic records.
- Updated provisional completion to require 4/5 MCQs plus a genuine non-empty essay response, with exact selected IDs, answers, duration, attempt number, and weak topics stored.
- Imported 12 fixed papers in supplied order with 12 matching keys, student answer-key concealment before submission, objective grading, essay persistence, sequential Mock 1–3 unlocking, timers, and the documented MKT112 format notice.
- Added live student results, objective-only pending wording, marked totals, Mock 1–3 progression, coach attempt history, supplied answer/model/marking views, numeric mock essay marks, optional feedback, activity, and readiness analytics.
- Fixed the outer learning-unit gate so route changes reload attempt evidence instead of evaluating the next unit against a stale pre-submission snapshot.
- Added a repeatable authenticated browser QA runner that uses short-lived sessions and removes only the exact temporary attempts and linked activity/reviews it creates.

Verified data state:

- 28/28 learning units contain approved academic content.
- 282/282 academic question records are present: 192 chapter-bank questions and 90 fixed-mock questions.
- A second import skipped all 28 unit records and all 282 questions with zero duplicates or invalid records.
- Post-QA cleanup restored attempts, essay reviews, and activity to their pre-QA counts of zero.

Verification:

- `npm run content:audit`: passed with all required totals and zero errors.
- `npm test`: 29/29 tests passed (18 regression tests and 11 Phase 7 integration tests).
- Authenticated student and coach QA passed across 11 required page states at 390 × 844 and 1440 × 1000, producing 22 screenshots.
- Pre-submission answer concealment and post-submission answer/model display passed.
- Coach numeric marking, optional feedback, total-score update, and analytics passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
