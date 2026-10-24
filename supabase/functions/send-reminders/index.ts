import webpush from 'npm:web-push@3.6.7'
import { corsHeaders, json, requireAdmin, serviceClient } from '../_shared/util.ts'

// Two callers:
//   pg_cron (hourly)  header x-cron-secret -> sends reminders if the Israel day/hour match `settings`
//   admin             { action: 'test', user_id? } -> sends a test push (to user_id, or the admin)
const TZ = 'Asia/Jerusalem'

function israelNow(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, weekday: 'short', hour: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now).map((x) => [x.type, x.value]),
  )
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
  const d = new Date(`${p.year}-${p.month}-${p.day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - day)
  return { day, hour: Number(p.hour), weekStart: d.toISOString().slice(0, 10) }
}

type Payload = { title: string; body: string; url: string }

async function push(admin: ReturnType<typeof serviceClient>, userIds: string[], payload: Payload) {
  if (!userIds.length) return 0
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', userIds)
  let sent = 0
  const dead: string[] = []
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { urgency: 'high', TTL: 86400 })
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) dead.push(s.id)
      else console.error('push failed', code, (e as Error).message)
    }
  }))
  if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead)
  return sent
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
  const admin = serviceClient()
  const body = await req.json().catch(() => ({}))

  const adminId = await requireAdmin(req, admin)
  if (adminId && body.action === 'test') {
    const sent = await push(admin, [body.user_id ?? adminId], { title: 'תמב 🌸', body: 'התראת ניסיון — הכל עובד!', url: '/tamab/' })
    return json({ sent })
  }

  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'forbidden' }, 403)

  const { data: settings } = await admin.from('settings').select('reminder_day, reminder_time').eq('id', 1).single()
  if (!settings) return json({ error: 'no settings' }, 500)
  const now = israelNow()
  if (now.day !== settings.reminder_day || now.hour !== Number(settings.reminder_time.slice(0, 2))) {
    return json({ skipped: true })
  }

  const [{ data: teachers }, { data: done }] = await Promise.all([
    admin.from('profiles').select('id').eq('role', 'teacher'),
    admin.from('weekly_reports').select('teacher_id').eq('week_start', now.weekStart).not('submitted_at', 'is', null),
  ])
  const submitted = new Set((done ?? []).map((r) => r.teacher_id))
  const pending = (teachers ?? []).map((t) => t.id).filter((id) => !submitted.has(id))
  const sent = await push(admin, pending, { title: 'תמב 🌸', body: 'עוד לא מילאת את הדוח השבועי 💌', url: '/tamab/#/report' })
  return json({ teachers: pending.length, sent })
})
