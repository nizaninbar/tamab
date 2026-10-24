// Build check, commit everything, push to main, optionally wait for the Pages deploy.
// Usage: npm run ship -- "commit message" [--watch] [--no-build]
//        node scripts/ship.mjs "commit message" [--watch] [--no-build]
// Node (not bash) so it behaves the same from PowerShell, Git Bash and Claude Code.
import { execFileSync, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

process.chdir(fileURLToPath(new URL('..', import.meta.url)))

const args = process.argv.slice(2)
const watch = args.includes('--watch')
const build = !args.includes('--no-build')
// npm on Windows can drop the quotes, so join all non-flag words back together.
const msg = args.filter((a) => !a.startsWith('--')).join(' ').trim()

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim()
const fail = (m) => { console.error(m); process.exit(1) }

const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
if (branch !== 'main') fail(`Not on main (on ${branch})`)

if (build) {
  try {
    execSync('npm run build', { encoding: 'utf8', stdio: 'pipe' })
  } catch (e) {
    console.error(`${e.stdout ?? ''}${e.stderr ?? ''}`.split('\n').slice(-30).join('\n'))
    fail('Build failed')
  }
  console.log('Build OK')
}

if (git('status', '--porcelain')) {
  if (!msg) fail('Uncommitted changes: pass a commit message')
  git('add', '-A')
  git('commit', '-q', '-m', msg)
  console.log(`Committed: ${git('log', '--oneline', '-1')}`)
}

// Plain `git push` hangs on the Git Credential Manager on this machine.
execFileSync('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', '-q', 'origin', 'main'], {
  stdio: 'inherit',
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
})
console.log(`Pushed ${git('rev-parse', '--short', 'HEAD')} to main`)

if (watch) {
  await new Promise((r) => setTimeout(r, 5000))
  const id = execFileSync('gh', ['run', 'list', '--branch', 'main', '--limit', '1', '--json', 'databaseId', '-q', '.[0].databaseId'], { encoding: 'utf8' }).trim()
  try {
    execFileSync('gh', ['run', 'watch', id, '--exit-status'], { stdio: 'ignore' })
    console.log('Deploy OK')
  } catch {
    fail(`Deploy failed: gh run view ${id} --log-failed`)
  }
}
