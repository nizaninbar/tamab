# Progress & handoff

One session per phase. Read CLAUDE.md, PLAN.md, then this file. Update it at the end of every phase (status table + notes), then commit.

## Status

| Phase | What | Status |
|---|---|---|
| 0 | Repo, `.gitignore`, Pages, deploy workflow | ✅ done |
| 1 | Vite/React/TS/Tailwind/PWA scaffold, RTL, theme, bottom nav | ✅ done, reviewed |
| 2 | Supabase schema + RLS + seed | ✅ done, applied to hosted project |
| 3 | Auth: invite link flow, Google linking, role routing | ✅ done, reviewed (see Phase 3 notes) |
| 4–8 | See "Build order" in PLAN.md | todo |

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

## Phase 3 notes (code done)

- Edge Functions deployed (`npx supabase functions deploy --use-api --project-ref vhaonognazlgibohxioe`): `invite-teacher` (admin only; actions create/regenerate/revoke; returns one-time `token`) and `redeem-link` (public; token → session). Both `verify_jwt = false` in config.toml; invite-teacher checks the admin role itself. The service role key is auto-injected in hosted functions, so no secret was needed.
- Teacher auth users get a placeholder email `teacher-<uuid>@tamab.invalid`. Link format: `https://nizaninbar.github.io/tamab/#/join?t=<token>`.
- Frontend: `src/lib/supabase.ts`, `features/auth/{AuthProvider,LoginPage,JoinPage,ProfilePage}.tsx`; `Layout` is the auth guard and picks nav by role. Admin pages are placeholders (phase 6); admin `/manage` temporarily shows ProfilePage (for sign out).
- Verified: build passes; functions reject unauthenticated/bogus calls (403/401). **Not yet tested end to end**: needs admin login in the UI, then a teacher created via `invite-teacher` (no UI until phase 6).
- Google provider, manual linking and Auth URL config were set up by the user (existing Google OAuth client reused; redirect URI is the Supabase callback). Admin login checked in the UI. Teacher link flow still untested end to end: test it in phase 6 once the admin UI can create teachers.

## Original notes for phase 3

- Needs Edge Functions `invite-teacher` and `redeem-link` (service role key goes in function secrets via `supabase secrets set`, never in the repo or frontend).
- Redeem flow per PLAN.md: token hash lookup in `access_links`, admin `generateLink` + `verifyOtp` to mint a session.
- Add the Pages URL `https://nizaninbar.github.io/tamab/` to Supabase Auth → URL Configuration (Site URL + redirect URLs) if not yet done (phase 0 item, unverified).
- Role routing: admin gets a different bottom nav (דשבורד, דוחות, פערים, מערכות, ניהול); make `Layout` choose nav by role.
- Admin login for now: email+password form is needed (or Google), since the admin has no invite link.
