"use client"

import { Copy } from "lucide-react"
import { useState } from "react"

interface RoomCodeDisplayProps {
  roomCode: string
}

export default function RoomCodeDisplay({ roomCode }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-lg text-gray-400 mb-2">ROOM CODE</div>
      <div className="flex items-center gap-3">
        <div className="bg-gray-800 border-4 border-yellow-500 px-6 py-3 rounded-md font-mono text-3xl text-yellow-400 tracking-widest">
          {roomCode}
        </div>
        <button
          onClick={handleCopy}
          className="p-3 bg-gray-800 border-4 border-yellow-500 rounded-md text-yellow-400 hover:bg-gray-700 transition-colors"
        >
          <Copy size={24} />
        </button>
      </div>
      {copied && <div className="text-green-400 text-lg mt-2 animate-fadeIn">Copied to clipboard!</div>}
    </div>
  )
}
