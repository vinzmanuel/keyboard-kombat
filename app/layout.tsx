import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Keyboard Kombat'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="relative min-h-screen">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  )
}
