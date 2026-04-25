'use client'

import Link from 'next/link'

interface Device {
  id: string
  name: string
  sleep_hours: number
  created_at: string
  status: 'online' | 'sleeping' | 'offline'
  battery_pct: number | null
}

export default function DeviceListClient({ devices }: { devices: Device[] }) {
  return (
    <div className="memry-device-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
      {devices.map(device => {
        const pillClass   = device.status === 'online' ? 'pill-online' : device.status === 'sleeping' ? 'pill-sleeping' : 'pill-offline'
        const statusLabel = device.status === 'online' ? 'Online' : device.status === 'sleeping' ? 'Sleeping' : 'Offline'
        const bPct        = device.battery_pct

        return (
          <Link key={device.id} href={`/dashboard/devices/${device.id}`} style={{ textDecoration: 'none' }}>
            <div
              style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '20px 24px', transition: 'border-color 0.15s, box-shadow 0.15s', cursor: 'pointer' }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--ink)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 var(--border)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 400, letterSpacing: '-0.3px', color: 'var(--ink)', marginBottom: 2 }}>{device.name}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-lt)' }}>{device.id}</div>
                </div>
                <span className={`status-pill ${pillClass}`}>
                  <span className="dot" />{statusLabel}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 32 }}>
                <div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)', marginBottom: 4 }}>Battery</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: bPct !== null && bPct < 20 ? 'var(--rust)' : 'var(--ink)' }}>
                    {bPct !== null ? `${bPct}%` : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)', marginBottom: 4 }}>Refresh</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: 'var(--ink)' }}>
                    {device.sleep_hours}h
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)', marginBottom: 4 }}>Paired</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: 'var(--ink)' }}>
                    {new Date(device.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  → Manage settings
                </span>
              </div>
            </div>
          </Link>
        )
      })}

      {/* Add card */}
      <Link href="/dashboard/devices/pair" style={{ textDecoration: 'none' }}>
        <div
          style={{ border: '1px dashed var(--border)', padding: '20px 24px', minHeight: 148, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--muted)'
            ;(e.currentTarget as HTMLElement).style.background = 'var(--paper)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <div style={{ width: 36, height: 36, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>Pair new device</div>
        </div>
      </Link>
    </div>
  )
}
