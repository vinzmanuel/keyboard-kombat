"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import ModeSelector from "./ui/mode-selector"
import RetroButton from "./ui/retro-button"
import RetroContainer from "./ui/retro-container"
import RetroTitle from "./ui/retro-title"
import RoomCodeDisplay from "./ui/room-code-display"
import { useSocket } from "../lib/socket"

export default function MultiplayerCreate() {
  const router = useRouter()
  const socket = useSocket()
  const [textType, setTextType] = useState("words")
  const [language, setLanguage] = useState("JavaScript")
  const [roomCode, setRoomCode] = useState<string>("")
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate a random room code
  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // Generate room code only on client to avoid hydration error
  useEffect(() => {
    if (!roomCode) {
      setRoomCode(generateRoomCode())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initialize socket connection and events
  useEffect(() => {
    if (!socket) return

    // Socket event handlers
    const onRoomCreated = ({ roomCode }: { roomCode: string }) => {
      setCreatingRoom(false)
      console.log(`Room created with code: ${roomCode}`)
    }

    const onPlayerJoined = ({ players }: { players: any[] }) => {
      console.log("Players in room:", players)
    }

    // Register event listeners
    socket.on('roomCreated', onRoomCreated)
    socket.on('playerJoined', onPlayerJoined)
    socket.on('error', (err: any) => {
      setError(err.message || 'Unknown error occurred')
      setCreatingRoom(false)
    })

    // Cleanup event listeners
    return () => {
      socket.off('roomCreated', onRoomCreated)
      socket.off('playerJoined', onPlayerJoined)
      socket.off('error')
    }
  }, [socket])

  // Handle mode change
  const handleModeChange = useCallback((mode: string) => {
    setTextType(mode)
  }, [])

  // Handle language change
  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang)
  }, [])

  // Start the battle
  const handleStartBattle = () => {
    if (!socket) {
      setError("Unable to connect to server")
      return
    }
    if (!roomCode) {
      setError("Room code not ready yet")
      return
    }
    setCreatingRoom(true)
    setError(null)

    // Create room on the server
    socket.emit('createRoom', {
      roomCode,
      settings: {
        type: textType,
        language: language
      }
    })

    router.push(`/multiplayer/room/${roomCode}?type=${textType}&language=${language}`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 flex items-center justify-center">
      <RetroContainer className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <RetroButton onClick={() => router.push("/")} color="blue" size="md" className="mr-4">
              <ArrowLeft size={20} className="mr-2" /> BACK
            </RetroButton>
            <RetroTitle size="md">CREATE BATTLE</RetroTitle>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-8">
            <div className="p-6 border-4 border-yellow-500 bg-gray-800 rounded-lg">
              <h3 className="text-2xl font-bold text-yellow-400 mb-6">BATTLE SETTINGS</h3>

              <ModeSelector
                selectedMode={textType}
                onModeChange={handleModeChange}
                selectedLanguage={language}
                onLanguageChange={handleLanguageChange}
              />
            </div>

            <div className="p-6 border-4 border-green-500 bg-gray-800 rounded-lg">
              <h3 className="text-2xl font-bold text-green-400 mb-6">ROOM INFORMATION</h3>

              <div className="flex flex-col items-center">
                {roomCode ? (
                  <RoomCodeDisplay roomCode={roomCode} />
                ) : (
                  <div className="bg-gray-800 border-4 border-yellow-500 px-6 py-3 rounded-md font-mono text-3xl text-yellow-400 tracking-widest opacity-50 select-none">
                    ------
                  </div>
                )}

                <div className="mt-6 text-center text-lg text-gray-400">
                  Share this code with your opponent to join the battle
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between p-6 border-4 border-blue-500 bg-gray-800 rounded-lg">
            <div>
              <h3 className="text-2xl font-bold text-blue-400 mb-6">BATTLE INSTRUCTIONS</h3>

              <ul className="space-y-4 text-gray-300 text-lg">
                <li className="flex items-start">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-center mr-3 flex-shrink-0 flex items-center justify-center">
                    1
                  </span>
                  Choose the mode you wish to crush your opponents on
                </li>
                <li className="flex items-start">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-center mr-3 flex-shrink-0 flex items-center justify-center">
                    2
                  </span>
                  Press the button to create a room
                </li>
                <li className="flex items-start">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-center mr-3 flex-shrink-0 flex items-center justify-center">
                    3
                  </span>
                  Share your room code with your opponent
                </li>
                <li className="flex items-start">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-center mr-3 flex-shrink-0 flex items-center justify-center">
                    4
                  </span>
                  Wait for them to join your room
                </li>
                <li className="flex items-start">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-center mr-3 flex-shrink-0 flex items-center justify-center">
                    5
                  </span>
                  Type faster and more accurately to deal damage
                </li>
                <li className="flex items-start">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-center mr-3 flex-shrink-0 flex items-center justify-center">
                    6
                  </span>
                  Reduce your opponent's health to zero to win
                </li>
              </ul>
            </div>

            {error && (
              <div className="mt-6 p-3 bg-red-900 border-2 border-red-500 text-red-200 rounded-md">
                <p className="text-center">{error}</p>
              </div>
            )}

            <RetroButton 
              onClick={handleStartBattle} 
              color="green" 
              size="lg" 
              className="mt-8"
              disabled={creatingRoom}
            >
              {creatingRoom ? "CONNECTING..." : "START BATTLE"}
            </RetroButton>
          </div>
        </div>
      </RetroContainer>
    </div>
  )
}
