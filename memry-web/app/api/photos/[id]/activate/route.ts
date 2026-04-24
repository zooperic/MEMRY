// PATCH /api/photos/[id]/activate
// Sets a photo as active for its device (deactivates all others)

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Get the photo + verify access
  const { data: photo } = await supabase
    .from('photos')
    .select('id, device_id')
    .eq('id', photoId)
    .single()

  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()

  // Deactivate all photos for this device, then activate this one
  await admin.from('photos').update({ is_active: false }).eq('device_id', photo.device_id)
  await admin.from('photos').update({ is_active: true  }).eq('id', photoId)

  return NextResponse.json({ ok: true })
}
