"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users } from "lucide-react"
import RetroButton from "./ui/retro-button"
import RetroContainer from "./ui/retro-container"
import RetroTitle from "./ui/retro-title"
import { useSocket } from "../lib/socket"

export default function MultiplayerJoin() {
  const router = useRouter()
  const socket = useSocket()
  const [roomCode, setRoomCode] = useState("")
  const [error, setError] = useState("")
  const [joining, setJoining] = useState(false)
  const [playerName, setPlayerName] = useState("Player 2") // Default name for joining player

  // Setup socket event listeners
  useEffect(() => {
    if (!socket) return

    // Handle successful room join
    const onRoomJoined = ({ roomCode, settings }: { roomCode: string; settings: any }) => {
      setJoining(false)
      console.log(`Joined room ${roomCode} with settings:`, settings)
      
      // Save the player name for future use
      if (playerName) {
        localStorage.setItem('playerName', playerName)
      }
      
      router.push(`/multiplayer/room/${roomCode}`)
    }

    // Handle room errors
    const onRoomError = ({ error }: { error: string }) => {
      console.error("Room error when joining:", error)
      setError(error)
      setJoining(false)
    }

    // Register event listeners
    socket.on('roomJoined', onRoomJoined)
    socket.on('roomError', onRoomError)

    // Cleanup event listeners
    return () => {
      socket.off('roomJoined', onRoomJoined)
      socket.off('roomError', onRoomError)
    }
  }, [socket, router])

  const handleJoinRoom = () => {
    if (!socket) {
      setError("Unable to connect to server")
      return
    }
    
    if (!roomCode.trim()) {
      setError("Please enter a room code")
      return
    }

    setJoining(true)
    setError("")
    
    // Format room code (uppercase, trim spaces)
    const formattedRoomCode = roomCode.toUpperCase().trim()

    console.log(`Attempting to join room: ${formattedRoomCode}`)
    
    // Save player name for reconnection scenarios
    if (playerName) {
      localStorage.setItem('playerName', playerName)
    }

    // Emit join room event to server
    socket.emit('joinRoom', {
      roomCode: formattedRoomCode,
      playerName
    })
    
    // Set a timeout to show an error if joining takes too long
    setTimeout(() => {
      if (joining) {
        setJoining(false)
        setError("Connection timeout. Please try again.")
      }
    }, 10000)
  }

  return (
    <div className="min-h-screen text-white p-4 flex items-center justify-center">
      <RetroContainer className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <RetroButton onClick={() => router.push("/")} color="blue" size="md" className="mr-4">
              <ArrowLeft size={20} className="mr-2" /> BACK
            </RetroButton>
            <img
              src="/JOIN_BATTLE.png"
              alt="KEYBOARD KOMBAT"
              className=" h-[80px] -mb-5 -mt-5 -ml-12 object-contain drop-shadow-[0_3px_3px_rgba(0,0,255,0.8)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="p-6 border-4 border-blue-500 bg-gray-800 rounded-lg">
            <h3 className="text-2xl font-bold text-blue-400 mb-6">ENTER ROOM CODE</h3>

            <div className="space-y-6">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase())
                  setError("")
                }}
                placeholder="ENTER CODE"
                maxLength={6}
                className="w-full bg-gray-900 border-4 border-blue-500 rounded-md px-4 py-4 text-center text-3xl font-mono tracking-widest text-blue-300 placeholder-blue-900"
                disabled={joining}
              />

              {error && <div className="text-red-500 text-lg">{error}</div>}

              <RetroButton 
                onClick={handleJoinRoom} 
                color="green" 
                size="lg" 
                className="w-full mt-6"
                disabled={joining}
              >
                <Users className="mr-3" size={24} />
                {joining ? "JOINING..." : "JOIN BATTLE"}
              </RetroButton>
            </div>
          </div>

          <div className="p-6 border-4 border-purple-500 bg-gray-800 rounded-lg">
            <h3 className="text-2xl font-bold text-purple-400 mb-6">HOW TO JOIN</h3>

            <ul className="space-y-4 text-gray-300 text-lg">
              <li className="flex items-start">
                <span className="inline-block w-8 h-8 rounded-full bg-purple-600 text-white text-center mr-3 flex-shrink-0 flex items-center justify-center">
                  1
                </span>
                Ask your opponent for their room code
              </li>
              <li className="flex items-start">
                <span className="inline-block w-8 h-8 rounded-full bg-purple-600 text-white text-center mr-3 flex-shrink-0 flex items-center justify-center">
                  2
                </span>
                Enter the 6-character code in the field
              </li>
              <li className="flex items-start">
                <span className="inline-block w-8 h-8 rounded-full bg-purple-600 text-white text-center mr-3 flex-shrink-0 flex items-center justify-center">
                  3
                </span>
                Click "JOIN BATTLE" to enter the room
              </li>
              <li className="flex items-start">
                <span className="inline-block w-8 h-8 rounded-full bg-purple-600 text-white text-center mr-3 flex-shrink-0 flex items-center justify-center">
                  4
                </span>
                Prepare to type faster than your opponent!
              </li>
            </ul>

            <div className="mt-8 p-4 bg-purple-900/50 border-2 border-purple-700 rounded-md">
              <div className="text-lg text-purple-300">
                <span className="font-bold">TIP:</span> Room codes are not case sensitive
              </div>
            </div>
          </div>
        </div>
      </RetroContainer>
    </div>
  )
} 