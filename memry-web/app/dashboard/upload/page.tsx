'use client'

import { useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'

const SPECTRA6_RGB: [number, number, number][] = [
  [26, 20, 14], [245, 240, 232], [61, 107, 67],
  [30, 58, 90], [184, 74, 42],  [201, 169, 110],
]
const PALETTE_HEX = ['#1A140E', '#F5F0E8', '#3D6B43', '#1E3A5A', '#B84A2A', '#C9A96E']
const PALETTE_LABELS = ['Black', 'White', 'Green', 'Blue', 'Red', 'Yellow']

function nearestColor(r: number, g: number, b: number) {
  let best = 0, bestDist = Infinity
  for (let i = 0; i < SPECTRA6_RGB.length; i++) {
    const [pr, pg, pb] = SPECTRA6_RGB[i]
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
    if (d < bestDist) { bestDist = d; best = i }
  }
  return best
}

function simulateEink(canvas: HTMLCanvasElement, src: HTMLImageElement) {
  const W = canvas.width, H = canvas.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(src, 0, 0, W, H)
  const img = ctx.getImageData(0, 0, W, H)
  const d   = img.data
  const r   = new Float32Array(W * H)
  const g   = new Float32Array(W * H)
  const b   = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) { r[i] = d[i*4]; g[i] = d[i*4+1]; b[i] = d[i*4+2] }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x
      const or = Math.max(0, Math.min(255, r[idx]))
      const og = Math.max(0, Math.min(255, g[idx]))
      const ob = Math.max(0, Math.min(255, b[idx]))
      const ci = nearestColor(or, og, ob)
      const [nr, ng, nb] = SPECTRA6_RGB[ci]
      d[idx*4] = nr; d[idx*4+1] = ng; d[idx*4+2] = nb
      const er = or - nr, eg = og - ng, eb = ob - nb
      const spread = (ex: number, ey: number, f: number) => {
        if (ex < 0 || ex >= W || ey >= H) return
        const ni = ey * W + ex
        r[ni] += er * f; g[ni] += eg * f; b[ni] += eb * f
      }
      spread(x+1, y,   7/16); spread(x-1, y+1, 3/16)
      spread(x,   y+1, 5/16); spread(x+1, y+1, 1/16)
    }
  }
  ctx.putImageData(img, 0, 0)
}

// Mock device list — in production fetch from /api/devices
const MOCK_DEVICES = [
  { id: 'memry-001', name: "Jo's Kitchen",  status: 'online'   },
  { id: 'memry-002', name: 'Living Room',   status: 'online'   },
  { id: 'memry-003', name: 'Bedroom',       status: 'sleeping' },
]

