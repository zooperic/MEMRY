// ─────────────────────────────────────────────────────────────
//  POST /api/photos/upload
//  Accepts multipart/form-data: { file, device_id, caption }
//  1. Runs image through processImage() pipeline
//  2. Uploads .bin + .jpg to Supabase Storage
//  3. Inserts row into photos table
//  4. If set_active=true, marks this photo active + deactivates others
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase-server'
import { createAdminClient }          from '@/lib/supabase-server'
import { processImage, binPath, previewPath } from '@/lib/imageProcess'

export async function POST(req: NextRequest) {
  const supabase = await createServerClientInstance()

  // ── Auth check ────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── Parse form ────────────────────────────────────────────────
  const form = await req.formData()
  const file      = form.get('file')      as File   | null
  const deviceId  = form.get('device_id') as string | null
  const caption   = form.get('caption')   as string | null
  const setActive = form.get('set_active') === 'true'

  if (!file || !deviceId) {
    return NextResponse.json({ error: 'file and device_id required' }, { status: 400 })
  }

  // ── Check user has access to this device ─────────────────────
  const { data: access } = await supabase
    .from('devices')
    .select('id')
    .eq('id', deviceId)
    .single()

  if (!access) {
    // Check contributor table
    const { data: contrib } = await supabase
      .from('contributors')
      .select('device_id')
      .eq('device_id', deviceId)
      .eq('user_id', user.id)
      .single()

    if (!contrib) {
      return NextResponse.json({ error: 'No access to device' }, { status: 403 })
    }
  }

  // ── Process image ─────────────────────────────────────────────
  const bytes = Buffer.from(await file.arrayBuffer())
  let processed
  try {
    processed = await processImage(bytes)
  } catch (err) {
    console.error('[upload] processImage failed', err)
    return NextResponse.json({ error: 'Image processing failed' }, { status: 422 })
  }

  // ── Generate photo ID ─────────────────────────────────────────
  const photoId = crypto.randomUUID()
  const admin   = createAdminClient()

  // ── Upload .bin ───────────────────────────────────────────────
  const { error: binErr } = await admin.storage
    .from('photos')
    .upload(binPath(deviceId, photoId), processed.bin, {
      contentType: 'application/octet-stream',
      upsert: false,
    })

  if (binErr) {
    console.error('[upload] bin upload failed', binErr)
    return NextResponse.json({ error: 'Storage error' }, { status: 500 })
  }

  // ── Upload .jpg preview ───────────────────────────────────────
  const { error: jpgErr } = await admin.storage
    .from('photos')
    .upload(previewPath(deviceId, photoId), processed.preview, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (jpgErr) {
    console.error('[upload] preview upload failed', jpgErr)
  }

  // ── If setActive: deactivate all others first ─────────────────
  if (setActive) {
    await admin
      .from('photos')
      .update({ is_active: false })
      .eq('device_id', deviceId)
  }

  // ── Insert photo row ──────────────────────────────────────────
  const { data: photo, error: insertErr } = await admin
    .from('photos')
    .insert({
      id:             photoId,
      device_id:      deviceId,
      uploaded_by:    user.id,
      storage_path:   binPath(deviceId, photoId),
      preview_path:   previewPath(deviceId, photoId),
      caption:        caption || null,
      is_active:      setActive,
    })
    .select()
    .single()

  if (insertErr) {
    console.error('[upload] insert failed', insertErr)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ photo }, { status: 201 })
}
