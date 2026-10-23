import { corsHeaders, hashToken, json, newToken, requireAdmin, serviceClient } from '../_shared/util.ts'

// Admin only. Actions:
//   create     { full_name, group_id }  -> creates the teacher + first link
//   regenerate { user_id }              -> revokes old links, issues a new one
//   revoke     { user_id }              -> revokes all links
// Returns { user_id, token } (token is shown once; only its hash is stored).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = serviceClient()
  if (!(await requireAdmin(req, admin))) return json({ error: 'forbidden' }, 403)

  const body = await req.json().catch(() => null)
  if (!body) return json({ error: 'bad request' }, 400)

  let userId: string = body.user_id

  if (body.action === 'create') {
    const fullName = String(body.full_name ?? '').trim()
    if (!fullName) return json({ error: 'full_name required' }, 400)
    const { data, error } = await admin.auth.admin.createUser({
      email: `teacher-${crypto.randomUUID()}@tamab.invalid`,
      email_confirm: true,
    })
    if (error || !data.user) return json({ error: error?.message ?? 'create failed' }, 500)
    userId = data.user.id
    const { error: pErr } = await admin
      .from('profiles')
      .insert({ id: userId, full_name: fullName, role: 'teacher', group_id: body.group_id ?? null })
    if (pErr) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: pErr.message }, 500)
    }
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
