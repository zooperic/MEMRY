import { NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase-server'

interface PhotoRow { id: string; is_active: boolean; preview_path: string; caption: string | null }
interface DeviceRow { id: string; name: string; sleep_hours: number; display_type: string; created_at: string; photos: PhotoRow[] }

function getStatus(lastRequest: string | null, sleepHours: number) {
  if (!lastRequest) return 'offline'
  const h = (Date.now() - new Date(lastRequest).getTime()) / 3600000
  if (h < 0.5)             return 'online'
  if (h < sleepHours * 1.5)return 'sleeping'
  return 'offline'
}

export async function GET() {
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: owned } = await supabase
    .from('devices')
    .select('id, name, sleep_hours, display_type, created_at, photos(id, is_active, preview_path, caption)')
    .eq('owner_id', user.id)
    .order('created_at')

  const deviceIds = (owned ?? []).map((d: DeviceRow) => d.id)
  const { data: pings } = await supabase
    .from('device_pings').select('device_id, last_request, battery_mv').in('device_id', deviceIds)

  const pingMap = Object.fromEntries((pings ?? []).map(p => [p.device_id, p]))

  const enriched = (owned as DeviceRow[] ?? []).map(device => {
    const ping      = pingMap[device.id]
    const photos    = device.photos ?? []
    const active    = photos.find(p => p.is_active) ?? null
    const status    = getStatus(ping?.last_request ?? null, device.sleep_hours)
    const battPct   = ping?.battery_mv
      ? Math.min(100, Math.max(0, Math.round((ping.battery_mv - 3000) / (4200 - 3000) * 100)))
      : null
    return { id: device.id, name: device.name, sleep_hours: device.sleep_hours, display_type: device.display_type, created_at: device.created_at, status, battery_pct: battPct, battery_mv: ping?.battery_mv ?? null, last_seen: ping?.last_request ?? null, photo_count: photos.length, active_photo: active, role: 'owner' }
  })
  return NextResponse.json({ devices: enriched })
}
