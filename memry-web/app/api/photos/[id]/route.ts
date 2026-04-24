// DELETE /api/photos/[id]
// Deletes a photo row + its storage objects

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase-server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: photo } = await supabase
    .from('photos')
    .select('id, device_id, storage_path, preview_path')
    .eq('id', photoId)
    .single()

  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()

  // Remove storage objects
  await admin.storage.from('photos').remove([photo.storage_path, photo.preview_path])

  // Delete row
  await admin.from('photos').delete().eq('id', photoId)

  return NextResponse.json({ ok: true })
}
