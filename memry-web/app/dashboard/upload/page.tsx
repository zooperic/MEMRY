'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'

// ── Spectra 6 palette ────────────────────────────────────────
const SPECTRA6: [number, number, number][] = [
  [26, 20, 14],    // Black
  [245, 240, 232], // White
  [61, 107, 67],   // Green
  [30, 58, 90],    // Blue
  [184, 74, 42],   // Red
  [201, 169, 110], // Yellow
]
const PALETTE_HEX   = ['#1A140E', '#F5F0E8', '#3D6B43', '#1E3A5A', '#B84A2A', '#C9A96E']
const PALETTE_NAMES = ['Black', 'White', 'Green', 'Blue', 'Red', 'Yellow']

// ── Nearest Spectra 6 colour ─────────────────────────────────
function nearestColor(r: number, g: number, b: number): number {
  let best = 0, bestD = Infinity
  for (let i = 0; i < SPECTRA6.length; i++) {
    const [pr, pg, pb] = SPECTRA6[i]
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}

// ── Floyd-Steinberg dither with adjustments ──────────────────
function renderEink(
  src: HTMLImageElement,
  canvas: HTMLCanvasElement,
  opts: {
    zoom: number; panX: number; panY: number
    brightness: number; contrast: number; saturation: number; warmth: number
    filter: string
  }
) {
  const W = canvas.width, H = canvas.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  // 1. Fill white base
  ctx.fillStyle = '#F5F0E8'
  ctx.fillRect(0, 0, W, H)

  // 2. Draw image with zoom/pan — CONTAIN by default (whole image visible, letterbox with black)
  //    User can zoom in past 100% to crop into the image
  const scale    = opts.zoom / 100
  const fitScale = Math.min(W / src.naturalWidth, H / src.naturalHeight)
  const drawW    = src.naturalWidth  * fitScale * scale
  const drawH    = src.naturalHeight * fitScale * scale
  const overX    = Math.max(0, drawW - W)
  const overY    = Math.max(0, drawH - H)
  const offsetX  = (W - drawW) / 2 + (opts.panX / 100) * overX * 0.5
  const offsetY  = (H - drawH) / 2 + (opts.panY / 100) * overY * 0.5

  ctx.drawImage(src, offsetX, offsetY, drawW, drawH)

  // 3. Get pixels and apply adjustments
  const imgData = ctx.getImageData(0, 0, W, H)
  const d = imgData.data
  const N = W * H

  let bAdj = opts.brightness, cAdj = opts.contrast
  let sAdj = opts.saturation, wAdj = opts.warmth

  if (opts.filter === 'vivid')   { sAdj += 40; cAdj += 20 }
  if (opts.filter === 'muted')   { sAdj -= 50; cAdj -= 10 }
  if (opts.filter === 'warm')    { wAdj += 30; sAdj += 10 }
  if (opts.filter === 'cool')    { wAdj -= 30 }
  if (opts.filter === 'bw')      { sAdj = -100 }
  if (opts.filter === 'vintage') { sAdj -= 20; wAdj += 15; bAdj -= 10; cAdj += 10 }

  const cFactor = (259 * (cAdj + 255)) / (255 * (259 - cAdj))

  for (let i = 0; i < N; i++) {
    let r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]
    r += bAdj; g += bAdj; b += bAdj
    r = cFactor * (r - 128) + 128
    g = cFactor * (g - 128) + 128
    b = cFactor * (b - 128) + 128
    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    const sf = (sAdj + 100) / 100
    r = luma + (r - luma) * sf
    g = luma + (g - luma) * sf
    b = luma + (b - luma) * sf
    r += wAdj; b -= wAdj * 0.7
    d[i * 4]     = Math.max(0, Math.min(255, Math.round(r)))
    d[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(g)))
    d[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(b)))
  }

  // 4. Floyd-Steinberg dither
  const er = new Float32Array(N)
  const eg = new Float32Array(N)
  const eb = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    er[i] = d[i * 4]; eg[i] = d[i * 4 + 1]; eb[i] = d[i * 4 + 2]
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x
      const or = Math.max(0, Math.min(255, er[idx]))
      const og = Math.max(0, Math.min(255, eg[idx]))
      const ob = Math.max(0, Math.min(255, eb[idx]))
      const ci = nearestColor(or, og, ob)
      const [nr, ng, nb] = SPECTRA6[ci]
      d[idx * 4] = nr; d[idx * 4 + 1] = ng; d[idx * 4 + 2] = nb
      const errR = or - nr, errG = og - ng, errB = ob - nb
      const sp = (ex: number, ey: number, f: number) => {
        if (ex < 0 || ex >= W || ey >= H) return
        const ni = ey * W + ex
        er[ni] += errR * f; eg[ni] += errG * f; eb[ni] += errB * f
      }
      sp(x + 1, y,     7 / 16)
      sp(x - 1, y + 1, 3 / 16)
      sp(x,     y + 1, 5 / 16)
      sp(x + 1, y + 1, 1 / 16)
    }
  }

  ctx.putImageData(imgData, 0, 0)
}

