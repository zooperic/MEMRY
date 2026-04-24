import { CSSProperties } from 'react'

interface PolaroidProps {
  /** URL for the preview image (optional — shows placeholder if absent) */
  previewUrl?: string | null
  /** Caption shown in the white strip */
  caption?: string | null
  /** Device ID shown small in the strip */
  deviceId?: string
  /** Width of the frame in px (height auto-proportioned) */
  width?: number
  /** Highlight with rust border when this photo is active */
  isActive?: boolean
  /** Rotation in degrees (for decorative stacking) */
  rotate?: number
  className?: string
  style?: CSSProperties
  children?: React.ReactNode
}

export default function Polaroid({
  previewUrl,
  caption,
  deviceId,
  width = 200,
  isActive = false,
  rotate = 0,
  style,
  children,
}: PolaroidProps) {
  const imgSize   = width - 20          // 10px padding each side
  const stripH    = Math.round(width * 0.24)
  const totalH    = imgSize + stripH + 20 // 10px top + 10px between img/strip

  return (
    <div style={{
      background: 'var(--paper)',
      padding: `10px 10px 0`,
      width,
      height: totalH,
      position: 'relative',
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
      boxShadow: isActive
        ? '0 0 0 2px var(--rust), 0 2px 0 2px #E0D8CC, 0 16px 40px rgba(0,0,0,0.14)'
        : '0 0 0 1px rgba(0,0,0,0.06), 0 2px 0 1px #E0D8CC, 0 3px 0 1px #D4CCC0, 0 16px 40px rgba(0,0,0,0.1)',
      ...style,
    }}>
      {/* Image area */}
      <div style={{
        width: imgSize, height: imgSize,
        background: 'var(--bg)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Dot texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(184,74,42,0.07) 1px, transparent 1px)',
          backgroundSize: '10px 10px',
          pointerEvents: 'none',
        }} />

        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={caption ?? 'Memory'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
          />
        ) : (
          <svg
            width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="rgba(184,74,42,0.2)" strokeWidth="1" strokeLinecap="round"
            style={{ position: 'relative', zIndex: 1 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="1" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}

        {children}
      </div>

      {/* White strip */}
      <div style={{
        height: stripH,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 8px',
      }}>
        {deviceId && (
          <div style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'var(--muted-lt)',
          }}>
            {deviceId}
          </div>
        )}
        {caption && (
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontStyle: 'italic', fontSize: 12,
            color: 'var(--muted)', lineHeight: 1.1,
            marginTop: deviceId ? 2 : 0,
          }}>
            {caption}
          </div>
        )}
        {!deviceId && !caption && (
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontStyle: 'italic', fontSize: 11,
            color: 'var(--sand)',
            textAlign: 'right',
          }}>
            Mem.ry
          </div>
        )}
      </div>

      {/* Active badge */}
      {isActive && (
        <div style={{
          position: 'absolute', top: 8, left: 8,
          fontFamily: 'DM Mono, monospace',
          fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '3px 7px',
          background: 'var(--rust)', color: 'var(--paper)',
          zIndex: 2,
        }}>
          ● Active
        </div>
      )}
    </div>
  )
}
