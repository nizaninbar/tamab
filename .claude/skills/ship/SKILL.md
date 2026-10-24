---
name: ship
description: Commit all changes and push tamab to main (triggers the GitHub Pages deploy). Use when the user asks to commit, push, ship or deploy the frontend.
---

Run from the repo root with the Bash tool:

```
node scripts/ship.mjs "<commit message>" [--watch] [--no-build]
```

- Runs `npm run build` first and stops on failure (prints the last lines). `--no-build` skips it (docs-only changes).
- Commits everything (`git add -A`) if there are changes, then pushes to `main` with the `gh` credential workaround. Refuses if not on `main`.
- `--watch` waits for the deploy workflow and prints only `Deploy OK` / `Deploy failed`.
- End the message with the commit attribution trailer from the system reminder (use a real newline inside the quotes).
- Pushing deploys to production: only run it when the user asked to push/ship.
- Database migrations and Edge Functions are not deployed by this; see the Commands section of `docs/PROGRESS.md`.
