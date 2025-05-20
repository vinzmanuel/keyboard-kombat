import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Keyboard Kombat',
  icons: {
    icon: '/kk-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Detect if we are in the battle screen route
  const isClient = typeof window !== 'undefined';
  let isBattleScreen = false;
  if (isClient) {
    // Check if the current path includes '/multiplayer/battle'
    isBattleScreen = window.location.pathname.startsWith('/multiplayer/battle');
  }

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
          src={isBattleScreen ? "/kkburn_2_2.mp4" : "/KKBG_2_2_2.mp4"}
        />
        {/* Centered Content */}
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          {children}
        </div>
      </body>
    </html>
  )
}
