# tamab

Mobile-first PWA for an admin managing ~6 tutors (2 groups × 3 teachers). Weekly reports, student gaps, weekly schedules, push reminders.

**Full spec: [PLAN.md](PLAN.md). Read it first.**

## Working rules
- Build phase by phase, following "Build order" in PLAN.md. Stop after each phase for user review.
- Ask the user for secrets (Supabase URL/keys, Google OAuth, VAPID). Never commit secrets; the service role key goes only in Edge Function secrets.
- Keep replies short.

## Conventions
- Vite + React + TS, Tailwind, TanStack Query, React Router (`HashRouter`), Supabase (RLS on every table).
- UI is Hebrew only, `dir="rtl"`. Use logical CSS (`ms-`/`me-`, `ps-`/`pe-`), not left/right.
- Mobile-only layout, max-width ~480px. Cute pastel theme (pink/lavender/peach), rounded cards, emoji accents.
- Week starts Sunday, timezone `Asia/Jerusalem` (`src/lib/week.ts`).
- Deployed to GitHub Pages at `/tamab/` (Vite `base`), repo `nizaninbar/tamab`.
- DB changes only via `supabase/migrations/*.sql`.

## Sessions
One session per phase. After PLAN.md, read **[docs/PROGRESS.md](docs/PROGRESS.md)** (status, env facts, commands, gotchas). Update it and commit at the end of every phase.
