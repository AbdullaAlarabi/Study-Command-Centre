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

## Supabase authentication setup

Phase 1 expects a Supabase project with a `profiles` table. The complete schema arrives in Phase 2. To test role routing after that schema is applied:

1. In Supabase Authentication, manually create one student and one coach email/password user.
2. Do not expose registration in the app.
3. Add a matching `profiles` row for each Auth user. The row `id` must equal `auth.users.id`; set `role` to `student` or `coach`.
4. Put the project URL and anon key in `.env.local` and restart Vite.

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
