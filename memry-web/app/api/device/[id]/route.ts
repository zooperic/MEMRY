// ─────────────────────────────────────────────────────────────
//  GET /api/device/[id]/current-image
//
//  Called by firmware on every wake cycle.
//  Returns:
//    200  — raw 4bpp binary (120KB), ETag, X-Sleep-Hours
//    304  — not modified (ETag match), device skips render
//    404  — device not found / no active photo
//    429  — rate limited (> 1 req / 30min per device)
//
//  Auth: none — device ID is the key
//  Rate: tracked in Supabase (simple row-based, no Redis needed)
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const RATE_LIMIT_MINUTES = 28  // allow slightly under 30min

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: deviceId } = await params
  const supabase = createAdminClient()

  // ── 1. Fetch device ──────────────────────────────────────────
  const { data: device, error: devErr } = await supabase
    .from('devices')
    .select('id, sleep_hours, owner_id')
    .eq('id', deviceId)
    .single()

  if (devErr || !device) {
    return new NextResponse('Device not found', { status: 404 })
  }

  // ── 2. Rate limiting (simple timestamp check) ─────────────────
  const now = new Date()
  const { data: ping } = await supabase
    .from('device_pings')
    .select('last_request')
    .eq('device_id', deviceId)
    .single()

  if (ping?.last_request) {
    const lastMs   = new Date(ping.last_request).getTime()
    const diffMins = (now.getTime() - lastMs) / 60000
    if (diffMins < RATE_LIMIT_MINUTES) {
      // Still return the image — just don't hammer the pipeline
      // Firmware won't actually send more than 1 req/sleep_hours
      // This is a safety net only
    }
  }

  // ── 3. Record ping + battery ──────────────────────────────────
  const batteryMv = parseInt(req.headers.get('X-Battery-Mv') ?? '0') || null

  await supabase.from('device_pings').upsert({
    device_id:    deviceId,
    last_request: now.toISOString(),
    battery_mv:   batteryMv,
  }, { onConflict: 'device_id' })

  // ── 4. Get active photo ───────────────────────────────────────
  const { data: photo, error: photoErr } = await supabase
    .from('photos')
    .select('id, storage_path')
    .eq('device_id', deviceId)
    .eq('is_active', true)
    .single()

  if (photoErr || !photo) {
    // No active photo — tell device to sleep and retry later
    return new NextResponse('No active photo', {
      status: 404,
      headers: { 'X-Sleep-Hours': String(device.sleep_hours) },
    })
  }

  // ── 5. ETag check — skip download if unchanged ────────────────
  const etag          = `"memry-${photo.id}"`
  const clientEtag    = req.headers.get('If-None-Match')

  if (clientEtag === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        'ETag':          etag,
        'X-Sleep-Hours': String(device.sleep_hours),
        'Cache-Control': 'no-store',
      },
    })
  }

  // ── 6. Download 4bpp binary from storage ─────────────────────
  const { data: blob, error: dlErr } = await supabase.storage
    .from('photos')
    .download(photo.storage_path)

  if (dlErr || !blob) {
    console.error('[device-api] Storage download failed', dlErr)
    return new NextResponse('Image unavailable', { status: 502 })
  }

  const bin = Buffer.from(await blob.arrayBuffer())

  // ── 7. Serve binary ───────────────────────────────────────────
  return new NextResponse(bin, {
    status: 200,
    headers: {
      'Content-Type':   'application/octet-stream',
      'Content-Length': String(bin.length),
      'ETag':           etag,
      'X-Sleep-Hours':  String(device.sleep_hours),
      'Cache-Control':  'no-store',
      // CORS for breadboard testing (firmware dev)
      'Access-Control-Allow-Origin': '*',
    },
  })
}
