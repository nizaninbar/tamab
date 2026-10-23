import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, hashToken, json, serviceClient } from '../_shared/util.ts'

// Public (no JWT). { token } -> { access_token, refresh_token } for the link's user.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const body = await req.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''
  if (!token) return json({ error: 'invalid link' }, 400)

  const admin = serviceClient()
  const { data: link } = await admin
    .from('access_links')
    .select('user_id')
    .eq('token_hash', await hashToken(token))
    .is('revoked_at', null)
    .maybeSingle()
  if (!link) return json({ error: 'invalid link' }, 401)

  const { data: userData, error: uErr } = await admin.auth.admin.getUserById(link.user_id)
  const email = userData?.user?.email
  if (uErr || !email) return json({ error: 'invalid link' }, 401)

  const { data: gen, error: gErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (gErr || !gen.properties?.hashed_token) return json({ error: 'failed' }, 500)

  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: otp, error: vErr } = await anon.auth.verifyOtp({
    token_hash: gen.properties.hashed_token,
    type: 'magiclink',
  })
  if (vErr || !otp.session) return json({ error: 'failed' }, 500)

  return json({ access_token: otp.session.access_token, refresh_token: otp.session.refresh_token })
})
