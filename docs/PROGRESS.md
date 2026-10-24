# Progress & handoff

One session per phase. Read CLAUDE.md, PLAN.md, then this file. Update it at the end of every phase (status table + notes), then commit.

## Status

| Phase | What | Status |
|---|---|---|
| 0 | Repo, `.gitignore`, Pages, deploy workflow | ✅ done |
| 1 | Vite/React/TS/Tailwind/PWA scaffold, RTL, theme, bottom nav | ✅ done, reviewed |
| 2 | Supabase schema + RLS + seed | ✅ done, applied to hosted project |
| 3 | Auth: invite link flow, Google linking, role routing | ✅ done, reviewed (see Phase 3 notes) |
| 4 | Weekly report form + teacher home | ✅ code done, build passes, **not yet tested in the UI** (needs a teacher + students; see notes) |
| 5 | Weekly schedule (teacher form + all-teachers view) | ✅ code done, build passes, **not yet tested in the UI** |
| 6 | Admin screens (dashboard, reports, gaps, schedules, management) | ✅ code done, build passes, **not yet tested in the UI** |
| 7 | Push: subscription, `send-reminders`, cron, settings UI | ✅ deployed (secrets, function, cron migration); test push verified on a device by the user |
| 8 | Polish + install guide | ✅ code done, build passes, **not yet tested on a device** |
| 9 | App icon from `public/icon-source.png` | ✅ done, build passes, **not yet checked on a device** |
| 10 | Teacher gaps tab (`group_gaps()` RPC) | ✅ code done, build + local RLS tests pass, migration pushed, **not tested in the UI** |
| 11 | Admin delete (per item + bulk cleanup) | ⏳ todo |
| 12 | Multi-day schedule block (`end_day`) | ⏳ todo |
| 13 | Pop-up notifications | ⏳ todo |

## Environment facts

- **Supabase project ref:** `vhaonognazlgibohxioe` (URL `https://vhaonognazlgibohxioe.supabase.co`). CLI already logged in and linked (`supabase/.temp` is gitignored).
- **Frontend env:** `.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (gitignored). The same two are set as GitHub Actions secrets. `.env.example` lists the names.
- **Still needed (ask the user):** service role key (Edge Function secrets only), Google OAuth client ID/secret (phase 3), VAPID keys (phase 7, `npx web-push generate-vapid-keys`).
- **Admin:** `nizan.inbar@gmail.com`, auth uid `42998734-a983-46f0-8a01-5167eec57554`, has a `profiles` row with `role='admin'` (inserted directly; not in a migration). The auth user has an email+password.
- **Groups:** two seeded, "קבוצה א" and "קבוצה ב". No students or teachers yet.

## Commands

- Dev: `npm run dev -- --host` → http://localhost:5173/tamab/
- Build check: `npm run build` (runs `tsc --noEmit` then vite). Must pass; the deploy workflow runs it.
- Push migrations: `npx supabase db push --linked` (works with no DB password). Add `--include-seed` only for first seed.
- Ad-hoc SQL on hosted DB: `npx supabase db query --linked "<sql>"`.
- Local DB for RLS tests (Docker Desktop must run): `npx supabase start`, then
  `docker exec -i supabase_db_tamab psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/rls.sql`, then `npx supabase stop --no-backup`.
  First `start` pulls many images (several minutes). If it errors with a container-name conflict, run `stop --no-backup` first.

## Gotchas (this machine, Windows)

- **`git push` hangs** on the Git Credential Manager. Use:
  `GIT_TERMINAL_PROMPT=0 git -c credential.helper= -c "credential.helper=!gh auth git-credential" push`
- Large bash heredocs with many quotes broke once; use the Write tool for big files.
- Stack versions: Vite 8, React 19, Tailwind 4 (CSS-first `@theme` in `src/index.css`, no tailwind config file), TypeScript 7, vite-plugin-pwa 2, react-router-dom 7.
- `max-w-120` = 480px container. Theme tokens: `blush-*`, `lilac-*`, `peach-*`, `ink`, `ink-soft`, `shadow-soft`.

## What exists

- `src/app/App.tsx`: QueryClient + `HashRouter`, routes `/`, `/report`, `/schedule`, `/profile` (all `Placeholder`).
- `src/components/ui/`: `Layout` (hardcoded teacher nav), `BottomNav` (takes `items`), `Card`.
- PWA: `generateSW` via vite-plugin-pwa, manifest in `vite.config.ts`, placeholder icons from `scripts/make-icons.mjs`. **Phase 7 must switch to `injectManifest` with `src/sw.ts`** for the push handler.
- No `src/lib/supabase.ts` or `src/lib/week.ts` yet.
- DB: `supabase/migrations/20261023000000_schema.sql` (all tables, RLS, helpers `is_admin()` / `my_group()`, trigger blocking role/group self-change). `settings` has its single row. `access_links` has RLS enabled and **no policies** (service role only). `supabase/tests/rls.sql` passed locally.
- RLS tests have not been run against the hosted DB, only local.

## Decisions / deviations from PLAN.md

- New reports default to `is_private = true`.
- `profiles` are readable by every signed-in user (teachers need names for the schedule view).
- Admin profile is bootstrapped by SQL, not by the app.
- Feedback round 1 (phases 9–13): teachers see all gaps of their group, including those in private reports, through the `group_gaps()` security-definer RPC. RLS on reports/gaps is unchanged, so private report bodies stay hidden.

## Phase 3 notes (code done)

- Edge Functions deployed (`npx supabase functions deploy --use-api --project-ref vhaonognazlgibohxioe`): `invite-teacher` (admin only; actions create (optional `role: 'admin'`)/regenerate/revoke/remove_admin; returns one-time `token`; admins are added/removed from the Admins section on `/manage`) and `redeem-link` (public; token → session). Both `verify_jwt = false` in config.toml; invite-teacher checks the admin role itself. The service role key is auto-injected in hosted functions, so no secret was needed.
- Teacher auth users get a placeholder email `teacher-<uuid>@tamab.invalid`. Link format: `https://nizaninbar.github.io/tamab/#/join?t=<token>`.
- Frontend: `src/lib/supabase.ts`, `features/auth/{AuthProvider,LoginPage,JoinPage,ProfilePage}.tsx`; `Layout` is the auth guard and picks nav by role. Admin pages are placeholders (phase 6); admin `/manage` temporarily shows ProfilePage (for sign out).
- Verified: build passes; functions reject unauthenticated/bogus calls (403/401). **Not yet tested end to end**: needs admin login in the UI, then a teacher created via `invite-teacher` (no UI until phase 6).
- Google provider, manual linking and Auth URL config were set up by the user (existing Google OAuth client reused; redirect URI is the Supabase callback). Admin login checked in the UI. Teacher link flow still untested end to end: test it in phase 6 once the admin UI can create teachers.

