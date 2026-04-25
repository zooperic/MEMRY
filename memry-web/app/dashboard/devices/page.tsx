import { createServerClientInstance } from '@/lib/supabase-server'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import DeviceListClient from './DeviceListClient'

export const dynamic = 'force-dynamic'

function getStatus(lastRequest: string | null, sleepHours: number) {
  if (!lastRequest) return 'offline'
  const h = (Date.now() - new Date(lastRequest).getTime()) / 3600000
  if (h < 0.5)             return 'online'
  if (h < sleepHours * 1.5)return 'sleeping'
  return 'offline'
}

export default async function DevicesPage() {
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: devices } = await supabase
    .from('devices')
    .select('id, name, sleep_hours, created_at')
    .eq('owner_id', user.id)
    .order('created_at')

  const { data: pings } = await supabase
    .from('device_pings')
    .select('device_id, last_request, battery_mv')
    .in('device_id', (devices ?? []).map((d: { id: string }) => d.id))

  const pingMap = Object.fromEntries(
    (pings ?? []).map((p: { device_id: string; last_request: string | null; battery_mv: number | null }) => [p.device_id, p])
  )

  const enriched = (devices ?? []).map((d: { id: string; name: string; sleep_hours: number; created_at: string }) => {
    const ping   = pingMap[d.id]
    const status = getStatus(ping?.last_request ?? null, d.sleep_hours)
    const bPct   = ping?.battery_mv
      ? Math.min(100, Math.max(0, Math.round((ping.battery_mv - 3000) / (4200 - 3000) * 100)))
      : null
    return { id: d.id, name: d.name, sleep_hours: d.sleep_hours, created_at: d.created_at, status, battery_pct: bPct }
  })

  return (
    <>
      <Topbar
        breadcrumb="mem.ry"
        page="Devices"
        actions={<Link href="/dashboard/devices/pair" className="btn-sm-dark">+ Pair device</Link>}
      />
      <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 6 }}>002 — devices</div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, fontWeight: 300, lineHeight: 0.95, letterSpacing: '-1.5px' }}>
            My <em style={{ fontStyle: 'italic' }}>Devices</em>
          </h1>
        </div>
        {/* All interactivity in client component */}
        <DeviceListClient devices={enriched} />
      </div>
    </>
  )
}