function UploadPageInner() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const defaultDevice = searchParams.get('device') ?? MOCK_DEVICES[0].id

  const [file,        setFile]        = useState<File | null>(null)
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null)
  const [einkUrl,     setEinkUrl]     = useState<string | null>(null)
  const [caption,     setCaption]     = useState('')
  const [deviceId,    setDeviceId]    = useState(defaultDevice)
  const [setActive,   setSetActive]   = useState(true)
  const [status,      setStatus]      = useState<'idle'|'processing'|'ready'|'uploading'|'done'|'error'>('idle')
  const [error,       setError]       = useState<string | null>(null)
  const [dragOver,    setDragOver]    = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const selectedDevice = MOCK_DEVICES.find(d => d.id === deviceId) ?? MOCK_DEVICES[0]

  const processFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    setFile(f)
    setError(null)
    setStatus('processing')
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      simulateEink(canvas, img)
      setEinkUrl(canvas.toDataURL('image/jpeg', 0.9))
      setStatus('ready')
    }
    img.src = url
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }

  function clearFile() {
    setFile(null); setPreviewUrl(null); setEinkUrl(null); setStatus('idle')
  }

  async function handleUpload() {
    if (!file || !deviceId) return
    setStatus('uploading')
    const form = new FormData()
    form.append('file', file)
    form.append('device_id', deviceId)
    form.append('caption', caption)
    form.append('set_active', String(setActive))
    const res = await fetch('/api/photos/upload', { method: 'POST', body: form })
    if (res.ok) {
      setStatus('done')
      setTimeout(() => router.push('/dashboard'), 1800)
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Upload failed. Please try again.')
      setStatus('error')
    }
  }

  return (
    <>
      <Topbar breadcrumb="mem.ry" page="Upload" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'calc(100vh - 52px)' }}>

        {/* LEFT — form */}
        <div style={{ background: 'var(--paper)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8 }}>002 — upload</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 40, fontWeight: 300, lineHeight: 0.95, letterSpacing: '-1px' }}>
              Send a<br /><em style={{ fontStyle: 'italic', color: 'var(--rust)' }}>mem</em>ory
            </h2>
          </div>

          <div style={{ padding: '28px 40px', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Drop zone */}
            <div>
              <label className="form-label">Photo</label>
              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  style={{ border: `1px dashed ${dragOver ? 'var(--rust)' : 'var(--border)'}`, background: dragOver ? 'var(--paper)' : 'var(--bg)', padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
                >
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                  <div style={{ width: 44, height: 44, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>Drop photo here</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-lt)', fontWeight: 300 }}>JPG, PNG, HEIC — any size</div>
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border)', background: 'var(--bg)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {previewUrl && <img src={previewUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{file.name}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.1em', color: 'var(--muted-lt)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                  </div>
                  <button onClick={clearFile} style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>Remove</button>
                </div>
              )}
            </div>

            {/* Device selector */}
            <div>
              <label className="form-label">Send to device</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MOCK_DEVICES.map(dev => (
                  <label key={dev.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', border: `1px solid ${deviceId === dev.id ? 'var(--ink)' : 'var(--border)'}`, background: deviceId === dev.id ? 'var(--bg)' : 'var(--paper)', cursor: 'pointer', transition: 'all 0.12s' }}>
                    <input type="radio" name="device" value={dev.id} checked={deviceId === dev.id} onChange={() => setDeviceId(dev.id)} style={{ accentColor: 'var(--rust)', width: 14, height: 14 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{dev.name}</div>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.1em', color: 'var(--muted-lt)', marginTop: 1 }}>{dev.id}</div>
                    </div>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, background: dev.status === 'online' ? '#EDFAEA' : '#F5F0E8', color: dev.status === 'online' ? '#3D6B43' : '#6B6159' }}>
                      {dev.status}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Caption */}
            <div>
              <label className="form-label">Caption <span style={{ color: 'var(--muted-lt)', fontStyle: 'normal', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: 0, textTransform: 'none', fontSize: 10 }}>— optional</span></label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="A memory worth keeping…"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', resize: 'none', lineHeight: 1.5 }}
              />
            </div>

            {/* Set active toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div style={{ position: 'relative', width: 36, height: 20, flexShrink: 0 }}>
                <input type="checkbox" checked={setActive} onChange={e => setSetActive(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <div style={{ position: 'absolute', inset: 0, background: setActive ? 'var(--rust)' : 'var(--border)', borderRadius: 20, cursor: 'pointer', transition: 'background 0.2s' }}
                  onClick={() => setSetActive(v => !v)}
                >
                  <div style={{ position: 'absolute', height: 14, width: 14, left: setActive ? 19 : 3, bottom: 3, background: 'var(--paper)', borderRadius: '50%', transition: 'left 0.2s' }} />
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>Set as active photo immediately</span>
            </label>

            {error && <div style={{ padding: '12px 14px', background: '#FAF0EE', borderLeft: '3px solid var(--rust)', fontSize: 12, color: '#7A2E1E' }}>{error}</div>}
          </div>

          {/* Footer */}
          <div style={{ padding: '20px 40px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
            <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '12px 24px' }}>Cancel</button>
            <button
              onClick={handleUpload}
              disabled={status !== 'ready' || !file}
              className="btn-dark"
              style={{ flex: 1, opacity: status !== 'ready' || !file ? 0.35 : 1 }}
            >
              {status === 'uploading' ? 'Sending…' : status === 'done' ? 'Sent to fridge ✓' : 'Send to fridge →'}
            </button>
          </div>
        </div>

        {/* RIGHT — live Polaroid preview */}
        <div style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent,transparent 39px,var(--border) 39px,var(--border) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,var(--border) 40px,var(--border) 41px)', opacity: 0.3, pointerEvents: 'none' }} />

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} width={600} height={400} style={{ display: 'none' }} />

          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 32, position: 'relative', zIndex: 1 }}>Live e-ink preview</div>

          {/* Polaroid frame */}
          <div style={{ background: 'var(--paper)', padding: '16px 16px 64px', width: 248, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 0 1px #E0D8CC, 0 6px 0 1px #D4CCC0, 0 32px 80px rgba(0,0,0,0.14)', position: 'relative', zIndex: 1 }}>
            <div style={{ width: 216, height: 216, background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(184,74,42,0.06) 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
              {einkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={einkUrl} alt="e-ink preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(184,74,42,0.2)" strokeWidth="1" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(107,97,89,0.4)' }}>awaiting photo</span>
                </div>
              )}
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)' }}>{selectedDevice.id}</span>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--sand)' }}>Mem.ry</span>
            </div>
          </div>

          {/* Caption below frame */}
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginTop: 8, position: 'relative', zIndex: 1, minHeight: 20 }}>
            {caption || selectedDevice.name}
          </div>

          {/* Status */}
          <div style={{ marginTop: 24, position: 'relative', zIndex: 1, minHeight: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            {status === 'processing' && (
              <>
                {[0, 0.2, 0.4].map((d, i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rust)', animation: 'blink 1.2s ease-in-out infinite', animationDelay: `${d}s` }} />
                ))}
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--rust)' }}>Quantising to 6-color palette…</span>
              </>
            )}
            {status === 'ready' && (
              <>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--green)' }}>Ready to send</span>
              </>
            )}
            {status === 'done' && (
              <>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--green)' }}>On its way to the fridge</span>
              </>
            )}
          </div>

          {/* Spectra 6 palette chips */}
          <div style={{ display: 'flex', gap: 4, marginTop: 20, alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)', marginRight: 6 }}>Spectra 6</span>
            {PALETTE_HEX.map((hex, i) => (
              <div key={i} title={PALETTE_LABELS[i]} style={{ width: 14, height: 14, background: hex, border: '1px solid rgba(0,0,0,0.1)' }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:0.2} 50%{opacity:1} }`}</style>
    </>
  )
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadPageInner />
    </Suspense>
  )
}