## Phase 4 notes

- `src/lib/week.ts` (Sunday week start, Israel tz: `currentWeek`, `addWeeks`, `weekLabel`). UI: `EmojiScale` (also exports `moodEmoji`), `Switch`.
- `features/reports/api.ts` (queries/save), `ReportPage` (autosave draft after 1s, serialized saves; submit validates taught + mood + gap rows and sets `submitted_at`; stays editable, button becomes "עדכון הדוח"), `features/home/TeacherHome.tsx` (status cards + group feed of submitted public reports, excluding own).
- Gaps are saved by delete-all + insert on each save; rows missing a student or text are dropped from drafts and blocked on submit.
- "Edit until week end" is UI-only (only the current week is editable); RLS does not enforce it.
- Schedule status card reads `weekly_schedules` for the current week; phase 5 should decide whether it means current or next week (plan says the form is for next week).
- Testing needs students (no UI until phase 6) and a teacher: insert via SQL/`invite-teacher` for now.

## Phase 5 notes

- `features/schedule/{api.ts,SchedulePage.tsx}`; route `/schedule`. Form is for **next week** (`addWeeks(currentWeek(), 1)`); tabs "שלי" / "כל המורות" (read-only, grouped by day, all teachers via RLS).
- Save is explicit (button), not autosave: upsert `weekly_schedules`, then delete-all + insert slots. Saving with zero slots is allowed and counts as submitted. Validation: end after start, note required (also enforced in DB).
- "Copy last week" appends the current week's slots to the form.
- Home status card now checks next week's schedule (`my-schedule-exists` query key uses next week).
- Phase 6 can reuse `fetchAllSchedules(week)` / `DAYS` for the admin grid.

## Phase 6 notes

- `features/admin/`: `api.ts` (queries/mutations + `invite()` wrapper for the `invite-teacher` function), `ui.tsx` (shared inputs, `GroupSelect`, `ReportDetail`), pages `AdminDashboard`, `AdminReports`, `AdminGaps`, `AdminSchedules`, `AdminManage`. `components/ui/WeekPicker` is shared. `Placeholder` removed.
- Dashboard: per-teacher report state (submitted/draft/none), mood, schedule status for the week **after** the picked one, avg mood. Reports/gaps list only submitted reports (admin sees private ones too, marked 🔒).
- Manage: create teacher (name + group) → one-time personal link shown with copy button; regenerate/revoke (confirm); change teacher group; rename/add groups; add/deactivate students; reminder day/time saved to `settings`. "Send test push" is phase 7. No delete for teachers/groups/students.
- The link token is only shown once (only the hash is stored), so to re-share a link use "קישור חדש".
- **Teacher link flow still untested end to end**: create a teacher in ניהול, open the link in a private window.

