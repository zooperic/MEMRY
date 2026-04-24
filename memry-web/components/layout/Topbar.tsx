'use client'

interface TopbarProps {
  breadcrumb: string
  page: string
  actions?: React.ReactNode
}

export default function Topbar({ breadcrumb, page, actions }: TopbarProps) {
  return (
    <div style={{
      height: 52,
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px',
      background: 'var(--paper)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--muted)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {breadcrumb}
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ color: 'var(--ink)' }}>{page}</span>
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  )
}
