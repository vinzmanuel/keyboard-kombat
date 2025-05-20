"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, BarChart2, Repeat, Trophy } from "lucide-react"
import RetroButton from "./ui/retro-button"
import RetroContainer from "./ui/retro-container"
import RetroTitle from "./ui/retro-title"

interface ResultsScreenProps {
  roomCode: string
  winner: "player" | "opponent"
  playerStats: {
    wpm: number
    accuracy: number
    damageDealt: number
  }
  opponentStats: {
    wpm: number
    accuracy: number
    damageDealt: number
  }
  textType?: string
  language?: string
}

export default function ResultsScreen({ 
  roomCode, 
  winner, 
  playerStats, 
  opponentStats,
  textType = 'words',
  language = 'JavaScript'
}: ResultsScreenProps) {
  const router = useRouter()

  const handleRematch = () => {
    // Generate a new room code for the rematch
    const rematchRoomCode = generateRematchCode();
    
    // Use the passed-in textType and language
    const roomTextType = textType || 'words';
    const roomLanguage = language || 'JavaScript';
    
    // Store the rematch info in localStorage
    localStorage.setItem('rematch_info', JSON.stringify({
      originalRoomCode: roomCode,
      textType: roomTextType,
      language: roomLanguage,
      initiator: true // Mark as initiator from results screen
    }));
    
    // Navigate to rematch page
    router.push(`/multiplayer/rematch?roomCode=${rematchRoomCode}&type=${roomTextType}&language=${roomLanguage}`);
  }
  
  // Generate a rematch code based on the original with a suffix
  function generateRematchCode() {
    // Create a code that's related to the original but different
    const prefix = roomCode.substring(0, 4);
    const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${prefix}${suffix}`;
  }

  const handleMainMenu = () => {
    router.push("/")
  }

  // Determine the winner and loser styles
  const playerBoxStyle = winner === "player" 
    ? "border-green-500" 
    : "border-red-500";
  
  const opponentBoxStyle = winner === "opponent" 
    ? "border-green-500" 
    : "border-red-500";
  
  const playerTitleStyle = winner === "player" 
    ? "text-green-400" 
    : "text-red-400";
  
  const opponentTitleStyle = winner === "opponent" 
    ? "text-green-400" 
    : "text-red-400";
  
  const playerBarStyle = winner === "player" 
    ? "bg-green-500" 
    : "bg-red-500";
  
  const opponentBarStyle = winner === "opponent" 
    ? "bg-green-500" 
    : "bg-red-500";
  
  const playerValueStyle = winner === "player" 
    ? "text-green-400" 
    : "text-red-400";
  
  const opponentValueStyle = winner === "opponent" 
    ? "text-green-400" 
    : "text-red-400";

  return (
    <div className="min-h-screen text-white p-4 flex items-center justify-center">
      <RetroContainer className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <RetroButton onClick={handleMainMenu} color="blue" size="md" className="mr-4">
              <ArrowLeft size={20} className="mr-2" /> MAIN MENU
            </RetroButton>
            <RetroTitle size="md">BATTLE RESULTS</RetroTitle>
          </div>
          <div className="text-yellow-400 font-bold text-xl">ROOM: {roomCode}</div>
        </div>

        <div className="text-center mb-10">
          <div className="text-6xl font-bold mb-4">
            {winner === "player" ? (
              <span className="text-green-500">VICTORY!</span>
            ) : (
              <span className="text-red-500">DEFEAT!</span>
            )}
          </div>
          <div className="text-xl text-gray-400">
            {winner === "player"
              ? "Your fingers were faster! You are the Keyboard Kombat champion!"
              : "Your opponent was too quick! Train harder for the next battle!"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className={`p-6 border-4 ${playerBoxStyle} bg-gray-800 rounded-lg`}>
            <h3 className={`text-2xl font-bold ${playerTitleStyle} mb-6 flex items-center`}>
              {winner === "player" ? (
                <Trophy className="mr-3" size={24} />
              ) : (
                <BarChart2 className="mr-3" size={24} />
              )}
              YOUR STATS
            </h3>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xl text-gray-300">Typing Speed:</span>
                <span className={`text-3xl font-bold ${playerValueStyle}`}>{playerStats.wpm} WPM</span>
              </div>
              <div className="w-full bg-gray-700 h-3 rounded-full">
                <div
                  className={`${playerBarStyle} h-3 rounded-full`}
                  style={{ width: `${Math.min(100, playerStats.wpm / 2)}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <span className="text-xl text-gray-300">Accuracy:</span>
                <span className={`text-3xl font-bold ${playerValueStyle}`}>{playerStats.accuracy}%</span>
              </div>
              <div className="w-full bg-gray-700 h-3 rounded-full">
                <div className={`${playerBarStyle} h-3 rounded-full`} style={{ width: `${playerStats.accuracy}%` }}></div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <span className="text-xl text-gray-300">Damage Dealt:</span>
                <span className={`text-3xl font-bold ${playerValueStyle}`}>{playerStats.damageDealt} HP</span>
              </div>
              <div className="w-full bg-gray-700 h-3 rounded-full">
                <div className={`${playerBarStyle} h-3 rounded-full`} style={{ width: `${playerStats.damageDealt}%` }}></div>
              </div>
            </div>
          </div>

          <div className={`p-6 border-4 ${opponentBoxStyle} bg-gray-800 rounded-lg`}>
            <h3 className={`text-2xl font-bold ${opponentTitleStyle} mb-6 flex items-center`}>
              {winner === "opponent" ? (
                <Trophy className="mr-3" size={24} />
              ) : (
                <BarChart2 className="mr-3" size={24} />
              )}
              OPPONENT STATS
            </h3>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xl text-gray-300">Typing Speed:</span>
                <span className={`text-3xl font-bold ${opponentValueStyle}`}>{opponentStats.wpm} WPM</span>
              </div>
              <div className="w-full bg-gray-700 h-3 rounded-full">
                <div
                  className={`${opponentBarStyle} h-3 rounded-full`}
                  style={{ width: `${Math.min(100, opponentStats.wpm / 2)}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <span className="text-xl text-gray-300">Accuracy:</span>
                <span className={`text-3xl font-bold ${opponentValueStyle}`}>{opponentStats.accuracy}%</span>
              </div>
              <div className="w-full bg-gray-700 h-3 rounded-full">
                <div className={`${opponentBarStyle} h-3 rounded-full`} style={{ width: `${opponentStats.accuracy}%` }}></div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <span className="text-xl text-gray-300">Damage Dealt:</span>
                <span className={`text-3xl font-bold ${opponentValueStyle}`}>{opponentStats.damageDealt} HP</span>
              </div>
              <div className="w-full bg-gray-700 h-3 rounded-full">
                <div className={`${opponentBarStyle} h-3 rounded-full`} style={{ width: `${opponentStats.damageDealt}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center">
          <RetroButton onClick={handleRematch} color="green" size="lg">
            <Repeat className="mr-3" size={24} />
            REMATCH
          </RetroButton>
          <RetroButton onClick={handleMainMenu} color="blue" size="lg">
            <ArrowLeft className="mr-3" size={24} />
            MAIN MENU
          </RetroButton>
        </div>
      </RetroContainer>
    </div>
  )
}
