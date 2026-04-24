'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Dashboard',     href: '/dashboard',              icon: GridIcon },
  { label: 'My Devices',    href: '/dashboard/devices',      icon: MonitorIcon },
  { label: 'Photo Library', href: '/dashboard/library',      icon: ImageIcon },
]
const NAV_BOTTOM = [
  { label: 'Contributors',  href: '/dashboard/contributors', icon: UsersIcon },
  { label: 'Settings',      href: '/dashboard/settings',     icon: SettingsIcon },
]

interface SidebarProps { userName?: string; userInitial?: string }

export default function Sidebar({ userName = 'You', userInitial = 'A' }: SidebarProps) {
  const path = usePathname()
  const isActive = (href: string) =>
    href === '/dashboard' ? path === href : path.startsWith(href)

  return (
    <aside style={{ width: 220, flexShrink: 0, background: 'var(--dark)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, borderRight: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: 72, height: 20, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', marginBottom: 20 }}>
          [ logo ]
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--rust)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 13, fontWeight: 600, color: 'var(--paper)', flexShrink: 0 }}>
            {userInitial}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--paper)' }}>{userName}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginTop: 1 }}>Owner</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
        <NavLabel>Main</NavLabel>
        {NAV.map(item => <NavItem key={item.href} {...item} active={isActive(item.href)} />)}
        <NavLabel>Manage</NavLabel>
        {NAV_BOTTOM.map(item => <NavItem key={item.href} {...item} active={isActive(item.href)} />)}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <form action="/auth/signout" method="POST">
          <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', width: '100%', fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', transition: 'color 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            <SignOutIcon /> Sign out
          </button>
        </form>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.1)', marginTop: 8 }}>
          mem.ry · v1.0 · Pune
        </div>
      </div>
    </aside>
  )
}

function NavLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 7, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)', padding: '0 20px', margin: '12px 0 4px' }}>{children}</div>
}

function NavItem({ href, icon: Icon, active, label }: { href: string; icon: () => JSX.Element; active: boolean; label: string }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 20px', fontSize: 11, color: active ? 'var(--paper)' : 'rgba(255,255,255,0.38)', borderLeft: active ? '2px solid var(--rust)' : '2px solid transparent', background: active ? 'rgba(255,255,255,0.04)' : 'transparent', textDecoration: 'none', transition: 'all 0.12s' }}>
      <Icon />
      {label}
    </Link>
  )
}

// Inline SVG icons — no external dependency
function GridIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }
function MonitorIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> }
function ImageIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> }
function UsersIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> }
function SettingsIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg> }
function SignOutIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg> }
