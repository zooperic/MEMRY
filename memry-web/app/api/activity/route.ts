// GET /api/activity
// Returns recent activity across all user's devices:
// - photo uploads
// - device pings / fetches
// Joined and sorted by time descending.

import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Get owned device IDs
  const { data: devices } = await supabase
    .from('devices')
    .select('id, name')
    .eq('owner_id', user.id)

  if (!devices?.length) return NextResponse.json({ events: [] })

  const deviceIds   = devices.map(d => d.id)
  const deviceNames = Object.fromEntries(devices.map(d => [d.id, d.name]))

  // Recent photos (uploads)
  const { data: photos } = await supabase
    .from('photos')
    .select('id, device_id, caption, created_at, uploaded_by')
    .in('device_id', deviceIds)
    .order('created_at', { ascending: false })
    .limit(20)

  // Recent pings
  const { data: pings } = await supabase
    .from('device_pings')
    .select('device_id, last_request, battery_mv')
    .in('device_id', deviceIds)

  // Build unified event list
  const events: {
    id: string
    type: 'upload' | 'fetch' | 'online'
    device_id: string
    device_name: string
    description: string
    timestamp: string
    battery_mv?: number | null
  }[] = []

  for (const photo of photos ?? []) {
    events.push({
      id:          `upload-${photo.id}`,
      type:        'upload',
      device_id:   photo.device_id,
      device_name: deviceNames[photo.device_id] ?? photo.device_id,
      description: photo.caption
        ? `Photo uploaded — "${photo.caption}"`
        : 'Photo uploaded',
      timestamp:   photo.created_at,
    })
  }

  for (const ping of pings ?? []) {
    if (!ping.last_request) continue
    events.push({
      id:          `ping-${ping.device_id}`,
      type:        'fetch',
      device_id:   ping.device_id,
      device_name: deviceNames[ping.device_id] ?? ping.device_id,
      description: `Device fetched image — battery ${
        ping.battery_mv
          ? Math.round((ping.battery_mv - 3000) / (4200 - 3000) * 100) + '%'
          : 'unknown'
      }`,
      timestamp:   ping.last_request,
      battery_mv:  ping.battery_mv,
    })
  }

  // Sort by timestamp desc
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json({ events: events.slice(0, 25) })
}
