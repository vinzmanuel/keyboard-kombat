"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Gamepad2, Swords, Trophy, Users } from "lucide-react"
import RetroButton from "./ui/retro-button"
import RetroContainer from "./ui/retro-container"
import RetroTitle from "./ui/retro-title"

export default function MainMenu() {
  const router = useRouter()
  const [showingCredits, setShowingCredits] = useState(false)

  // Hydration guard
  const [hasHydrated, setHasHydrated] = useState(false)
  useEffect(() => {
    setHasHydrated(true)
  }, [])

  // Retro loading screen state (client only after hydration)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(0)

  useEffect(() => {
    if (!hasHydrated) return
    // Only check sessionStorage after hydration
    if (!sessionStorage.getItem("mainMenuLoaded")) {
      setLoading(true)
    }
  }, [hasHydrated])

  useEffect(() => {
    if (loading) {
      progressRef.current = 0
      setProgress(0)
      let frame: number
      const animate = () => {
        if (progressRef.current < 100) {
          progressRef.current += Math.random() * 2 + 0.5 // Slower retro random fill
          if (progressRef.current > 100) progressRef.current = 100
          setProgress(progressRef.current)
          frame = requestAnimationFrame(animate)
        } else {
          setTimeout(() => {
            setLoading(false)
            sessionStorage.setItem("mainMenuLoaded", "true")
          }, 500)
        }
      }
      frame = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(frame)
    }
  }, [loading])

  const handlePracticeMode = () => {
    router.push("/practice")
  }

  const handleCreateRoom = () => {
    router.push("/multiplayer/create")
  }

  const handleJoinRoom = () => {
    router.push("/multiplayer/join")
  }

  // Wait for hydration and loading state to be determined before rendering anything
  if (!hasHydrated || (hasHydrated && !loading && !sessionStorage.getItem("mainMenuLoaded"))) {
    // Don't render anything until hydration is done AND we've checked sessionStorage/loading state
    return null
  }
  // Prevent main menu flash: only render loading screen or main menu after hydration
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center text-green-400 font-mono text-3xl animate-fadeIn">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-6">
            <span className="text-5xl tracking-widest animate-pulse">LOADING</span>
          </div>
          {/* Retro healthbar-style loading bar */}
          <div className="w-[400px] max-w-full h-10 bg-gray-800 border-4 border-gray-600 rounded-md overflow-hidden shadow-lg">
            <div
              className={`h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-200`}
              style={{ width: `${progress}%` }}
            >
              <div className="h-full w-full flex">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-full border-r-2 border-black/30 flex-1 last:border-r-0" />
                ))}
              </div>
            </div>
          </div>
          <div className="text-yellow-300 text-lg mt-6 tracking-widest animate-pulse">KEYBOARD KOMBAT</div>
          <div className="text-base text-gray-400 mt-2">A RETRO TYPING BATTLE EXPERIENCE</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white p-4 flex items-center justify-center">
  <RetroContainer className="w-full relative overflow-visible">
    <div className="text-center mb-10 relative flex flex-col items-center">
      {/* Overflowing logo image, adjusted to overflow more at the top */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-[125px] pointer-events-none select-none w-[980px] z-0" style={{ overflow: 'visible' }}>
        <img
          src="/KK-LOGO.png"
          alt="KEYBOARD KOMBAT"
          className="w-full h-auto drop-shadow-[0_4px_32px_rgba(0,0,255,0.4)]"
          style={{
            filter: 'drop-shadow(0 0 16px #3b82f6)',
            userSelect: 'none',
            paddingBottom: '12px', // Added padding-bottom to enhance overflow at bottom
          }}
          draggable="false"
        />
      </div>
      {/* Adjusted spacer to match new layout */}
      <div style={{ height: '56px' }} />
      <div className="text-yellow-400 text-2xl mt-4 animate-pulse relative z-10">PRESS START TO PLAY!</div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
      <RetroButton onClick={handleCreateRoom} color="red" size="lg" className="py-6">
        <Swords className="mr-3" size={24} />
        CREATE BATTLE
      </RetroButton>

      <RetroButton onClick={handleJoinRoom} color="blue" size="lg" className="py-6">
        <Users className="mr-3" size={24} />
        JOIN BATTLE
      </RetroButton>

      <RetroButton onClick={handlePracticeMode} color="green" size="lg" className="py-6">
        <Gamepad2 className="mr-3" size={24} />
        PRACTICE MODE
      </RetroButton>

      <RetroButton onClick={() => setShowingCredits(!showingCredits)} color="purple" size="lg" className="py-6">
        <Trophy className="mr-3" size={24} />
        {showingCredits ? "HIDE CREDITS" : "SHOW CREDITS"}
      </RetroButton>
    </div>

    {showingCredits && (
      <div className="border-4 border-purple-500 bg-purple-900 p-6 rounded-lg text-center animate-fadeIn mb-8">
        <h3 className="text-2xl text-purple-300 mb-3">KEYBOARD KOMBAT</h3>
        <p className="text-xl text-purple-200">A retro-styled typing battle game</p>
        <p className="text-xl text-purple-200 mt-3">© 2025 LOV STUDIOS</p>
        <p className="text-xl text-purple-200 mt-3">LIMOSNERO · OMBROSA · VALENZUELA</p>
      </div>
    )}

    <div className="text-center mt-8 text-base text-gray-500">
      <p>TYPE AS FAST AS POSSIBLE · DESTROY YOUR OPPONENTS</p>
      <p className="mt-2">CLOSED BETA TEST 1.0.0</p>
    </div>
  </RetroContainer>
</div>
  )
}