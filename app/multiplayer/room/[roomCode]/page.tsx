"use client"
import { useParams, useSearchParams } from "next/navigation"
import WaitingRoom from "../../../../components/waiting-room"
import { useEffect } from "react"
import { useSocket } from "../../../../lib/socket"

export default function RoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const socket = useSocket()
  const roomCode = params.roomCode as string
  const type = searchParams.get("type") || "words"
  const language = searchParams.get("language") || "JavaScript"

  // Add debug logging
  useEffect(() => {
    console.log("Room page loaded, socket status:", socket ? "connected" : "not connected")
  }, [socket])

  return <WaitingRoom roomCode={roomCode} textType={type} language={language} />
}
