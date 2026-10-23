# tamab — MVP Plan

## Context
Greenfield (empty dir). Admin manages 6 tutors split into 2 groups (3 teachers per student group). Need weekly reports (lessons taught, per-student gaps, mood, notes, private/public), weekly schedule submission, and admin-scheduled push reminders. Mobile-only, Hebrew RTL, cute/girly PWA.

## Stack
- **Vite + React + TypeScript**, `vite-plugin-pwa` (manifest + service worker w/ push handler)
- **Tailwind CSS** (RTL via `dir="rtl"` + logical props), font: *Rubik* / *Varela Round* (Hebrew, rounded)
- **Supabase**: Postgres + RLS, Auth, Edge Functions, `pg_cron`
- **TanStack Query** for data, **React Router**
- Hosting: **GitHub Pages** from repo `github.com/nizaninbar/tamab` (URL `https://nizaninbar.github.io/tamab/`), deployed by a GitHub Actions workflow on push to `main`. Vite `base: '/tamab/'`, `HashRouter` (no server rewrites on Pages), PWA `scope`/`start_url` = `/tamab/`. Supabase URL + anon key go in repo Actions secrets → build env.

## Auth
1. Admin creates teacher → Edge Function `invite-teacher` (service role) creates the user and a **reusable personal link** `…/#/join?t=<random token>`. Only a hash of the token is stored, in `access_links(user_id, token_hash, revoked_at)`. The admin shares the link (WhatsApp).
2. Opening the link → Edge Function `redeem-link` checks the hash, generates a session for that user (admin `generateLink` + `verifyOtp`), and returns it. The Supabase session persists in localStorage, so the teacher stays logged in. The same link works again on a new device or after logout, until the admin regenerates or revokes it.
3. Optional: the teacher links Google (`supabase.auth.linkIdentity({provider:'google'})`) and can then log in with Google instead.
- Admin bootstrapped manually (role set in `profiles`).

## Data model
- `groups(id, name)`
- `profiles(id→auth.users, full_name, role: 'admin'|'teacher', group_id, avatar_emoji)`
- `students(id, group_id, full_name, active)` — admin-managed
- `weekly_reports(id, teacher_id, week_start date, taught text, mood smallint 1–10, notes text, is_private bool, submitted_at)` unique(teacher_id, week_start)
- `report_gaps(id, report_id, student_id, description text NOT NULL)`
- `weekly_schedules(id, teacher_id, week_start, unique)` + `schedule_slots(id, schedule_id, day 0–6, start_time, end_time, note text NOT NULL)` — the note (reason/what for) is mandatory
- `push_subscriptions(id, user_id, endpoint, p256dh, auth)`
- `settings(id=1, reminder_day, reminder_time, timezone='Asia/Jerusalem')`

**RLS**
- Admin: full access.
- Teacher: CRUD own reports/schedules/gaps; read students of own group; read **public** reports (+gaps) of teachers in same group; read **all** teachers' schedules.

## Reminders (Web Push, VAPID)
- SW registers push subscription after install (iOS: must be installed to home screen — show an install guide screen).
- `pg_cron` runs hourly → calls Edge Function `send-reminders` → if current Israel day/hour matches `settings`, push to teachers without a submitted report for the current week (use `web-push` lib in Deno).

## Screens (Hebrew)
**Teacher**
- בית: this week's status cards (report ✓/✗, schedule ✓/✗), feed of group's public reports
- דוח שבועי: מה לימדתי השבוע (textarea) · פערי תלמידים (pick student from group → mandatory text, add/remove rows) · איך היה השבוע (1–10 slider; the emoji changes with the value 😫→🥰) · הערות ובקשות נוספות · switch פרטי/ציבורי. Draft autosave, edit until week end.
- מערכת שבועית: next week's slots (day + times + mandatory note), "copy last week" helper; tab to view all teachers' schedules
- פרופיל: Google link, enable notifications

**Admin**
- דשבורד: week picker, per-teacher submission status, mood overview
- דוחות: list/filter by teacher/group/week; report detail
- פערים: per-student gap history across weeks
- מערכות: combined weekly schedule grid of all teachers
- ניהול: teachers (create, copy/regenerate/revoke personal link, assign group), groups, students, reminder day/time, "send test push"

## Design
Pastel palette (pink/lavender/peach), rounded-2xl cards, soft shadows, emoji accents, bottom tab bar, big tap targets, max-width ~480px.

## Project structure
```
src/
  app/ (router, providers, auth guard)
  features/{auth,reports,schedule,students,admin,push}/
  components/ui/ (Button, Card, EmojiScale, Switch, BottomNav)
  lib/supabase.ts, lib/week.ts (week_start = Sunday, Asia/Jerusalem)
  sw.ts
supabase/
  migrations/*.sql (schema + RLS + cron)
  functions/{invite-teacher,send-reminders}/
```

## Handoff (build happens in a new Sonnet 5.5 session)
- After approval: copy this plan to `c:\Projects\tamab\PLAN.md` (this is the only step in this session).
- New session prompt: "Read PLAN.md and build tamab phase by phase; stop after each phase for my review."
- User already has a Supabase account. The build session should ask for: a new project's URL + anon key (`.env.local`), the service role key (Edge Function secrets only, never in the frontend), and Google OAuth client ID/secret (Supabase Auth → Providers). Use `supabase link` + `supabase db push` for migrations, and `npx web-push generate-vapid-keys` for VAPID.

## Build order
0. `git init`, `.gitignore` (incl. `.env*`), create the GitHub repo `nizaninbar/tamab`, enable Pages (source: GitHub Actions), add `.github/workflows/deploy.yml`
   - Add the Pages URL to Supabase Auth → URL Configuration (Site URL + redirect URLs).
1. Scaffold Vite+TS+Tailwind+PWA, RTL layout, theme, bottom nav
2. Supabase schema + RLS migration, seed (2 groups, admin)
3. Auth: invite link flow + Google linking + role routing
4. Weekly report form + teacher home
5. Weekly schedule
6. Admin screens (dashboard, reports, gaps, schedules, management)
7. Push: subscription, `send-reminders`, cron, settings UI
8. Polish + install guide

## Verification
- `npm run build` + Lighthouse PWA check
- Supabase local (`supabase start`): RLS tests via SQL (teacher A can't read private report of B; cross-group blocked)
- Manual on phone: install PWA (Android + iOS), login via admin link, link Google, submit report, receive test push from admin screen
