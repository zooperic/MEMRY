import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MEMRY — A digital showroom for memories',
  description: 'WiFi e-ink fridge magnet. Put a photo on the fridge, keep it there.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Space+Grotesk:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
