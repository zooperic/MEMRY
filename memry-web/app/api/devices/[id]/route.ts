// PATCH /api/devices/[id]
// Update device name, sleep_hours

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase-server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: deviceId } = await params
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const allowed = ['name', 'sleep_hours']
  const update: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) update[k] = body[k]
  }
  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('devices')
    .update(update)
    .eq('id', deviceId)
    .eq('owner_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ device: data })
}

// DELETE /api/devices/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: deviceId } = await params
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', deviceId)
    .eq('owner_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
