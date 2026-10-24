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
9. App icon from `public/icon-source.png`
10. Teacher gaps tab
11. Admin delete (per item + bulk cleanup)
12. Multi-day schedule block
13. Pop-up notifications

Phases 9–13 come from client feedback, see "Feedback round 1" below. They are independent; build them in order, one session each.

## Verification
- `npm run build` + Lighthouse PWA check
- Supabase local (`supabase start`): RLS tests via SQL (teacher A can't read private report of B; cross-group blocked)
- Manual on phone: install PWA (Android + iOS), login via admin link, link Google, submit report, receive test push from admin screen

## Feedback round 1 (phases 9–13)
 
Client feedback after phase 8. Decisions:
- Teachers see **all** gaps of their group's students, including gaps from private reports. They see only the gap text, never the private report body; report RLS is unchanged.
- Managers get both per-item delete and a bulk "delete older than" cleanup (Supabase free tier).
- A schedule slot can be one continuous block across days (start day + time → end day + time), within the week.

### Phase 9 — App icon
Source: `public/icon-source.png`, 1254×1254 RGB, a leopard/camo heart on a flat lavender background (~`#ECE6FB`; sample the corner pixel for the exact color). The heart reaches ~8%–92% of the width.
- Add `sharp` as a devDependency. Rewrite `scripts/make-icons.mjs` to read the source and write to `public/`:
  - `icon-192.png`, `icon-512.png` (full image, resized)
  - `icon-maskable-512.png`: the image scaled to ~72% and centered on a 512 canvas filled with the background color. Android's mask keeps only the middle 80%, so without padding the heart gets cut.
  - `apple-touch-icon.png` (180×180)
  - `favicon-32.png`
- Add the npm script `"icons": "node scripts/make-icons.mjs"`. Commit the generated PNGs; keep `icon-source.png`. Delete `public/icon.svg`.
- `vite.config.ts`: the maskable entry → `icon-maskable-512.png`; `includeAssets` lists the favicon + apple-touch-icon; `background_color` → the lavender.
- `index.html`: favicon → `favicon-32.png` (`type="image/png"`), `apple-touch-icon` → `apple-touch-icon.png`.
- `src/sw.ts` keeps `icon-192.png` for `icon`/`badge` (a monochrome badge is a later nicety).
- Note in PROGRESS: installed phones may need to remove and re-add the app to see the new icon (iOS especially).
- Verify: `npm run icons && npm run build`, open the PNGs, check the manifest icons in DevTools → Application.

### Phase 10 — Teacher gaps tab
- Migration `supabase/migrations/<ts>_group_gaps.sql`: `public.group_gaps()`, `language sql stable security definer set search_path = ''` (same pattern as `my_group()`). It returns `table(id, description, student_id, student_name, week_start, teacher_name)` from `report_gaps` joined to `students`, `weekly_reports`, `profiles`, where `r.submitted_at is not null and s.group_id = public.my_group()`. Then `revoke execute … from public, anon; grant execute … to authenticated`.
- Pull the per-student list UI out of `src/features/admin/AdminGaps.tsx` into a shared `src/features/gaps/GapsList.tsx`. It takes normalized rows `{ id, studentId, studentName, groupId?, week, teacher, description }` and an optional `onDelete(id)` (used in phase 11). Grouping and sorting stay as they are now (students by Hebrew name, gaps newest week first).
- New `src/features/gaps/api.ts` with `fetchGroupGaps()` (`supabase.rpc('group_gaps')`) and `src/features/gaps/TeacherGaps.tsx` (title `🧩 פערים`, empty state, Loading/Error like the other teacher pages).
- `App.tsx`: teacher route `gaps`. `Layout.tsx`: a 5th teacher nav item `{ to: '/gaps', emoji: '🧩', label: 'פערים' }`, placed before פרופיל.
- `AdminGaps` keeps `fetchGaps()` + the group filter and maps the rows into `GapsList`.
- `supabase/tests/rls.sql`: a teacher gets same-group gaps from a **private** report through `group_gaps()`, gets none from the other group, and anon cannot execute it.
- Verify: build, local RLS test, `npx supabase db push --linked`, manual check as a teacher.

### Phase 11 — Admin delete
Every delete uses `window.confirm` with a Hebrew warning that says what cascades (the existing pattern in `AdminManage`). Mutations go in `admin/api.ts` and use `ok()`. The `admin_all` RLS already allows delete, so no migration is needed. Invalidate the related query keys on success.
- **Report**: a "🗑️ מחיקת הדוח" button inside the expanded report in `AdminReports`. Its gaps cascade.
- **Gap**: ✕ per gap row in `AdminGaps`, through `GapsList.onDelete`.
- **Schedule**: in `AdminSchedules`, one chip per teacher who submitted that week, with 🗑️. It deletes that teacher's `weekly_schedules` row; slots cascade.
- **Student**: "מחיקה" next to השבתה in `StudentsSection`. Warning: the student's gaps are deleted too.
- **Group**: delete in `GroupsSection`. Warning: its students and their gaps are deleted, and its teachers are left without a group (`on delete set null`).
- **Teacher**: delete in `TeachersSection`. This needs the service role, so in `supabase/functions/invite-teacher/index.ts` generalize `remove_admin` into `remove`: for admins keep the not-self and not-last checks, for teachers just `auth.admin.deleteUser`. The profile cascade removes their reports, gaps, schedules, push subscriptions and links. Update the `InviteBody` type and `AdminsSection` to use `remove`. Redeploy: `npx supabase functions deploy invite-teacher --use-api --project-ref vhaonognazlgibohxioe`.
- **Bulk cleanup**: a new `CleanupSection` on ניהול (`🧹 ניקוי נתונים ישנים`) with a date input (default: the Sunday about 6 months back, using `week.ts` helpers) and the button "מחיקת דוחות ומערכות לפני התאריך". After a confirm it deletes `weekly_reports` and `weekly_schedules` with `week_start < cutoff` (`.delete({ count: 'exact' })`), shows "נמחקו X דוחות ו־Y מערכות", and invalidates the admin queries. Children cascade.
- Verify: build, deploy the function, then in the UI delete each kind of test data and check it is gone (also in Supabase table editor).

### Phase 12 — Multi-day schedule block
- Migration `<ts>_slot_end_day.sql`: `alter table schedule_slots add column end_day smallint; update … set end_day = day; alter … set not null`. Drop the old table check `(end_time > start_time)`; get its real name first with `npx supabase db query --linked "select conname from pg_constraint where conrelid = 'public.schedule_slots'::regclass"` (probably `schedule_slots_check`). Then add `check (end_day between 0 and 6 and (end_day > day or (end_day = day and end_time > start_time)))`.
- `src/features/schedule/api.ts`: `Slot` gets `end_day`, which goes into every select, `saveSchedule`'s `clean` and `byTime`. New helpers:
  - `coversDay(s, day)`: `s.day <= day && day <= s.end_day`
  - `slotLabel(s)`: `16:00–17:00` for a same-day slot, `יום ראשון 18:00 → יום שלישי 12:00` for a multi-day one (use `DAYS`)
- `SchedulePage` form, two rows per card: "מ־ [day select][start time]" and "עד [day select][end time]". The ✕ stays on the first row. A new row defaults to `end_day = day`. Changing the start day sets `end_day = max(end_day, day)`. `rowOk` compares `(day, start_time) < (end_day, end_time)`; error text "יש למלא שעות (סיום אחרי התחלה) והערה". "Copy last week" keeps `end_day`.
- The teacher "כל המורות" tab (`AllSchedules`) and `AdminSchedules` list a block under every day it covers (`coversDay`, not `s.day === day`) and show `slotLabel`. Within a day, blocks that started on an earlier day sort first, then by start time.
- Verify: build, `db push`, create a Sun 18:00 → Tue 12:00 block and check it on Sun, Mon and Tue in both views; Tue → Sun is rejected; old slots still show correctly.

### Phase 13 — Pop-up notifications
On phones, whether a notification pops up (heads-up) is finally an OS/channel setting; the app can only raise priority.
- `src/sw.ts` `showNotification` options: add `tag: 'tamab'`, `renotify: true`, `requireInteraction: true` and `vibrate: [200, 100, 200]` (cast the options if TS lib types lack `vibrate`/`renotify`).
- `supabase/functions/send-reminders/index.ts` `push()`: `webpush.sendNotification(sub, payload, { urgency: 'high', TTL: 86400 })`, so delivery is not delayed in Android doze. Redeploy `send-reminders`.
- `src/features/push/PushCard.tsx`: when notifications are enabled, a short hint. Android: הגדרות → התראות של האפליקציה → הפעילי "הצגה על המסך" (Pop on screen). iOS: הגדרות → התראות → תמב → סגנון באנר "קבוע".
- Verify: build + deploy, send a test push from ניהול on Android with the screen on (it should drop down from the top and vibrate) and with the screen off.
