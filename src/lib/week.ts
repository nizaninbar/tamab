const TZ = 'Asia/Jerusalem'

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const parse = (s: string) => new Date(`${s}T00:00:00Z`)

/** Today's calendar date (YYYY-MM-DD) in Israel. */
export function todayIsrael(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
}

/** Sunday (YYYY-MM-DD) of the week containing `date` (default: today in Israel). */
export function weekStart(date: string = todayIsrael()): string {
  const d = parse(date)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return fmt(d)
}

export function addWeeks(week: string, n: number): string {
  const d = parse(week)
  d.setUTCDate(d.getUTCDate() + 7 * n)
  return fmt(d)
}

export const currentWeek = () => weekStart()

/** Human label like "21.10 – 27.10". */
export function weekLabel(week: string): string {
  const s = parse(week)
  const e = parse(addWeeks(week, 1))
  e.setUTCDate(e.getUTCDate() - 1)
  const f = (d: Date) => `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}`
  return `${f(s)} – ${f(e)}`
}
