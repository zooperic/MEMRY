'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'

interface Device {
  id: string
  name: string
  sleep_hours: number
  display_type: string
  created_at: string
}
interface Settings {
  rotation_mode: string
  rotation_hours: number
  show_caption: boolean
}
interface Contributor {
  user_id: string
  email?: string
  name?: string
}
interface Ping {
  last_request: string | null
  battery_mv: number | null
}

function batteryPct(mv: number | null) {
  if (!mv) return '--'
  return Math.min(100, Math.max(0, Math.round((mv - 3000) / (4200 - 3000) * 100))) + '%'
}
function timeAgo(ts: string | null) {
  if (!ts) return 'Never'
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export default function DeviceSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: deviceId } = use(params)
  const router   = useRouter()
  const supabase = createBrowserClient()

  const [device,       setDevice]       = useState<Device | null>(null)
  const [settings,     setSettings]     = useState<Settings>({ rotation_mode: 'manual', rotation_hours: 24, show_caption: true })
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [ping,         setPing]         = useState<Ping | null>(null)
  const [inviteEmail,  setInviteEmail]  = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [editName,     setEditName]     = useState('')

  useEffect(() => {
    async function load() {
      const [
        { data: dev },
        { data: sett },
        { data: contribs },
        { data: pingData },
      ] = await Promise.all([
        supabase.from('devices').select('*').eq('id', deviceId).single(),
        supabase.from('device_settings').select('*').eq('device_id', deviceId).single(),
        supabase.from('contributors').select('user_id').eq('device_id', deviceId),
        supabase.from('device_pings').select('last_request, battery_mv').eq('device_id', deviceId).single(),
      ])

      if (dev)   { setDevice(dev); setEditName(dev.name) }
      if (sett)  setSettings(sett)
      if (pingData) setPing(pingData)
      if (contribs) setContributors(contribs)
    }
    load()
  }, [deviceId]) // eslint-disable-line

  async function saveGeneral() {
    if (!device) return
    setSaving(true); setError(null)

    const [a, b] = await Promise.all([
      supabase.from('devices').update({ name: editName, sleep_hours: device.sleep_hours }).eq('id', deviceId),
      supabase.from('device_settings').update({ rotation_mode: settings.rotation_mode, rotation_hours: settings.rotation_hours, show_caption: settings.show_caption }).eq('device_id', deviceId),
    ])

    if (a.error || b.error) {
      setError(a.error?.message ?? b.error?.message ?? 'Save failed')
    } else {
      setDevice(d => d ? { ...d, name: editName } : d)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function invite() {
    if (!inviteEmail.trim()) return
    setSaving(true)
    // In production: call an Edge Function that looks up user by email + sends invite
    alert(`Invite sent to ${inviteEmail} (implement Edge Function for email lookup)`)
    setInviteEmail('')
    setSaving(false)
  }

  async function removeContributor(userId: string) {
    setContributors(c => c.filter(x => x.user_id !== userId))
    await supabase.from('contributors').delete().eq('device_id', deviceId).eq('user_id', userId)
  }

  async function unpairDevice() {
    if (!confirm(`Unpair ${deviceId}? This cannot be undone.`)) return
    await supabase.from('devices').delete().eq('id', deviceId)
    router.push('/dashboard')
  }

  if (!device) {
    return (
      <>
        <Topbar breadcrumb="mem.ry / Devices" page="Loading…" />
        <div style={{ padding: 40, fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading device…</div>
      </>
    )
  }

  return (
    <>
      <Topbar
        breadcrumb="mem.ry / Devices"
        page={device.name}
        actions={
          <Link href="/dashboard" className="btn-sm-ghost">← Dashboard</Link>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 'calc(100vh - 52px)' }}>

        {/* LEFT — device identity panel */}
        <div style={{ borderRight: '1px solid var(--border)', background: 'var(--paper)', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Mini polaroid */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'var(--paper)', padding: '10px 10px 40px', width: 120, boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.1)', position: 'relative', transform: 'rotate(-2deg)' }}>
              <div style={{ width: 100, height: 100, background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(184,74,42,0.07) 1px, transparent 1px)', backgroundSize: '8px 8px' }} />
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 10, color: 'var(--sand)' }}>Mem.ry</span>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 300, letterSpacing: '-0.5px', marginBottom: 4 }}>{device.name}</div>
            {[
              { k: 'Device ID',   v: deviceId },
              { k: 'Battery',     v: batteryPct(ping?.battery_mv ?? null) },
              { k: 'Last refresh',v: timeAgo(ping?.last_request ?? null) },
              { k: 'Paired',      v: new Date(device.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) },
              { k: 'Display',     v: 'Spectra 6 (6-color)' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{row.k}</span>
                <span style={{ fontFamily: row.k === 'Device ID' ? 'DM Mono, monospace' : 'Space Grotesk, sans-serif', fontSize: row.k === 'Device ID' ? 10 : 11, fontWeight: 500, color: 'var(--ink)' }}>{row.v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href={`/dashboard/library?device=${deviceId}`} className="btn-sm-ghost" style={{ textAlign: 'center', display: 'block' }}>View library</Link>
            <Link href={`/dashboard/upload?device=${deviceId}`} className="btn-sm-dark" style={{ textAlign: 'center', display: 'block' }}>↑ Upload photo</Link>
          </div>
        </div>

        {/* RIGHT — settings */}
        <div style={{ padding: '32px 40px', overflowY: 'auto' }}>

          {/* ── GENERAL ── */}
          <Section title="General" num="001">
            <SettingRow label="Device name" desc="Shown on dashboard and activity log">
              <input
                className="form-input"
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                style={{ width: 200, padding: '8px 12px', fontSize: 13 }}
              />
            </SettingRow>
            <SettingRow label="Refresh interval" desc="How often the device wakes to check for a new photo">
              <select
                value={device.sleep_hours}
                onChange={e => setDevice(d => d ? { ...d, sleep_hours: Number(e.target.value) } : d)}
                style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', background: 'var(--paper)', border: '1px solid var(--border)', color: 'var(--ink)', outline: 'none', cursor: 'pointer' }}
              >
                {[1, 4, 8, 24].map(h => <option key={h} value={h}>Every {h}h</option>)}
              </select>
            </SettingRow>
            <SettingRow label="Auto-rotate photos" desc="Cycle through the library instead of showing one photo">
              <Toggle checked={settings.rotation_mode === 'auto'} onChange={v => setSettings(s => ({ ...s, rotation_mode: v ? 'auto' : 'manual' }))} />
            </SettingRow>
            {settings.rotation_mode === 'auto' && (
              <SettingRow label="Rotate every" desc="How often to switch to the next photo">
                <select
                  value={settings.rotation_hours}
                  onChange={e => setSettings(s => ({ ...s, rotation_hours: Number(e.target.value) }))}
                  style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', background: 'var(--paper)', border: '1px solid var(--border)', color: 'var(--ink)', outline: 'none', cursor: 'pointer' }}
                >
                  {[1, 6, 12, 24, 48, 168].map(h => <option key={h} value={h}>Every {h}h</option>)}
                </select>
              </SettingRow>
            )}
            <SettingRow label="Show captions" desc="Render caption text in the Polaroid strip on the display">
              <Toggle checked={settings.show_caption} onChange={v => setSettings(s => ({ ...s, show_caption: v }))} />
            </SettingRow>

            {error && <div style={{ padding: '12px 14px', background: '#FAF0EE', borderLeft: '3px solid var(--rust)', fontSize: 12, color: '#7A2E1E', marginTop: 8 }}>{error}</div>}

            <div style={{ paddingTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn-sm-dark" onClick={saveGeneral} disabled={saving}>
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
              </button>
              {saved && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--green)' }}>Changes saved</span>}
            </div>
          </Section>

          {/* ── CONTRIBUTORS ── */}
          <Section title="Contributors" num="002">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {/* Owner (you) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--paper)', border: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--rust)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 12, fontWeight: 600, color: 'var(--paper)', flexShrink: 0 }}>A</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>You</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-lt)', marginTop: 1 }}>Owner</div>
                </div>
              </div>

              {contributors.map((c) => (
                <div key={c.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--paper)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 12, fontWeight: 600, color: 'var(--paper)', flexShrink: 0 }}>
                    {c.name?.[0]?.toUpperCase() ?? c.email?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{c.name ?? c.email ?? c.user_id.slice(0, 8)}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-lt)', marginTop: 1 }}>Contributor</div>
                  </div>
                  <button onClick={() => removeContributor(c.user_id)} style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-lt)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--rust)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--muted-lt)'}
                  >Remove</button>
                </div>
              ))}

              {contributors.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border)', fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-lt)' }}>
                  No contributors yet
                </div>
              )}
            </div>

            {/* Invite */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                type="email"
                placeholder="Invite by email address…"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && invite()}
                style={{ flex: 1 }}
              />
              <button className="btn-sm-dark" onClick={invite} disabled={!inviteEmail.trim() || saving}
                style={{ whiteSpace: 'nowrap' }}>
                Invite →
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--muted-lt)', fontWeight: 300, marginTop: 8 }}>
              Contributors can upload and set active photos. They cannot unpair the device or change settings.
            </p>
          </Section>

          {/* ── DANGER ZONE ── */}
          <Section title="Danger zone" num="003">
            <div style={{ border: '1px solid rgba(184,74,42,0.2)', padding: 20 }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8 }}>Unpair device</div>
              <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginBottom: 16, lineHeight: 1.6 }}>
                Removes this device from your account. The hardware will stop receiving new photos. All uploaded photos for this device will also be deleted. This cannot be undone.
              </p>
              <button
                style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 16px', background: 'transparent', color: 'var(--rust)', border: '1px solid rgba(184,74,42,0.3)', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(184,74,42,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--rust)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,74,42,0.3)'; }}
                onClick={unpairDevice}
              >
                Unpair {deviceId}
              </button>
            </div>
          </Section>
        </div>
      </div>
    </>
  )
}

function Section({ title, num, children }: { title: string; num: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--rust)' }}>{num}</span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      {children}
    </div>
  )
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted-lt)', fontWeight: 300, marginTop: 2 }}>{desc}</div>
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{ position: 'relative', width: 36, height: 20, flexShrink: 0, cursor: 'pointer' }}
    >
      <div style={{ position: 'absolute', inset: 0, background: checked ? 'var(--rust)' : 'var(--border)', borderRadius: 20, transition: 'background 0.2s' }}>
        <div style={{ position: 'absolute', height: 14, width: 14, left: checked ? 19 : 3, bottom: 3, background: 'var(--paper)', borderRadius: '50%', transition: 'left 0.2s' }} />
      </div>
    </div>
  )
}
