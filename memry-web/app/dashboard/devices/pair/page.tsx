'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import Topbar from '@/components/layout/Topbar'

type Step = 1 | 2 | 3 | 4

const REFRESH_OPTIONS = [
  { label: 'Every 1 hour',   value: 1  },
  { label: 'Every 4 hours',  value: 4  },
  { label: 'Every 8 hours',  value: 8  },
  { label: 'Every 24 hours', value: 24 },
]

export default function PairPage() {
  const router   = useRouter()
  const supabase = createBrowserClient()

  const [step,        setStep]        = useState<Step>(1)
  const [deviceNum,   setDeviceNum]   = useState('')   // '001'
  const [name,        setName]        = useState('')   // "Jo's Kitchen"
  const [location,    setLocation]    = useState('')
  const [sleepHours,  setSleepHours]  = useState(4)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const deviceId = `memry-${deviceNum.padStart(3, '0')}`

  async function verifyDevice() {
    if (!deviceNum) return
    setLoading(true); setError(null)

    // Check device doesn't already exist in this account
    const { data: existing } = await supabase
      .from('devices')
      .select('id')
      .eq('id', deviceId)
      .single()

    if (existing) {
      setError(`${deviceId} is already paired to an account.`)
      setLoading(false)
      return
    }

    setLoading(false)
    setStep(2)
  }

  async function confirmPair() {
    if (!name.trim()) return
    setLoading(true); setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in.'); setLoading(false); return }

    const { error: insertErr } = await supabase
      .from('devices')
      .insert({
        id:          deviceId,
        name:        name.trim(),
        owner_id:    user.id,
        sleep_hours: sleepHours,
        display_type: 'color',
      })

    if (insertErr) {
      setError(insertErr.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setStep(4)
  }

  const steps = [
    { n: 1, label: 'Device ID' },
    { n: 2, label: 'Name it'   },
    { n: 3, label: 'Confirm'   },
  ]

  return (
    <>
      <Topbar breadcrumb="mem.ry / Devices" page="Pair device" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'calc(100vh - 52px)' }}>

        {/* LEFT */}
        <div style={{ background: 'var(--paper)', borderRight: '1px solid var(--border)', padding: '64px 56px', display: 'flex', flexDirection: 'column' }}>

          {/* Step indicator */}
          {step < 4 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 56 }}>
              {steps.map((s, i) => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 28, height: 28,
                    border: `1px solid ${step > s.n ? 'var(--rust)' : step === s.n ? 'var(--ink)' : 'var(--border)'}`,
                    background: step > s.n ? 'var(--rust)' : step === s.n ? 'var(--ink)' : 'var(--paper)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.1em',
                    color: step >= s.n ? 'var(--paper)' : 'var(--muted-lt)',
                    transition: 'all 0.2s',
                  }}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ width: 32, height: 1, background: step > s.n ? 'var(--rust)' : 'var(--border)', transition: 'background 0.2s' }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* STEP 1 — Enter ID */}
          {step === 1 && (
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 10 }}>001 — pair device</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, fontWeight: 300, lineHeight: 0.95, letterSpacing: '-1.5px', marginBottom: 10 }}>
                Enter<br />device <em style={{ fontStyle: 'italic' }}>ID</em>
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, marginBottom: 40, lineHeight: 1.6 }}>
                Find the 3-digit ID on the sticker inside the back panel of your MEMRY device.
              </p>

              <div style={{ border: '1px solid var(--border)', background: 'var(--bg)', padding: '18px 20px', display: 'flex', alignItems: 'center', marginBottom: 8, transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink)'}
                onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
              >
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, color: 'var(--muted-lt)', marginRight: 0, letterSpacing: '0.05em', flexShrink: 0 }}>
                  memry-
                </span>
                <input
                  type="text"
                  value={deviceNum}
                  onChange={e => setDeviceNum(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="001"
                  maxLength={3}
                  autoFocus
                  style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, letterSpacing: '0.08em', color: 'var(--ink)', background: 'none', border: 'none', outline: 'none', width: '100%', caretColor: 'var(--rust)' }}
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted-lt)', fontWeight: 300, marginBottom: 32 }}>
                3 digits — e.g. <span style={{ fontFamily: 'DM Mono, monospace' }}>memry-001</span>
              </p>

              {error && <div style={{ padding: '12px 14px', background: '#FAF0EE', borderLeft: '3px solid var(--rust)', fontSize: 12, color: '#7A2E1E', marginBottom: 16 }}>{error}</div>}

              <button
                className="btn-dark"
                style={{ width: '100%', opacity: deviceNum.length < 1 ? 0.35 : 1 }}
                disabled={deviceNum.length < 1 || loading}
                onClick={verifyDevice}
              >
                {loading ? 'Checking…' : 'Continue →'}
              </button>
            </div>
          )}

          {/* STEP 2 — Name it */}
          {step === 2 && (
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 10 }}>002 — name it</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, fontWeight: 300, lineHeight: 0.95, letterSpacing: '-1.5px', marginBottom: 10 }}>
                Give it<br />a <em style={{ fontStyle: 'italic' }}>name</em>
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, marginBottom: 40, lineHeight: 1.6 }}>
                Where will this MEMRY live? You&apos;ll see this on your dashboard.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label className="form-label">Device name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. Jo&apos;s Kitchen"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label">Location <span style={{ color: 'var(--muted-lt)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: 0, textTransform: 'none', fontSize: 10 }}>— optional</span></label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. Pune, India"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Refresh interval</label>
                  <select
                    value={sleepHours}
                    onChange={e => setSleepHours(Number(e.target.value))}
                    style={{ width: '100%', padding: '13px 16px', background: '#F5F0E8', border: '1px solid var(--border)', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, color: 'var(--ink)', outline: 'none', cursor: 'pointer', borderRadius: 0 }}
                  >
                    {REFRESH_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: 11, color: 'var(--muted-lt)', marginTop: 6, fontWeight: 300 }}>
                    How often the device wakes to check for new photos. Lower = more battery use.
                  </p>
                </div>
              </div>

              {error && <div style={{ padding: '12px 14px', background: '#FAF0EE', borderLeft: '3px solid var(--rust)', fontSize: 12, color: '#7A2E1E', marginBottom: 16 }}>{error}</div>}

              <button
                className="btn-dark"
                style={{ width: '100%', marginBottom: 8, opacity: !name.trim() ? 0.35 : 1 }}
                disabled={!name.trim()}
                onClick={() => setStep(3)}
              >
                Review pairing →
              </button>
              <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setStep(1)}>← Back</button>
            </div>
          )}

          {/* STEP 3 — Confirm */}
          {step === 3 && (
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 10 }}>003 — confirm</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, fontWeight: 300, lineHeight: 0.95, letterSpacing: '-1.5px', marginBottom: 10 }}>
                All<br />l<em style={{ fontStyle: 'italic' }}>oo</em>ks<br />g<em style={{ fontStyle: 'italic' }}>oo</em>d
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, marginBottom: 40, lineHeight: 1.6 }}>
                Confirm the details below. Once paired, the device will appear on your dashboard.
              </p>

              <div style={{ border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: 24 }}>
                {[
                  { key: 'Device ID',        val: deviceId,       mono: true  },
                  { key: 'Name',             val: name,           mono: false },
                  { key: 'Location',         val: location || '—',mono: false },
                  { key: 'Refresh interval', val: `Every ${sleepHours}h`, mono: false },
                  { key: 'Display type',     val: 'Color (Spectra 6)', mono: false },
                ].map((row, i, arr) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>{row.key}</span>
                    <span style={{ fontFamily: row.mono ? 'DM Mono, monospace' : 'Space Grotesk, sans-serif', fontSize: row.mono ? 12 : 13, fontWeight: 500, color: 'var(--ink)' }}>{row.val}</span>
                  </div>
                ))}
              </div>

              {error && <div style={{ padding: '12px 14px', background: '#FAF0EE', borderLeft: '3px solid var(--rust)', fontSize: 12, color: '#7A2E1E', marginBottom: 16 }}>{error}</div>}

              <button className="btn-dark" style={{ width: '100%', marginBottom: 8 }} disabled={loading} onClick={confirmPair}>
                {loading ? 'Pairing…' : 'Pair device →'}
              </button>
              <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setStep(2)}>← Back</button>
            </div>
          )}

          {/* STEP 4 — Success */}
          {step === 4 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 0 }}>
              <div style={{ width: 56, height: 56, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--rust)" strokeWidth="1.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8 }}>Paired successfully</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 48, fontWeight: 300, lineHeight: 0.95, letterSpacing: '-1.5px', marginBottom: 16 }}>
                Device<br />is <em style={{ fontStyle: 'italic' }}>live</em>
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, marginBottom: 40, lineHeight: 1.6, maxWidth: 280 }}>
                <strong style={{ fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{deviceId}</strong> — &ldquo;{name}&rdquo; has been paired. Upload a photo to get started.
              </p>
              <button className="btn-dark" style={{ width: '100%', maxWidth: 280, marginBottom: 8 }} onClick={() => router.push(`/dashboard/upload?device=${deviceId}`)}>
                Upload first photo →
              </button>
              <button className="btn-ghost" style={{ width: '100%', maxWidth: 280 }} onClick={() => { setStep(1); setDeviceNum(''); setName(''); setLocation(''); }}>
                Pair another device
              </button>
            </div>
          )}
        </div>

        {/* RIGHT — dark panel */}
        <div style={{ background: 'var(--dark)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(201,169,110,0.06) 1px, transparent 1px)', backgroundSize: '18px 18px', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 32, right: 32, fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.3)' }}>mem.ry · 2025</div>

          {/* Live device preview */}
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 32 }}>
            <div style={{ background: 'var(--paper)', padding: '12px 12px 48px', width: 168, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
              <div style={{ width: 144, height: 144, background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(184,74,42,0.07) 1px, transparent 1px)', backgroundSize: '9px 9px' }} />
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(184,74,42,0.2)" strokeWidth="1" strokeLinecap="round" style={{ position: 'relative', zIndex: 1 }}>
                  <rect x="3" y="3" width="18" height="18" rx="1" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  {deviceNum ? deviceId : 'memry-???'}
                </span>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--sand)' }}>Mem.ry</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 300, fontStyle: 'italic', color: 'var(--bg)', lineHeight: 1.05, letterSpacing: '-1px', marginBottom: 12 }}>
              Y<em style={{ color: 'var(--sand)' }}>o</em>ur fridge,<br />upgraded.
            </div>
            <p style={{ fontSize: 12, color: 'rgba(242,237,228,0.4)', fontWeight: 300, lineHeight: 1.65, maxWidth: 220 }}>
              Once paired, any photo you upload appears on the display within the next wake cycle.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
