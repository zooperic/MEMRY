'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import Topbar from '@/components/layout/Topbar'

interface ContribRow {
  device_id: string
  device_name: string
  user_id: string
  email: string
  name: string | null
  created_at: string
}

function timeAgo(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7)  return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export default function ContributorsPage() {
  const [rows,    setRows]    = useState<ContribRow[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting,setInviting]= useState<Record<string, string>>({}) // device_id → email
  const [saving,  setSaving]  = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    async function load() {
      const { data: devices } = await supabase
        .from('devices')
        .select('id, name')

      if (!devices?.length) { setLoading(false); return }

      const { data: contribs } = await supabase
        .from('contributors')
        .select('device_id, user_id, created_at')
        .in('device_id', devices.map(d => d.id))

      const enriched: ContribRow[] = (contribs ?? []).map(c => ({
        device_id:   c.device_id,
        device_name: devices.find(d => d.id === c.device_id)?.name ?? c.device_id,
        user_id:     c.user_id,
        email:       `user-${c.user_id.slice(0, 6)}@example.com`, // placeholder
        name:        null,
        created_at:  c.created_at,
      }))

      setRows(enriched)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  async function remove(deviceId: string, userId: string) {
    setRows(r => r.filter(x => !(x.device_id === deviceId && x.user_id === userId)))
    await supabase.from('contributors').delete()
      .eq('device_id', deviceId).eq('user_id', userId)
  }

  async function invite(deviceId: string) {
    const email = inviting[deviceId]?.trim()
    if (!email) return
    setSaving(true)
    // Production: call Edge Function to look up user by email and insert contributor row
    alert(`Invite to ${deviceId}: ${email}\n(Wire up Edge Function for email lookup + invite email)`)
    setInviting(v => ({ ...v, [deviceId]: '' }))
    setSaving(false)
  }

  // Group by device
  const byDevice: Record<string, ContribRow[]> = {}
  rows.forEach(r => {
    if (!byDevice[r.device_id]) byDevice[r.device_id] = []
    byDevice[r.device_id].push(r)
  })

  return (
    <>
      <Topbar breadcrumb="mem.ry" page="Contributors" />

      <div style={{ padding: '32px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 6 }}>004 — contributors</div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 52, fontWeight: 300, lineHeight: 0.95, letterSpacing: '-1.5px' }}>
              C<em style={{ fontStyle: 'italic' }}>o</em>ntrib<br /><em style={{ fontStyle: 'italic' }}>u</em>t<em style={{ fontStyle: 'italic' }}>o</em>rs
            </h1>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, maxWidth: 280, textAlign: 'right', lineHeight: 1.6 }}>
            Contributors can upload photos and set the active photo on any device they&apos;re invited to.
          </div>
        </div>

        {loading && (
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Loading…
          </div>
        )}

        {!loading && Object.keys(byDevice).length === 0 && rows.length === 0 && (
          // Show all devices with empty contributor lists
          <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, fontStyle: 'italic' }}>
            No contributors yet. Open a device&apos;s settings to invite someone.
          </p>
        )}

        {/* Per-device sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {Object.entries(byDevice).map(([deviceId, contribs]) => (
            <div key={deviceId}>
              {/* Device label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--rust)' }}>
                  {deviceId}
                </span>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 400 }}>
                  {contribs[0].device_name}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-lt)' }}>
                  {contribs.length} contributor{contribs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Table */}
              <div style={{ border: '1px solid var(--border)', background: 'var(--paper)', marginBottom: 12 }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 80px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {['Name / email', 'Device', 'Invited', ''].map((h, i) => (
                    <span key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>{h}</span>
                  ))}
                </div>

                {contribs.map(c => (
                  <div key={c.user_id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 80px', padding: '14px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 12, fontWeight: 600, color: 'var(--paper)', flexShrink: 0 }}>
                        {c.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{c.name ?? c.email}</div>
                        {c.name && <div style={{ fontSize: 10, color: 'var(--muted-lt)' }}>{c.email}</div>}
                      </div>
                    </div>

                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.08em', color: 'var(--muted)' }}>
                      {c.device_name}
                    </div>

                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.08em', color: 'var(--muted-lt)' }}>
                      {timeAgo(c.created_at)}
                    </div>

                    <button
                      onClick={() => remove(deviceId, c.user_id)}
                      style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-lt)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--rust)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--muted-lt)'}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Inline invite */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  type="email"
                  placeholder={`Invite to ${contribs[0].device_name}…`}
                  value={inviting[deviceId] ?? ''}
                  onChange={e => setInviting(v => ({ ...v, [deviceId]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && invite(deviceId)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn-sm-dark"
                  onClick={() => invite(deviceId)}
                  disabled={!inviting[deviceId]?.trim() || saving}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Invite →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
