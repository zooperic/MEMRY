'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

type Mode = 'signin' | 'signup' | 'forgot'

export default function AuthPage() {
  const [mode, setMode]       = useState<Mode>('signin')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createBrowserClient()

  async function handleGoogleSignIn() {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null); setSuccess(null)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false) }
      else router.push('/dashboard')

    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      })
      if (error) { setError(error.message); setLoading(false) }
      else setSuccess('Check your email to confirm your account.')

    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/reset`,
      })
      if (error) { setError(error.message) }
      else setSuccess('Reset link sent — check your inbox.')
      setLoading(false)
    }
  }

  const titles: Record<Mode, { eyebrow: string; heading: JSX.Element; sub: string }> = {
    signin: {
      eyebrow: '001 — welcome back',
      heading: <>Sign<br /><em style={{ fontStyle: 'italic', color: 'var(--rust)' }}>int</em>o MEMRY</>,
      sub: 'Your fridge is waiting.',
    },
    signup: {
      eyebrow: '002 — join memry',
      heading: <>Create<br />y<em style={{ fontStyle: 'italic', color: 'var(--rust)' }}>o</em>ur<br />account</>,
      sub: 'Start putting memories on the fridge.',
    },
    forgot: {
      eyebrow: '003 — recovery',
      heading: <>Reset<br />y<em style={{ fontStyle: 'italic', color: 'var(--rust)' }}>o</em>ur<br />passw<em style={{ fontStyle: 'italic', color: 'var(--rust)' }}>o</em>rd</>,
      sub: "Enter your email and we'll send a reset link.",
    },
  }

  const t = titles[mode]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>

      {/* LEFT — form */}
      <div style={{ background: 'var(--paper)', borderRight: '1px solid var(--border)', padding: '64px 56px', display: 'flex', flexDirection: 'column' }}>

        {/* Logo */}
        <div style={{ width: 80, height: 24, border: '1px dashed var(--border)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)', marginBottom: 64 }}>
          [ logo ]
        </div>

        {/* Heading */}
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 10 }}>{t.eyebrow}</div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 52, fontWeight: 300, lineHeight: 0.95, letterSpacing: '-1.5px', marginBottom: 10 }}>{t.heading}</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, marginBottom: 40, lineHeight: 1.6 }}>{t.sub}</p>

        {/* Google */}
        {mode !== 'forgot' && (
          <>
            <button onClick={handleGoogleSignIn} disabled={loading} style={{ width: '100%', padding: '13px', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              <GoogleG /> Continue with Google
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)' }}>or email</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'signup' && (
            <div>
              <label className="form-label">Your name</label>
              <input className="form-input" type="text" placeholder="First name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          {mode !== 'forgot' && (
            <div>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              {mode === 'signup' && <p style={{ fontSize: 11, color: 'var(--muted-lt)', marginTop: 6, fontWeight: 300 }}>At least 8 characters.</p>}
              {mode === 'signin' && (
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => setMode('forgot')}>
                  <span style={{ borderBottom: '1px solid var(--border)' }}>Forgot password?</span>
                </p>
              )}
            </div>
          )}

          {error   && <div style={{ padding: '12px 14px', background: '#FAF0EE', borderLeft: '3px solid var(--rust)', fontSize: 12, color: '#7A2E1E' }}>{error}</div>}
          {success && <div style={{ padding: '12px 14px', background: '#EDFAEA', borderLeft: '3px solid var(--green)', fontSize: 12, color: '#3D6B43' }}>{success}</div>}

          <button type="submit" disabled={loading} className="btn-dark" style={{ width: '100%', marginTop: 4 }}>
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign in →' : mode === 'signup' ? 'Create account →' : 'Send reset link →'}
          </button>
        </form>

        {/* Switch mode */}
        <div style={{ marginTop: 28, fontSize: 12, color: 'var(--muted)', fontWeight: 300, textAlign: 'center' }}>
          {mode === 'signin' && <>No account? <SwitchLink onClick={() => { setMode('signup'); setError(null); }}>Create one</SwitchLink></>}
          {mode === 'signup' && <>Already have an account? <SwitchLink onClick={() => { setMode('signin'); setError(null); }}>Sign in</SwitchLink></>}
          {mode === 'forgot' && <><SwitchLink onClick={() => { setMode('signin'); setError(null); }}>← Back to sign in</SwitchLink></>}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 32, borderTop: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-lt)' }}>
          By continuing you agree to our terms &amp; privacy policy.
        </div>
      </div>

      {/* RIGHT — dark decorative panel */}
      <div style={{ background: 'var(--dark)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(201,169,110,0.06) 1px, transparent 1px)', backgroundSize: '18px 18px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 32, right: 32, fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.3)' }}>mem.ry · 2025</div>

        {/* Stacked polaroids */}
        <div style={{ position: 'relative', width: 200, height: 240, marginBottom: 40 }}>
          {[
            { rotate: -6, translateY: 20, translateX: -10, z: 1, sim: 'linear-gradient(135deg, #C9A96E33, #B84A2A22)' },
            { rotate: 2,  translateY: 10, translateX: 15,  z: 2, sim: 'linear-gradient(160deg, #1E3A5A33, #C9A96E33)' },
            { rotate: -1, translateY: 0,  translateX: 0,   z: 3, sim: 'linear-gradient(110deg, #3D6B4322, #C9A96E44)' },
          ].map((p, i) => (
            <div key={i} style={{
              position: 'absolute', top: 0, left: 10,
              background: 'var(--paper)', padding: '10px 10px 44px', width: 170,
              transform: `rotate(${p.rotate}deg) translateY(${p.translateY}px) translateX(${p.translateX}px)`,
              zIndex: p.z,
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}>
              <div style={{ width: 150, height: 150, background: p.sim, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(184,74,42,0.06) 1px, transparent 1px)', backgroundSize: '9px 9px' }} />
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 44, display: 'flex', alignItems: 'center', padding: '0 10px', fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {['jo\'s kitchen', 'living room', 'memry-001'][i]}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 40, fontWeight: 300, fontStyle: 'italic', color: 'var(--bg)', lineHeight: 1.05, letterSpacing: '-1px', marginBottom: 16 }}>
            Y<em style={{ color: 'var(--sand)' }}>o</em>ur memories,<br />always visible.
          </div>
          <p style={{ fontSize: 12, color: 'rgba(242,237,228,0.4)', fontWeight: 300, lineHeight: 1.65, maxWidth: 240 }}>
            Every photo you upload finds its way to the fridge — silently, beautifully, without lifting a finger.
          </p>
        </div>
      </div>
    </div>
  )
}

function SwitchLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <span onClick={onClick} style={{ color: 'var(--ink)', fontWeight: 500, borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
      {children}
    </span>
  )
}

function GoogleG() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
