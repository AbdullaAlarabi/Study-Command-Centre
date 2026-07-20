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
- Authentication prerequisite audit: 0 Auth users and 0 profiles currently exist; the student and coach accounts remain a manual setup step.
- GitHub `main` was force-replaced at commit `27e36dc`; the Pages build and deployment both passed.
