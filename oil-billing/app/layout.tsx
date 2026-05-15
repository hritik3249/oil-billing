import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Oil Billing System',
  description: 'Professional oil business billing & management',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-amber-50 min-h-screen">{children}</body>
    </html>
  )
}
