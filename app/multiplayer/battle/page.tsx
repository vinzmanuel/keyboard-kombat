"use client"

import { useSearchParams } from "next/navigation"
import BattleScreen from "@/components/battle-screen"

export default function BattlePage() {
  const searchParams = useSearchParams()
  const roomCode = searchParams.get("roomCode") || "UNKNOWN"
  const type = searchParams.get("type") || "words"
  const language = searchParams.get("language") || "JavaScript"

  return <BattleScreen roomCode={roomCode} textType={type} language={language} />
}
