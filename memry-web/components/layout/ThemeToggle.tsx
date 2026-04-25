'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('memry-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved ? saved === 'dark' : prefersDark
    setDark(isDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('memry-theme', next ? 'dark' : 'light')
  }

  const borderCol = variant === 'dark' ? 'rgba(255,255,255,0.1)'  : 'var(--border)'
  const iconCol   = variant === 'dark' ? 'rgba(255,255,255,0.5)'  : 'var(--muted)'
  const hoverBorder = variant === 'dark' ? 'rgba(255,255,255,0.3)' : 'var(--muted)'

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28,
        background: 'none',
        border: `1px solid ${borderCol}`,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = hoverBorder)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = borderCol)}
    >
      {dark ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={iconCol} strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={iconCol} strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      )}
    </button>
  )
}
