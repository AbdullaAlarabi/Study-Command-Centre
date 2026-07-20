# Study Command Centre

Private, mobile-first MKT112 and MGT112 study tracking for one student and one coach.

## Local setup

Requirements: Node.js 20+ and npm.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase project URL and anon key.
4. Start locally: `npm run dev`
5. Run checks: `npm run typecheck` and `npm run build`

Frontend environment variables:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The browser app must never receive a Supabase service-role key. A later phase uses `.env.seed` locally for idempotent seeding; that file is ignored by Git.

## Supabase database and authentication setup

This project intentionally reuses the retired Fitness Desk Supabase project. The first section of [`supabase/schema.sql`](supabase/schema.sql) permanently drops all Fitness Desk tables and data before creating the Study Command Centre schema.

1. Open the existing Supabase project and go to **SQL Editor**.
2. Copy and run the complete `supabase/schema.sql` file. This deletion is irreversible.
3. In **Authentication → Users**, remove any retired users and manually create exactly one student and one coach email/password user.
4. In **Table Editor → profiles**, add one row for each Auth user. Copy the Auth user UUID into `id`, choose `student` or `coach` for `role`, and add a display name.
5. Copy `.env.example` to `.env.local` and use the existing project's URL and anon key.
6. Copy `.env.seed.example` to `.env.seed` and use the existing project's URL and service-role key. Keep `.env.seed` local and uncommitted.
7. Run `npm run seed`.

The seed is idempotent and verifies the database contains at least:

- 2 courses
- 4 assessment blocks
- 28 learning units
- 0 schedule tasks until the approved schedule phase

You can verify the core rows in SQL Editor:

```sql
select 'courses' as item, count(*) from public.courses
union all
select 'assessment_blocks', count(*) from public.assessment_blocks
union all
select 'learning_units', count(*) from public.learning_units
union all
select 'study_tasks', count(*) from public.study_tasks;
```

## GitHub Pages

The app uses `HashRouter`, and Vite emits relative asset URLs. This supports both repository Pages URLs and custom domains without rebuilding with a hardcoded repository name.

1. Create a GitHub repository and push this project to its `main` branch.
2. Add repository Actions secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In **Settings → Pages**, select **GitHub Actions** as the source.
4. Run the **Deploy to GitHub Pages** workflow or push to `main`.

If a custom domain is later configured, preserve its `CNAME` file under `public/`.

## Security boundary

This app intentionally does not use Row Level Security, as required by the project brief. The Supabase anon key can therefore be used outside the interface. Use this architecture only for a private, low-risk project, store no sensitive information, and never commit `.env.local` or `.env.seed`.

No RLS, Edge Functions, AI API, public registration, password reset, or multi-user administration is included.
