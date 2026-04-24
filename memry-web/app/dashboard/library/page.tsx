'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'

interface Photo {
  id: string
  device_id: string
  caption: string | null
  is_active: boolean
  preview_path: string
  created_at: string
  uploaded_by: string
}

interface Device {
  id: string
  name: string
}

function formatAge(ts: string) {
  const d = (Date.now() - new Date(ts).getTime()) / 86400000
  if (d < 1) return 'Today'
  if (d < 2) return 'Yesterday'
  if (d < 7) return `${Math.floor(d)}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

function LibraryInner() {
  const searchParams = useSearchParams()
  const deviceFilter = searchParams.get('device') ?? 'all'

  const [photos,      setPhotos]      = useState<Photo[]>([])
  const [devices,     setDevices]     = useState<Device[]>([])
  const [activeTab,   setActiveTab]   = useState(deviceFilter)
  const [sort,        setSort]        = useState<'newest'|'oldest'>('newest')
  const [loading,     setLoading]     = useState(true)
  const [hoveredId,   setHoveredId]   = useState<string | null>(null)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)

  const supabase = createBrowserClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: devs } = await supabase
      .from('devices')
      .select('id, name')
      .order('created_at')

    setDevices(devs ?? [])

    let q = supabase
      .from('photos')
      .select('id, device_id, caption, is_active, preview_path, created_at, uploaded_by')
      .order('created_at', { ascending: sort === 'oldest' })

    if (activeTab !== 'all') {
      q = q.eq('device_id', activeTab)
    }

    const { data } = await q
    setPhotos(data ?? [])
    setLoading(false)
  }, [activeTab, sort]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  async function setActive(photo: Photo) {
    // Optimistic update
    setPhotos(prev => prev.map(p =>
      p.device_id === photo.device_id
        ? { ...p, is_active: p.id === photo.id }
        : p
    ))
    // Deactivate all in device, then activate this one
    await supabase
      .from('photos')
      .update({ is_active: false })
      .eq('device_id', photo.device_id)

    await supabase
      .from('photos')
      .update({ is_active: true })
      .eq('id', photo.id)
  }

  async function deletePhoto(photo: Photo) {
    setDeletingId(photo.id)
    // Remove from UI immediately
    setPhotos(prev => prev.filter(p => p.id !== photo.id))

    await supabase.from('photos').delete().eq('id', photo.id)
    // Note: storage cleanup handled by a Supabase trigger or Edge Function
    setDeletingId(null)
  }

  const displayed = photos.filter(p =>
    activeTab === 'all' || p.device_id === activeTab
  )

  const deviceName = (id: string) =>
    devices.find(d => d.id === id)?.name ?? id

  return (
    <>
      <Topbar
        breadcrumb="mem.ry"
        page="Photo Library"
        actions={
          <>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as 'newest' | 'oldest')}
              style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 12px', background: 'var(--paper)', border: '1px solid var(--border)', color: 'var(--muted)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <Link href="/dashboard/upload" className="btn-sm-dark">↑ Upload photo</Link>
          </>
        }
      />

      <div style={{ padding: '32px 40px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 6 }}>003 — library</div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 52, fontWeight: 300, lineHeight: 0.95, letterSpacing: '-1.5px' }}>
              Ph<em style={{ fontStyle: 'italic', color: 'var(--rust)' }}>ot</em>o<br />Library
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {displayed.length} photo{displayed.length !== 1 ? 's' : ''}
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-lt)', marginTop: 4 }}>
              {devices.length} device{devices.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Device filter tabs */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', background: 'var(--paper)', width: 'fit-content', marginBottom: 28 }}>
          {[{ id: 'all', name: 'All devices' }, ...devices].map((d, i) => (
            <button
              key={d.id}
              onClick={() => setActiveTab(d.id)}
              style={{
                fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '10px 20px',
                color: activeTab === d.id ? 'var(--ink)' : 'var(--muted)',
                background: activeTab === d.id ? 'var(--bg)' : 'none',
                border: 'none',
                borderRight: i < devices.length ? '1px solid var(--border)' : 'none',
                borderBottom: activeTab === d.id ? '2px solid var(--rust)' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 20 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--border)', height: 230, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
          </div>
        )}

        {/* Photo grid */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 20 }}>

            {displayed.map(photo => {
              const isHovered = hoveredId === photo.id
              const isDeleting = deletingId === photo.id

              return (
                <div
                  key={photo.id}
                  onMouseEnter={() => setHoveredId(photo.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    cursor: 'pointer', position: 'relative',
                    transform: isHovered && !isDeleting ? 'translateY(-3px)' : 'none',
                    opacity: isDeleting ? 0 : 1,
                    transition: 'transform 0.15s, opacity 0.25s',
                  }}
                >
                  {/* Polaroid frame */}
                  <div style={{
                    background: 'var(--paper)',
                    padding: '10px 10px 44px',
                    boxShadow: photo.is_active
                      ? '0 0 0 2px var(--rust), 0 2px 0 2px #E0D8CC, 0 10px 24px rgba(0,0,0,0.12)'
                      : '0 0 0 1px rgba(0,0,0,0.05), 0 2px 0 1px #E0D8CC, 0 10px 24px rgba(0,0,0,0.09)',
                    position: 'relative',
                  }}>

                    {/* Active badge */}
                    {photo.is_active && (
                      <div style={{ position: 'absolute', top: 8, left: 8, fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 7px', background: 'var(--rust)', color: 'var(--paper)', zIndex: 2 }}>
                        ● Active
                      </div>
                    )}

                    {/* Hover actions */}
                    {isHovered && (
                      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 3 }}>
                        {/* Set active */}
                        {!photo.is_active && (
                          <button
                            onClick={() => setActive(photo)}
                            title="Set as active"
                            style={{ width: 28, height: 28, background: 'var(--paper)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.12s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ink)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--paper)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        )}
                        {/* Delete */}
                        <button
                          onClick={() => deletePhoto(photo)}
                          title="Delete"
                          style={{ width: 28, height: 28, background: 'var(--paper)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.12s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--rust)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--rust)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--paper)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Photo */}
                    <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(184,74,42,0.07) 1px, transparent 1px)', backgroundSize: '9px 9px' }} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/preview/${photo.preview_path}`}
                        alt={photo.caption ?? ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>

                    {/* Strip */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 10px' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 6, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-lt)' }}>
                        {deviceName(photo.device_id)} · {formatAge(photo.created_at)}
                      </div>
                      {photo.caption && (
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 11, color: 'var(--muted)', lineHeight: 1.1, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {photo.caption}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Upload card */}
            <Link href="/dashboard/upload" style={{
              border: '1px dashed var(--border)',
              minHeight: 200,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, cursor: 'pointer', textDecoration: 'none',
              transition: 'border-color 0.15s, background 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'var(--paper)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div style={{ width: 36, height: 36, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Upload photo
              </div>
            </Link>

            {/* Empty state */}
            {displayed.length === 0 && !loading && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 40px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, fontWeight: 300, fontStyle: 'italic', color: 'var(--muted)', marginBottom: 16 }}>
                  N<em style={{ color: 'var(--rust)' }}>o</em> photos yet
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted-lt)', fontWeight: 300, marginBottom: 24 }}>
                  Upload your first photo to get it on the fridge.
                </p>
                <Link href="/dashboard/upload" className="btn-dark">↑ Upload first photo</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryInner />
    </Suspense>
  )
}
