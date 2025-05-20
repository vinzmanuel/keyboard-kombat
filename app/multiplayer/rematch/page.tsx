"use client"

import { useSearchParams } from "next/navigation"
import RematchWaitingRoom from "@/components/rematch-waiting-room"

export default function RematchPage() {
  const searchParams = useSearchParams()
  const roomCode = searchParams.get("roomCode") || ""
  const textType = searchParams.get("type") || "words"
  const language = searchParams.get("language") || "JavaScript"

  return (
    <RematchWaitingRoom 
      roomCode={roomCode} 
      textType={textType as string} 
      language={language as string} 
    />
  )
} 