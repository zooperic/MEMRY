// supabase/functions/invite/index.ts
// ─────────────────────────────────────────────────────────────
//  Edge Function: invite contributor by email
//
//  POST /functions/v1/invite
//  Body: { device_id: string, email: string }
//  Auth: Bearer token (user must own the device)
//
//  Deploy:
//    supabase functions deploy invite
//
//  This runs server-side with the service_role key, so it can
//  look up auth.users by email — something client-side RLS
//  cannot do.
// ─────────────────────────────────────────────────────────────

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  // ── Auth: verify caller owns the device ───────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Unauthorised' }, 401)
  }

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user: caller } } = await callerClient.auth.getUser()
  if (!caller) return json({ error: 'Unauthorised' }, 401)

  // ── Parse body ────────────────────────────────────────────
  const { device_id, email } = await req.json()
  if (!device_id || !email) {
    return json({ error: 'device_id and email required' }, 400)
  }

  // ── Verify caller owns device ─────────────────────────────
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: device } = await admin
    .from('devices')
    .select('id, name')
    .eq('id', device_id)
    .eq('owner_id', caller.id)
    .single()

  if (!device) return json({ error: 'Device not found or no access' }, 403)

  // ── Look up invitee by email ──────────────────────────────
  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) return json({ error: 'Failed to look up users' }, 500)

  const invitee = users.find(u => u.email === email.toLowerCase().trim())

  if (!invitee) {
    // User doesn't exist — send a Supabase invite email
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { invited_to_device: device_id },
      redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://your-app.vercel.app'}/auth/callback`,
    })
    if (inviteErr) return json({ error: inviteErr.message }, 500)

    // Add to contributors table — they'll be active once they accept
    await admin.from('contributors').upsert({
      device_id,
      user_id:    invited.user.id,
      invited_by: caller.id,
    }, { onConflict: 'device_id,user_id' })

    return json({ ok: true, status: 'invited', message: `Invite sent to ${email}` })
  }

  // ── User exists — add directly ────────────────────────────
  const { error: upsertErr } = await admin.from('contributors').upsert({
    device_id,
    user_id:    invitee.id,
    invited_by: caller.id,
  }, { onConflict: 'device_id,user_id' })

  if (upsertErr) return json({ error: upsertErr.message }, 500)

  return json({ ok: true, status: 'added', message: `${email} added as contributor` })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
