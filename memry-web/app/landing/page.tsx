'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ThemeToggle from '@/components/layout/ThemeToggle'

// ── 3D POLAROID HOOK ──────────────────────────────────────────
function usePolaroid3D() {
  const stageRef   = useRef<HTMLDivElement>(null)
  const polaroidRef= useRef<HTMLDivElement>(null)
  const rotX = useRef(6)
  const rotY = useRef(-14)
  const velX = useRef(0)
  const velY = useRef(0)
  const isDrag= useRef(false)
  const lastX = useRef(0)
  const lastY = useRef(0)
  const raf   = useRef<number>(0)
  const [interacted, setInteracted] = useState(false)

  function setT(rx: number, ry: number) {
    if (polaroidRef.current)
      polaroidRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`
  }
  function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)) }

  function coast() {
    if (Math.abs(velX.current) < 0.06 && Math.abs(velY.current) < 0.06) { spring(); return }
    velX.current *= 0.91; velY.current *= 0.91
    rotY.current = clamp(rotY.current + velX.current * 0.45, -65, 65)
    rotX.current = clamp(rotX.current - velY.current * 0.45, -28, 28)
    setT(rotX.current, rotY.current)
    raf.current = requestAnimationFrame(coast)
  }

  function spring() {
    const tx = 6, ty = -14
    const step = () => {
      rotX.current += (tx - rotX.current) * 0.07
      rotY.current += (ty - rotY.current) * 0.07
      setT(rotX.current, rotY.current)
      if (Math.abs(rotX.current - tx) > 0.05 || Math.abs(rotY.current - ty) > 0.05)
        raf.current = requestAnimationFrame(step)
    }
    step()
  }

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    function onDown(x: number, y: number) {
      isDrag.current = true
      lastX.current = x; lastY.current = y
      velX.current = 0; velY.current = 0
      cancelAnimationFrame(raf.current)
      if (!interacted) setInteracted(true)
    }
    function onMove(x: number, y: number) {
      if (!isDrag.current) return
      const dx = x - lastX.current, dy = y - lastY.current
      velX.current = dx; velY.current = dy
      lastX.current = x; lastY.current = y
      rotY.current = clamp(rotY.current + dx * 0.45, -65, 65)
      rotX.current = clamp(rotX.current - dy * 0.45, -28, 28)
      setT(rotX.current, rotY.current)
    }
    function onUp() { if (isDrag.current) { isDrag.current = false; coast() } }

    const md = (e: MouseEvent) => { e.preventDefault(); onDown(e.clientX, e.clientY) }
    const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY)
    const ts = (e: TouchEvent) => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY) }
    const tm = (e: TouchEvent) => { if (isDrag.current) { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY) } }

    // Parallax on mouse proximity
    const mp = (e: MouseEvent) => {
      if (isDrag.current) return
      const r = stage.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      if (Math.sqrt(dx * dx + dy * dy) < 2.5) {
        const tx = 6 - dy * 5, ty = -14 + dx * 7
        rotX.current += (tx - rotX.current) * 0.06
        rotY.current += (ty - rotY.current) * 0.06
        setT(rotX.current, rotY.current)
      }
    }

    stage.addEventListener('mousedown', md)
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', onUp)
    stage.addEventListener('touchstart', ts, { passive: false })
    window.addEventListener('touchmove', tm, { passive: false })
    window.addEventListener('touchend', onUp)
    document.addEventListener('mousemove', mp)

    return () => {
      stage.removeEventListener('mousedown', md)
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', onUp)
      stage.removeEventListener('touchstart', ts)
      window.removeEventListener('touchmove', tm)
      window.removeEventListener('touchend', onUp)
      document.removeEventListener('mousemove', mp)
      cancelAnimationFrame(raf.current)
    }
  }, []) // eslint-disable-line

  return { stageRef, polaroidRef, interacted }
}

// ── LANDING PAGE ──────────────────────────────────────────────
export default function LandingPage() {
  const { stageRef, polaroidRef, interacted } = usePolaroid3D()

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56, padding: '0 40px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(242,237,228,0.88)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Logo placeholder */}
        <div style={{ width: 88, height: 26, border: '1px dashed var(--border)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)' }}>
          [ logo ]
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { label: 'How it works', href: '#how'   },
            { label: 'The device',   href: '#about' },
          ].map(n => (
            <a key={n.href} href={n.href} style={{ padding: '0 20px', height: 56, lineHeight: '56px', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none', borderLeft: '1px solid var(--border)', transition: 'color 0.15s', display: 'block' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--ink)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--muted)'}
            >
              {n.label}
            </a>
          ))}
          <Link href="/auth" style={{ padding: '0 24px', height: 56, lineHeight: '56px', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--paper)', background: 'var(--ink)', textDecoration: 'none', borderLeft: '1px solid var(--ink)', transition: 'background 0.15s', display: 'block' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--rust)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--ink)'}
          >
            Sign in →
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderLeft: '1px solid var(--border)' }}>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="memry-hero" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', paddingTop: 56 }}>

        {/* Left */}
        <div style={{ padding: '80px 60px 80px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid var(--border)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rust)' }} />
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>WiFi e-ink fridge magnet · Pune, 2025</span>
          </div>

          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(64px, 7vw, 96px)', fontWeight: 300, lineHeight: 0.92, letterSpacing: '-2px', marginBottom: 32 }}>
            A digital<br />
            sh<em style={{ fontStyle: 'italic' }}>o</em>wr<em style={{ fontStyle: 'italic' }}>oo</em>m<br />
            f<em style={{ fontStyle: 'italic' }}>o</em>r mem<em style={{ fontStyle: 'italic' }}>o</em>ries
          </h1>

          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)', fontWeight: 300, maxWidth: 340, marginBottom: 48 }}>
            Photos stay inside phones. MEMRY puts one on your fridge — refreshing silently over WiFi, running months on a charge, always just there.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 48 }}>
            <Link href="/auth" className="btn-dark">Get early access</Link>
            <a href="#how" className="btn-ghost">See how it works</a>
          </div>

          <div style={{ display: 'flex', gap: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            {['6-color e-ink', '~3 months battery', 'Polaroid form'].map(f => (
              <span key={f} style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{f}</span>
            ))}
          </div>
        </div>

        {/* Right — 3D Polaroid */}
        <div style={{ background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', position: 'relative', overflow: 'hidden' }}>
          {/* Grid texture */}
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent,transparent 39px,var(--border) 39px,var(--border) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,var(--border) 40px,var(--border) 41px)', opacity: 0.35, pointerEvents: 'none' }} />

          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 40, position: 'relative', zIndex: 1 }}>
            001 — device preview
          </div>

          {/* 3D stage */}
          <div
            ref={stageRef}
            style={{ perspective: 1400, cursor: 'grab', position: 'relative', zIndex: 1, touchAction: 'none', userSelect: 'none' }}
          >
            <div
              ref={polaroidRef}
              style={{ width: 220, transformStyle: 'preserve-3d', transform: 'rotateX(6deg) rotateY(-14deg)', transition: 'transform 0.04s linear' }}
            >
              {/* Front face */}
              <div style={{ background: 'var(--paper)', padding: '12px 12px 52px', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 2px 0 1px #E0D8CC, 0 4px 0 1px #D4CCC0, 0 24px 64px rgba(0,0,0,0.16), 0 8px 16px rgba(0,0,0,0.08)', transform: 'translateZ(6px)', position: 'relative' }}>
                {/* Image area */}
                <div style={{ width: 196, height: 196, background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(184,74,42,0.12) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 56, height: 56, border: '1px solid rgba(184,74,42,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(184,74,42,0.3)" strokeWidth="1.2" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="1" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(107,97,89,0.4)' }}>your photo here</span>
                  </div>
                </div>
                {/* Strip */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)' }}>memry-001</span>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--sand)' }}>Mem.ry</span>
                </div>
                {/* Depth sides */}
                <div style={{ position: 'absolute', bottom: -8, left: 4, right: 4, height: 8, background: 'linear-gradient(to right, #E0D8CC, #C8C0B4)', transformOrigin: 'top center', transform: 'rotateX(90deg) translateZ(0)' }} />
                <div style={{ position: 'absolute', top: 4, right: -8, bottom: 4, width: 8, background: 'linear-gradient(to right, #E0D8CC, #C8C0B4)', transformOrigin: 'left center', transform: 'rotateY(-90deg) translateZ(0)' }} />
              </div>
            </div>
          </div>

          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 32, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, opacity: interacted ? 0 : 1, transition: 'opacity 0.4s' }}>
            <div style={{ width: 20, height: 1, background: 'var(--border)' }} />
            drag to rotate
            <div style={{ width: 20, height: 1, background: 'var(--border)' }} />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '60px 40px', borderRight: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 16 }}>002 — process</span>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 300, lineHeight: 1, letterSpacing: '-1.5px' }}>
              H<em style={{ fontStyle: 'italic' }}>o</em>w it<br />w<em style={{ fontStyle: 'italic' }}>o</em>rks
            </h2>
          </div>
          <div style={{ padding: '60px 40px', display: 'flex', alignItems: 'flex-end' }}>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)', fontWeight: 300 }}>
              Four steps from unboxing to a living photo on your fridge. No app store, no Bluetooth, no complicated setup.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { n: '01', title: <>Pair<br />the device</>, body: 'Enter the ID printed inside the shell. Name it and you\'re done.', icon: <path d="M12 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>, icon2: <polyline points="14 2 14 8 20 8"/> },
            { n: '02', title: <>Upl<em style={{fontStyle:'italic'}}>o</em>ad<br />a ph<em style={{fontStyle:'italic'}}>o</em>t<em style={{fontStyle:'italic'}}>o</em></>, body: 'Drop any image. A live Polaroid preview shows the 6-color render before it goes live.', icon: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></> },
            { n: '03', title: <>It just<br />appears</>, body: 'The device wakes, fetches over WiFi, renders to e-ink in ~19 seconds, then sleeps for hours.', icon: <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></> },
            { n: '04', title: <>Invite<br />c<em style={{fontStyle:'italic'}}>o</em>ntrib<br /><em style={{fontStyle:'italic'}}>u</em>t<em style={{fontStyle:'italic'}}>o</em>rs</>, body: 'Friends and family upload directly. You curate. Everyone sees the same fridge.', icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></> },
          ].map((step, i) => (
            <div key={i} style={{ padding: '40px 32px', borderRight: i < 3 ? '1px solid var(--border)' : 'none', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', display: 'block', marginBottom: 24 }}>{step.n}</span>
              <div style={{ width: 44, height: 44, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, background: 'var(--paper)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">{step.icon}{step.icon2}</svg>
              </div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 400, lineHeight: 1.1, marginBottom: 10, letterSpacing: '-0.3px' }}>{step.title}</div>
              <p style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--muted)', fontWeight: 300 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT / DEVICE ── */}
      <section id="about" style={{ background: 'var(--dark)', color: 'var(--bg)', display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--border)' }}>
        <div style={{ padding: '80px 40px', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--sand)', display: 'block', marginBottom: 32 }}>003 — the device</span>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(40px, 5vw, 68px)', fontWeight: 300, lineHeight: 1.0, letterSpacing: '-2px', marginBottom: 32 }}>
            Built<br />
            t<em style={{ fontStyle: 'italic' }}>o</em> live<br />
            f<em style={{ fontStyle: 'italic' }}>o</em>rever
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(242,237,228,0.5)', fontWeight: 300, marginBottom: 40 }}>
            A two-piece 3D-printed Polaroid shell housing a Waveshare Spectra 6 e-ink display, an ESP32C3 microcontroller, and a 300mAh LiPo. Sealed with silicone, held by N52 neodymium magnets, charged by USB-C.
          </p>
          <div style={{ display: 'flex', gap: 40, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { val: '6',    label: 'color e-ink'  },
              { val: '~3mo', label: 'per charge'   },
              { val: '11mm', label: 'thin'         },
              { val: '600×400', label: 'px display'},
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 300, fontStyle: 'italic', color: 'var(--sand)', lineHeight: 1, letterSpacing: '-1px' }}>{s.val}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(242,237,228,0.3)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rotated Polaroid in dark panel */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(201,169,110,0.06) 1px, transparent 1px)', backgroundSize: '16px 16px', pointerEvents: 'none' }} />
          <div style={{ background: 'var(--paper)', padding: '14px 14px 56px', width: 200, transform: 'rotate(-3deg)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.5)', position: 'relative', zIndex: 1 }}>
            <div style={{ width: 172, height: 172, background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(184,74,42,0.1) 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(184,74,42,0.25)" strokeWidth="1" strokeLinecap="round" style={{ position: 'relative', zIndex: 1 }}>
                <rect x="3" y="3" width="18" height="18" rx="1" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)' }}>
              a memory, always visible
            </div>
            <span style={{ position: 'absolute', top: 14, right: 14, fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)' }}>001</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--paper)', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ padding: '40px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 300, fontStyle: 'italic', letterSpacing: '-0.5px', marginBottom: 8 }}>
              Mem.ry
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>A digital showroom for memories</div>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)', marginTop: 32 }}>
            © 2025 · Pune, India · All rights reserved
          </div>
        </div>
        <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>Ready to start?</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.5px', marginBottom: 24 }}>
              Put a mem<em style={{ fontStyle: 'italic' }}>o</em>ry<br />on the fridge.
            </div>
            <Link href="/auth" className="btn-dark">Request early access</Link>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 700px) {
          nav { padding: 0 20px; }
          section { grid-template-columns: 1fr !important; }
          #how > div { grid-template-columns: 1fr 1fr !important; }
          footer { grid-template-columns: 1fr !important; }
        }
      ` }} />
    </div>
  )
}
