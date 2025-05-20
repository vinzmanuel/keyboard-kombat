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
      <body className="relative min-h-screen bg-black overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed top-0 left-0 w-full h-full object-cover z-0 pointer-events-none"
          src="/KKBG.mp4"
        />
        {/* Centered Content */}
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          {children}
        </div>
      </body>
    </html>
  )
}
