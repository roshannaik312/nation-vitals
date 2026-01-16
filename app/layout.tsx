import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'NationVitals | County Intelligence for the Fentanyl Crisis',
  description: 'County-level overdose and community safety insights with federal election context (2018-2023).',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href='https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css' rel='stylesheet' />
      </head>
      <body>
        <header className="border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>NationVitals</span>
              <span className="text-xs uppercase tracking-wider px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                Presidential AI Challenge
              </span>
            </div>
            <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <Link href="/" className="hover:underline">Dashboard</Link>
              <Link href="/current_model" className="hover:underline">Current Model</Link>
              <Link href="/AI-models" className="hover:underline">AI Models Report</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