// ── Types ─────────────────────────────────────────────────────
interface Adjustments {
  zoom: number; panX: number; panY: number
  brightness: number; contrast: number; saturation: number; warmth: number
  filter: string
}

const DEFAULT_ADJ: Adjustments = {
  zoom: 100, panX: 0, panY: 0,
  brightness: 0, contrast: 0, saturation: 0, warmth: 0,
  filter: 'natural',
}

const FILTERS = ['Natural', 'Vivid', 'Muted', 'Warm', 'Cool', 'B&W', 'Vintage']

function UploadPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [file,      setFile]      = useState<File | null>(null)
  const [imgEl,     setImgEl]     = useState<HTMLImageElement | null>(null)
  const [previewUrl,setPreviewUrl]= useState<string | null>(null)
  const [caption,   setCaption]   = useState('')
  const [deviceId,  setDeviceId]  = useState(searchParams.get('device') ?? '')
  const [setActive, setSetActive] = useState(true)
  const [adj,       setAdj]       = useState<Adjustments>(DEFAULT_ADJ)
  const [status,    setStatus]    = useState<'idle'|'processing'|'ready'|'uploading'|'done'|'error'>('idle')
  const [error,     setError]     = useState<string | null>(null)
  const [dragOver,  setDragOver]  = useState(false)
  const [devices,   setDevices]   = useState<{id:string;name:string;status:string}[]>([])

  // Canvas refs — hidden render target
  const renderCanvasRef = useRef<HTMLCanvasElement>(null)
  // Display canvas — shown in Polaroid
  const displayCanvasRef = useRef<HTMLCanvasElement>(null)

  // Drag-to-pan state
  const dragRef = useRef<{active:boolean;startX:number;startY:number;panX:number;panY:number}>({
    active:false, startX:0, startY:0, panX:0, panY:0
  })

  // Render timer
  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch real devices
  useEffect(() => {
    fetch('/api/devices')
      .then(r => r.json())
      .then(data => {
        const devs = data.devices ?? []
        setDevices(devs)
        if (!deviceId && devs.length > 0) setDeviceId(devs[0].id)
      })
      .catch(() => {
        // Fallback for dev without API
        setDevices([{ id: 'memry-001', name: "Jo's Kitchen", status: 'online' }])
        if (!deviceId) setDeviceId('memry-001')
      })
  }, []) // eslint-disable-line

  const selectedDevice = devices.find(d => d.id === deviceId) ?? devices[0]

  // ── File handling ─────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    setError(null)
    setFile(f)
    setAdj(DEFAULT_ADJ)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    const img = new Image()
    img.onload = () => {
      setImgEl(img)
      setStatus('processing')
    }
    img.src = url
  }, [])

  function clearFile() {
    setFile(null); setImgEl(null)
    setPreviewUrl(null); setStatus('idle')
    setAdj(DEFAULT_ADJ)
    // Clear display canvas
    const c = displayCanvasRef.current
    if (c) {
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#F5F0E8'
      ctx.fillRect(0, 0, c.width, c.height)
    }
  }

  // ── Trigger render when img or adj changes ───────────────
  useEffect(() => {
    if (!imgEl) return
    setStatus('processing')
    if (renderTimer.current) clearTimeout(renderTimer.current)
    renderTimer.current = setTimeout(() => {
      const canvas = renderCanvasRef.current
      const display = displayCanvasRef.current
      if (!canvas || !display) return
      renderEink(imgEl, canvas, { ...adj, filter: adj.filter.toLowerCase() })
      // Copy to display canvas
      const dctx = display.getContext('2d')!
      // Rotate 90° CW + letterbox with black fill to match epdRenderRotated()
      // Render canvas is 400×600 portrait (matches what the user sees on fridge).
      // Display canvas is 252×378 portrait — just scale it down, no rotation.
      dctx.fillStyle = '#000'
      dctx.fillRect(0, 0, display.width, display.height)
      dctx.drawImage(canvas, 0, 0, display.width, display.height)
      setStatus('ready')
    }, 250)
  }, [imgEl, adj])

  // ── Drag-to-pan ──────────────────────────────────────────
  function onPanStart(e: React.MouseEvent | React.TouchEvent) {
    if (!imgEl) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragRef.current = { active: true, startX: clientX, startY: clientY, panX: adj.panX, panY: adj.panY }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current.active) return
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
      const dx = (clientX - dragRef.current.startX) * 0.5
      const dy = (clientY - dragRef.current.startY) * 0.5
      const newPanX = Math.max(-100, Math.min(100, dragRef.current.panX + dx))
      const newPanY = Math.max(-100, Math.min(100, dragRef.current.panY + dy))
      setAdj(a => ({ ...a, panX: newPanX, panY: newPanY }))
    }
    const onUp = () => { dragRef.current.active = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  // ── Upload ───────────────────────────────────────────────
  async function handleUpload() {
    if (!file || !deviceId || status !== 'ready') return
    setStatus('uploading')
    // Server expects 600×400 LANDSCAPE (firmware rotates to portrait on device).
    // Render canvas is 400×600 portrait, so rotate 90° CCW before sending.
    const srcCanvas = renderCanvasRef.current!
    const uploadCanvas = document.createElement('canvas')
    uploadCanvas.width  = 600
    uploadCanvas.height = 400
    const uctx = uploadCanvas.getContext('2d')!
    uctx.save()
    uctx.translate(0, 400)
    uctx.rotate(-Math.PI / 2)
    // In rotated space: draw 400×600 portrait → fills rotated 600×400
    uctx.drawImage(srcCanvas, 0, 0, 600, 400)
    uctx.restore()
    const blob = await new Promise<Blob>(res => uploadCanvas.toBlob(b => res(b!), 'image/png'))
    const form = new FormData()
    form.append('file', blob, 'photo.png')
    form.append('device_id', deviceId)
    form.append('caption', caption)
    form.append('set_active', String(setActive))
    const res = await fetch('/api/photos/upload', { method: 'POST', body: form })
    if (res.ok) {
      setStatus('done')
      setTimeout(() => router.push('/dashboard'), 1800)
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Upload failed.')
      setStatus('error')
    }
  }

  // ── Slider component ─────────────────────────────────────
  function Slider({ label, k, min, max }: { label: string; k: keyof Adjustments; min: number; max: number }) {
    const val = adj[k] as number
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', width: 76, flexShrink: 0 }}>{label}</span>
        <input
          type="range" min={min} max={max} value={val}
          onChange={e => setAdj(a => ({ ...a, [k]: +e.target.value }))}
          style={{ flex: 1, appearance: 'none' as const, height: 2, background: 'var(--border)', outline: 'none', cursor: 'pointer' }}
        />
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--muted-lt)', width: 30, textAlign: 'right' }}>
          {val > 0 ? `+${val}` : val}
        </span>
      </div>
    )
  }

  const canSend = status === 'ready' && !!file && !!deviceId

  return (
    <>
      <Topbar
        breadcrumb="mem.ry"
        page="Upload"
        actions={<Link href="/dashboard" className="btn-sm-ghost">← Dashboard</Link>}
      />

      <div className="memry-upload-shell" style={{ display: 'grid', gridTemplateColumns: '400px 1fr', minHeight: 'calc(100vh - 52px)' }}>

        {/* ── LEFT — controls ── */}
        <div className="memry-upload-left" style={{ background: 'var(--paper)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Header */}
          <div style={{ padding: '28px 32px 24px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8 }}>002 — upload</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, fontWeight: 300, lineHeight: 0.95, letterSpacing: '-1px' }}>
              Send a mem<em style={{ fontStyle: 'italic' }}>o</em>ry
            </h2>
          </div>

          {/* Photo drop / chip */}
          <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Photo</div>
            {!file ? (
              <div
                onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                style={{ border: `1px dashed ${dragOver ? 'var(--rust)' : 'var(--border)'}`, background: dragOver ? '#FAF8F3' : 'var(--bg)', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer', position: 'relative', transition: 'all 0.15s' }}
              >
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                <div style={{ width: 40, height: 40, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.3" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>Drop photo here</span>
                <span style={{ fontSize: 11, color: 'var(--muted-lt)', fontWeight: 300 }}>JPG, PNG, HEIC — any size</span>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', background: 'var(--bg)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {previewUrl && <img src={previewUrl} alt="" style={{ width: 44, height: 44, objectFit: 'cover', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--muted-lt)', marginTop: 2 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
                <button onClick={clearFile} style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-lt)', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>Remove</button>
              </div>
            )}
          </div>

          {/* Crop & position — only when file loaded */}
          {imgEl && (
            <>
              <div style={{ padding: '18px 32px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  Crop &amp; position
                  <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
                </div>
                <Slider label="Zoom"     k="zoom"     min={50}   max={300} />
                <Slider label="X offset" k="panX"     min={-100} max={100} />
                <Slider label="Y offset" k="panY"     min={-100} max={100} />
                <p style={{ fontSize: 10, color: 'var(--muted-lt)', fontWeight: 300, marginTop: 4 }}>
                  Or drag the image in the preview →
                </p>
              </div>

              <div style={{ padding: '18px 32px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  Adjustments
                  <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
                </div>
                <Slider label="Brightness" k="brightness" min={-80} max={80} />
                <Slider label="Contrast"   k="contrast"   min={-80} max={80} />
                <Slider label="Saturation" k="saturation" min={-100} max={100} />
                <Slider label="Warmth"     k="warmth"     min={-50} max={50} />
              </div>

              <div style={{ padding: '18px 32px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  E-ink style
                  <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {FILTERS.map(f => (
                    <button
                      key={f}
                      onClick={() => setAdj(a => ({ ...a, filter: f }))}
                      style={{
                        fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
                        padding: '6px 10px', border: '1px solid var(--border)',
                        background: adj.filter === f ? 'var(--ink)' : 'transparent',
                        color: adj.filter === f ? 'var(--paper)' : 'var(--muted)',
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}
                    >{f}</button>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: 'var(--muted-lt)', fontWeight: 300, marginTop: 10 }}>
                  Filters affect how colours map to the 6-colour e-ink palette.
                </p>
              </div>
            </>
          )}

          {/* Device */}
          <div style={{ padding: '18px 32px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              Send to device
              <span style={{ flex: 1, height: 1, background: 'var(--border)', display: 'block' }} />
            </div>
            {devices.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted-lt)', fontWeight: 300 }}>Loading devices…</div>
            ) : devices.map(dev => (
              <label key={dev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: `1px solid ${deviceId === dev.id ? 'var(--ink)' : 'var(--border)'}`, background: deviceId === dev.id ? 'var(--bg)' : 'var(--paper)', cursor: 'pointer', transition: 'all 0.12s', marginBottom: 6 }}>
                <input type="radio" name="device" value={dev.id} checked={deviceId === dev.id} onChange={() => setDeviceId(dev.id)} style={{ accentColor: 'var(--rust)', width: 13, height: 13 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{dev.name}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: 'var(--muted-lt)', marginTop: 1 }}>{dev.id}</div>
                </div>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 20, background: dev.status === 'online' ? '#EDFAEA' : '#F5F0E8', color: dev.status === 'online' ? '#3D6B43' : '#6B6159' }}>
                  {dev.status}
                </span>
              </label>
            ))}
          </div>

          {/* Caption */}
          <div style={{ padding: '18px 32px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
              Caption <span style={{ color: 'var(--muted-lt)', fontFamily: 'Space Grotesk', letterSpacing: 0, textTransform: 'none', fontSize: 10 }}>— optional</span>
            </div>
            <textarea
              rows={2}
              placeholder="A memory worth keeping…"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--ink)', outline: 'none', resize: 'none', lineHeight: 1.5, borderRadius: 0 }}
            />
          </div>

          {/* Set active toggle */}
          <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div
                onClick={() => setSetActive(v => !v)}
                style={{ position: 'relative', width: 36, height: 20, flexShrink: 0, cursor: 'pointer' }}
              >
                <div style={{ position: 'absolute', inset: 0, background: setActive ? 'var(--rust)' : 'var(--border)', borderRadius: 20, transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', height: 14, width: 14, left: setActive ? 19 : 3, bottom: 3, background: 'var(--paper)', borderRadius: '50%', transition: 'left 0.2s' }} />
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>Set as active photo immediately</span>
            </label>
          </div>

          {error && (
            <div style={{ margin: '0 32px 0', padding: '12px 14px', background: '#FAF0EE', borderLeft: '3px solid var(--rust)', fontSize: 12, color: '#7A2E1E' }}>{error}</div>
          )}

          {/* Footer */}
          <div style={{ padding: '16px 32px', marginTop: 'auto', display: 'flex', gap: 10 }}>
            <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '12px 20px' }}>Cancel</button>
            <button
              onClick={handleUpload}
              disabled={!canSend}
              className="btn-dark"
              style={{ flex: 1, opacity: canSend ? 1 : 0.35 }}
            >
              {status === 'uploading' ? 'Sending…' : status === 'done' ? 'Sent ✓' : 'Send to fridge →'}
            </button>
          </div>
        </div>

        {/* ── RIGHT — live Polaroid preview ── */}
        <div className="memry-upload-right" style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', position: 'relative', overflow: 'hidden' }}>
          {/* Grid bg */}
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent,transparent 39px,var(--border) 39px,var(--border) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,var(--border) 40px,var(--border) 41px)', opacity: 0.28, pointerEvents: 'none' }} />

          {/* Hidden render canvas at full EPD res */}
          <canvas ref={renderCanvasRef} width={400} height={600} style={{ display: 'none' }} />

          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 28, position: 'relative', zIndex: 1 }}>
            Live e-ink preview
          </div>

          {/* Polaroid */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="memry-polaroid" style={{ background: 'var(--paper)', padding: '14px 14px 60px', width: 280, boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 0 1px #E0D8CC, 0 6px 0 1px #D4CCC0, 0 28px 72px rgba(0,0,0,0.13)' }}>

              {/* Image area — draggable */}
              <div
                className="memry-pol-image" style={{ width: 252, height: 378, background: '#000', position: 'relative', overflow: 'hidden', cursor: imgEl ? 'move' : 'default' }}
                onMouseDown={onPanStart}
                onTouchStart={onPanStart}
              >
                {/* Dot texture overlay */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '10px 10px', zIndex: 2, pointerEvents: 'none' }} />

                {/* Display canvas */}
                <canvas
                  ref={displayCanvasRef}
                  width={252}
                  height={378}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
                />

                {/* Placeholder */}
                {!imgEl && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 3 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(184,74,42,0.2)" strokeWidth="1" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(107,97,89,0.35)' }}>awaiting photo</span>
                  </div>
                )}

                {/* Drag hint */}
                {imgEl && (
                  <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 6, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(26,20,12,0.25)', zIndex: 4, pointerEvents: 'none' }}>
                    drag to reposition
                  </div>
                )}
              </div>

              {/* Strip */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)' }}>
                  {selectedDevice?.id ?? 'memry-???'}
                </span>
                <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--sand)' }}>Mem.ry</span>
              </div>
            </div>

            {/* Caption */}
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 8, minHeight: 18 }}>
              {caption || selectedDevice?.name || ''}
            </div>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 20, position: 'relative', zIndex: 1, minHeight: 20 }}>
            {status === 'processing' && (
              <>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sand)', animation: 'blink 1s ease-in-out infinite' }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--sand)' }}>Quantising…</span>
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

          {/* Palette */}
          <div style={{ display: 'flex', gap: 4, marginTop: 16, alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)', marginRight: 6 }}>Spectra 6</span>
            {PALETTE_HEX.map((hex, i) => (
              <div key={i} title={PALETTE_NAMES[i]} style={{ width: 12, height: 12, background: hex, border: '1px solid rgba(0,0,0,0.1)' }} />
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blink { 0%,100%{opacity:0.2} 50%{opacity:1} }
        input[type=range] { -webkit-appearance: none; appearance: none; height: 2px; outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: var(--ink); border-radius: 50%; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb:hover { background: var(--rust); }
      ` }} />
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
