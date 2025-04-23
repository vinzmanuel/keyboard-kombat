// src/pages/CreateRoom.jsx

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Copy, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { generateRoomCode } from "@/lib/utils"
// import { initializeSocket } from "@/lib/socket"

export default function CreateRoom() {
    const navigate = useNavigate()
    const [roomCode, setRoomCode] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [isCopied, setIsCopied] = useState(false)

    useEffect(() => {
        setRoomCode(generateRoomCode())
    }, [])

    const handleCreateRoom = async () => {
        setIsCreating(true)

        try {
        // const socket = await initializeSocket()

        // socket.emit("create_room", { roomCode })

        // socket.on("room_created", () => {
        //   navigate(`/game/${roomCode}`)
        // })

        // For testing without socket:
        navigate(`/game/${roomCode}`)
        } catch (error) {
        console.error("Failed to create room:", error)
        setIsCreating(false)
        }
    }

    const copyRoomCode = () => {
        navigator.clipboard.writeText(roomCode)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-900 to-black p-4">
        <Card className="w-full max-w-md bg-zinc-800/50 border-zinc-700 text-white">
            <CardHeader>
            <CardTitle className="text-2xl text-emerald-400">Create a New Room</CardTitle>
            <CardDescription className="text-zinc-400">
                Share the room code with a friend to start a typing duel
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="bg-zinc-900 p-4 rounded-md flex items-center justify-between">
                <span className="text-xl font-mono tracking-wider">{roomCode}</span>
                <Button
                variant="ghost"
                size="sm"
                onClick={copyRoomCode}
                className="text-zinc-400 hover:text-white hover:bg-zinc-700"
                >
                <Copy className="h-4 w-4 mr-1" />
                {isCopied ? "Copied!" : "Copy"}
                </Button>
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
                onClick={handleCreateRoom}
                disabled={isCreating}
            >
                {isCreating ? "Creating..." : "Create & Join Room"}
            </Button>
            </CardFooter>
        </Card>
        </div>
    )
}