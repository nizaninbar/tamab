import { corsHeaders, hashToken, json, newToken, requireAdmin, serviceClient } from '../_shared/util.ts'

// Admin only. Actions:
//   create     { full_name, group_id, role? } -> creates the teacher (or admin) + first link
//   remove     { user_id }              -> deletes a teacher, or another admin (not self, not the last one)
//   regenerate { user_id }              -> revokes old links, issues a new one
//   revoke     { user_id }              -> revokes all links
// Returns { user_id, token } (token is shown once; only its hash is stored).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = serviceClient()
  const callerId = await requireAdmin(req, admin)
  if (!callerId) return json({ error: 'forbidden' }, 403)

  const body = await req.json().catch(() => null)
  if (!body) return json({ error: 'bad request' }, 400)

  let userId: string = body.user_id

  if (body.action === 'create') {
    const fullName = String(body.full_name ?? '').trim()
    if (!fullName) return json({ error: 'full_name required' }, 400)
    const role = body.role === 'admin' ? 'admin' : 'teacher'
    const { data, error } = await admin.auth.admin.createUser({
      email: `${role}-${crypto.randomUUID()}@tamab.invalid`,
      email_confirm: true,
    })
    if (error || !data.user) return json({ error: error?.message ?? 'create failed' }, 500)
    userId = data.user.id
    const { error: pErr } = await admin
      .from('profiles')
      .insert({ id: userId, full_name: fullName, role, group_id: role === 'admin' ? null : (body.group_id ?? null) })
    if (pErr) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: pErr.message }, 500)
    }
  } else if (body.action === 'remove') {
    if (!userId) return json({ error: 'user_id required' }, 400)
    if (userId === callerId) return json({ error: 'אי אפשר להסיר את עצמך' }, 400)
    const { data: target } = await admin.from('profiles').select('role').eq('id', userId).single()
    if (!target) return json({ error: 'not found' }, 404)
    if (target.role === 'admin') {
      const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
      if ((count ?? 0) <= 1) return json({ error: 'אי אפשר להסיר את המנהלת האחרונה' }, 400)
    }
    // Profile cascade removes reports, gaps, schedules, push subscriptions and links.
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return json({ error: error.message }, 500)
    return json({ user_id: userId })
  } else if (body.action === 'regenerate' || body.action === 'revoke') {
    if (!userId) return json({ error: 'user_id required' }, 400)
    const { error } = await admin
      .from('access_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null)
    if (error) return json({ error: error.message }, 500)
    if (body.action === 'revoke') return json({ user_id: userId })
  } else {
    return json({ error: 'unknown action' }, 400)
  }

  const token = newToken()
  const { error } = await admin.from('access_links').insert({ user_id: userId, token_hash: await hashToken(token) })
  if (error) return json({ error: error.message }, 500)
  return json({ user_id: userId, token })
})
