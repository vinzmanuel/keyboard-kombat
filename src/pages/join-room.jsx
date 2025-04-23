// src/pages/JoinRoom.jsx

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
// import { initializeSocket } from "@/lib/socket"

export default function JoinRoom() {
    const navigate = useNavigate()
    const [roomCode, setRoomCode] = useState("")
    const [isJoining, setIsJoining] = useState(false)
    const [error, setError] = useState("")

    const handleJoinRoom = async () => {
        if (!roomCode || roomCode.length !== 6) {
            setError("Please enter a valid 6-character room code")
            return
        }

    setIsJoining(true)
    setError("")

    try {
      // const socket = await initializeSocket()

      // socket.emit("join_room", { roomCode })

      // socket.on("room_joined", () => {
      //   navigate(`/game/${roomCode}`)
      // })

      // socket.on("room_not_found", () => {
      //   setError("Room not found. Please check the code and try again.")
      //   setIsJoining(false)
      // })

      // socket.on("room_full", () => {
      //   setError("This room is already full.")
      //   setIsJoining(false)
      // })

      // For testing without socket:
    //navigate(`/game/${roomCode}`)
    navigate('/TypingTest')
        } catch (error) {
        console.error("Failed to join room:", error)
        setError("Failed to connect. Please try again.")
        setIsJoining(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-900 to-black p-4">
        <Card className="w-full max-w-md bg-zinc-800/50 border-zinc-700 text-white">
            <CardHeader>
            <CardTitle className="text-2xl text-emerald-400">Join a Room</CardTitle>
            <CardDescription className="text-zinc-400">
                Enter the 6-character room code to join a typing duel
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div>
                <Input
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 text-center text-xl font-mono tracking-wider"
                placeholder="XXXXXX"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                maxLength={6}
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3">
            <Button
                variant="outline"
                className="w-full sm:w-auto border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                onClick={() => navigate("/")}
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>
            <Button
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                onClick={handleJoinRoom}
                disabled={isJoining}
            >
                {isJoining ? "Joining..." : "Join Room"}
            </Button>
            </CardFooter>
        </Card>
        </div>
    )
}