## Phase 7 notes

- SW is now `injectManifest` (`src/sw.ts`, typechecked via `tsconfig.sw.json`, excluded from the main tsconfig). Handles `push` + `notificationclick`.
- `features/push/{usePush.ts,PushCard.tsx}`: enable/disable notifications, stores subscription in `push_subscriptions`. `PushCard` is on the profile page and on admin ניהול (with a "send test push" section). iOS not-installed shows a short hint (full install guide = phase 8).
- `supabase/functions/send-reminders`: admin `{action:'test', user_id?}` or cron (`x-cron-secret` header) → sends to teachers without a submitted report this week when Israel day/hour match `settings`. Deletes 404/410 subscriptions. `verify_jwt = false`.
- Migration `20261024000000_reminder_cron.sql` schedules hourly pg_net call; reads vault secret `cron_secret`.
- Done: VAPID keys generated (public key in `.env.local` + Actions secret `VITE_VAPID_PUBLIC_KEY`; private key/subject/`CRON_SECRET` are function secrets; vault `cron_secret` matches). `send-reminders` deployed, migration pushed. Needs push to `main` to ship the frontend.

## Phase 8 notes

- `features/install/{useInstall.ts,InstallCard.tsx}`: install guide (Android/desktop uses captured `beforeinstallprompt` button, iOS gets Safari steps, else browser-menu steps). Hidden when already standalone. Shown as a dismissible banner for teachers (Layout, dismissal in localStorage) and always on profile + admin ניהול.
- `OfflineBanner` in Layout, `ErrorBoundary` in `main.tsx`. `usePush` now imports `isIos`/`isStandalone` from `useInstall`.
- Remaining: Lighthouse PWA check, end-to-end teacher flow test on a phone.

## Phase 9 notes

- `npm run icons` (`scripts/make-icons.mjs`, uses `sharp`) writes `icon-192/512`, `icon-maskable-512` (image at 72% on the background color), `apple-touch-icon` (180) and `favicon-32` into `public/`. Generated PNGs are committed; `icon.svg` removed.
- Background color is the mean of a patch near the corner, `#ebe5fd` (the outermost source pixels are slightly darker, `#e7e2fb`, and left a visible seam). Manifest `background_color` uses it; `theme_color` is still pink.
- Already installed phones may need to remove and re-add the app to see the new icon (iOS especially).
- Not done: DevTools → Application manifest check in a browser (manifest output in `dist/` verified by hand).

## Phase 10 notes

- Migration `20261025000000_group_gaps.sql`: `public.group_gaps()` security-definer RPC (submitted reports only, `s.group_id = my_group()`), execute only for `authenticated`. Admins have no group, so it returns nothing for them; admin keeps `fetchGaps()`.
- `features/gaps/`: `GapsList` (shared per-student list, takes normalized `GapItem` rows + optional `onDelete` for phase 11), `api.ts` (`fetchGroupGaps`), `TeacherGaps` (route `/gaps`, 5th teacher nav item 🧩 before פרופיל). `AdminGaps` maps its rows into `GapsList`.
- `rls.sql` extended: T1 sees the same-group gap from T2's private report, T3 sees none, anon gets `insufficient_privilege`. Passed locally.
- Migration pushed to hosted DB; anon has no execute, authenticated does. Todo: check as a teacher in the UI.

## Admin management (post-phase 8)

- `/manage` has an `AdminsSection` (`AdminManage.tsx`): list admins, add one by name (one-time personal link, same flow as tutors), new link / revoke / remove. Own row has no actions.
- `invite-teacher` redeployed: `create` takes optional `role: 'admin'` (no group, placeholder email `admin-<uuid>@tamab.invalid`); new `remove_admin` action deletes the auth user (profile cascades) and refuses self-removal and removing the last admin. No migration.
- Admin bootstrap by SQL is only needed for the very first admin now.
- Not yet tested end to end in the UI (add admin, open link in a private window, remove).

## Original notes for phase 3

- Needs Edge Functions `invite-teacher` and `redeem-link` (service role key goes in function secrets via `supabase secrets set`, never in the repo or frontend).
- Redeem flow per PLAN.md: token hash lookup in `access_links`, admin `generateLink` + `verifyOtp` to mint a session.
- Add the Pages URL `https://nizaninbar.github.io/tamab/` to Supabase Auth → URL Configuration (Site URL + redirect URLs) if not yet done (phase 0 item, unverified).
- Role routing: admin gets a different bottom nav (דשבורד, דוחות, פערים, מערכות, ניהול); make `Layout` choose nav by role.
- Admin login for now: email+password form is needed (or Google), since the admin has no invite link.
