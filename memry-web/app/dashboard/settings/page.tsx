'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import Topbar from '@/components/layout/Topbar'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const supabase = createBrowserClient()
  const router   = useRouter()

  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [newPassword,  setNewPassword]  = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setName(user.user_metadata?.full_name ?? '')
      setEmail(user.email ?? '')
    })
  }, []) // eslint-disable-line

  async function saveProfile() {
    setSaving(true); setError(null)
    interface UserUpdate { data: { full_name: string }; password?: string }
    const updates: UserUpdate = { data: { full_name: name } }
    if (newPassword.length >= 8) { updates.password = newPassword }
    const { error } = await supabase.auth.updateUser(updates)
    if (error) setError(error.message)
    else { setSaved(true); setNewPassword(''); setTimeout(() => setSaved(false), 2500) }
    setSaving(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <>
      <Topbar breadcrumb="mem.ry" page="Settings" />
      <div style={{ padding: '40px', maxWidth: 640 }}>

        {/* Page header */}
        <div style={{ marginBottom: 40, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8 }}>
            004 — settings
          </div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, fontWeight: 300, lineHeight: 0.95, letterSpacing: '-1.5px' }}>
            Acc<em style={{ fontStyle: 'italic' }}>o</em>unt
          </h1>
        </div>

        {/* Profile */}
        <Section num="001" title="Profile">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
            <div>
              <label className="form-label">Display name</label>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="form-label">Email address</label>
              <input
                className="form-input"
                type="email"
                value={email}
                disabled
                style={{ opacity: 0.55, cursor: 'not-allowed' }}
              />
              <p style={{ fontSize: 11, color: 'var(--muted-lt)', marginTop: 6, fontWeight: 300 }}>
                Email cannot be changed after account creation.
              </p>
            </div>
            <div>
              <label className="form-label">New password <span style={{ color: 'var(--muted-lt)', fontFamily: 'Space Grotesk', letterSpacing: 0, textTransform: 'none', fontSize: 10 }}>— leave blank to keep current</span></label>
              <input
                className="form-input"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
              />
            </div>
          </div>

          {error  && <div style={{ padding: '12px 14px', background: '#FAF0EE', borderLeft: '3px solid var(--rust)', fontSize: 12, color: '#7A2E1E', marginBottom: 16 }}>{error}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-sm-dark" onClick={saveProfile} disabled={saving}>
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
            </button>
            {saved && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--green)' }}>Changes saved</span>}
          </div>
        </Section>

        {/* Notifications — placeholder for future */}
        <Section num="002" title="Notifications">
          <SettingRow
            label="Upload alerts"
            desc="Get notified when a contributor uploads a photo to your device"
          >
            <Toggle checked={false} onChange={() => {}} />
          </SettingRow>
          <SettingRow
            label="Offline alerts"
            desc="Alert when a device has been offline for more than 24 hours"
          >
            <Toggle checked={false} onChange={() => {}} />
          </SettingRow>
          <p style={{ fontSize: 11, color: 'var(--muted-lt)', fontWeight: 300, marginTop: 12 }}>
            Notification emails coming in a future release.
          </p>
        </Section>

        {/* Appearance */}
        <Section num="003" title="Firmware">
          <div style={{ border: '1px solid var(--border)', background: 'var(--paper)' }}>
            {[
              { k: 'Firmware endpoint',  v: 'GET /api/device/{id}/current-image' },
              { k: 'Image format',       v: '4bpp packed, 600×400px' },
              { k: 'Protocol',           v: 'HTTP · ETag · X-Sleep-Hours' },
              { k: 'Auth',               v: 'Device ID in path (no API key)' },
            ].map((row, i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{row.k}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--ink)' }}>{row.v}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted-lt)', fontWeight: 300, marginTop: 10 }}>
            In your firmware <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, background: 'var(--border)', padding: '1px 5px' }}>config.h</code>, set <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, background: 'var(--border)', padding: '1px 5px' }}>SERVER_URL</code> to your Vercel deployment URL.
          </p>
        </Section>

        {/* Danger */}
        <Section num="004" title="Danger zone">
          <div style={{ border: '1px solid rgba(184,74,42,0.2)', padding: 20, marginBottom: 16 }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8 }}>Sign out</div>
            <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginBottom: 16, lineHeight: 1.6 }}>
              You will be redirected to the sign-in page.
            </p>
            <button
              style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 16px', background: 'transparent', color: 'var(--rust)', border: '1px solid rgba(184,74,42,0.3)', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(184,74,42,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              onClick={signOut}
            >
              Sign out →
            </button>
          </div>
        </Section>
      </div>
    </>
  )
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
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
    <div onClick={() => onChange(!checked)} style={{ position: 'relative', width: 36, height: 20, flexShrink: 0, cursor: 'pointer' }}>
      <div style={{ position: 'absolute', inset: 0, background: checked ? 'var(--rust)' : 'var(--border)', borderRadius: 20, transition: 'background 0.2s' }}>
        <div style={{ position: 'absolute', height: 14, width: 14, left: checked ? 19 : 3, bottom: 3, background: 'var(--paper)', borderRadius: '50%', transition: 'left 0.2s' }} />
      </div>
    </div>
  )
}
