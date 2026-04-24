// ─────────────────────────────────────────────────────────────
//  GET /api/preview/previews/{device_id}/{photo_id}.jpg
//  GET /api/preview/processed/{device_id}/{photo_id}.bin
//
//  Proxies private Supabase Storage objects to authenticated
//  browser sessions. Generates a short-lived signed URL and
//  redirects. The browser caches the 302 redirect itself.
//
//  Auth: user must be logged in AND own/contribute to the device.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const storagePath = path.join('/')

  // ── Auth check ────────────────────────────────────────────────
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorised', { status: 401 })
  }

  // ── Verify access — extract device_id from path ───────────────
  // Path format: previews/{device_id}/{photo_id}.jpg
  //           or processed/{device_id}/{photo_id}.bin
  const segments = storagePath.split('/')
  const deviceId = segments[1]

  if (!deviceId) {
    return new NextResponse('Bad path', { status: 400 })
  }

  // Check owner or contributor
  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('id', deviceId)
    .single()

  if (!device) {
    const { data: contrib } = await supabase
      .from('contributors')
      .select('device_id')
      .eq('device_id', deviceId)
      .eq('user_id', user.id)
      .single()

    if (!contrib) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  // ── Generate signed URL (60 min TTL) ─────────────────────────
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('photos')
    .createSignedUrl(storagePath, 3600)

  if (error || !data?.signedUrl) {
    console.error('[preview] signed URL failed', error)
    return new NextResponse('Not found', { status: 404 })
  }

  // 302 redirect — browser caches for the signed URL TTL
  return NextResponse.redirect(data.signedUrl, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
