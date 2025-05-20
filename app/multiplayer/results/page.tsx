"use client"

import { useSearchParams } from "next/navigation"
import ResultsScreen from "@/components/results-screen"
import { useEffect, useState } from "react"

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const roomCode = searchParams.get("roomCode") || "UNKNOWN"
  const winner = (searchParams.get("winner") as "player" | "opponent") || "player"
  const typeParam = searchParams.get("type") || "words"
  const languageParam = searchParams.get("language") || "JavaScript"
  
  const [playerStats, setPlayerStats] = useState({
    wpm: 0,
    accuracy: 0,
    damageDealt: 0,
  })
  
  const [opponentStats, setOpponentStats] = useState({
    wpm: 0,
    accuracy: 0,
    damageDealt: 0,
  })
  
  // Load stats from localStorage
  useEffect(() => {
    // Try to get battle results from local storage
    const storedStats = localStorage.getItem(`battleStats_${roomCode}`);
    console.log("Retrieved battle stats:", storedStats);
    
    if (storedStats) {
      try {
        const stats = JSON.parse(storedStats);
        console.log("Parsed stats:", stats);
        
        // Ensure values are valid numbers
        const playerWpm = typeof stats.playerWpm === 'number' ? stats.playerWpm : 0;
        const playerAccuracy = typeof stats.playerAccuracy === 'number' ? stats.playerAccuracy : 0;
        const playerDamageDealt = typeof stats.playerDamageDealt === 'number' ? stats.playerDamageDealt : 0;
        
        const opponentWpm = typeof stats.opponentWpm === 'number' ? stats.opponentWpm : 0;
        const opponentAccuracy = typeof stats.opponentAccuracy === 'number' ? stats.opponentAccuracy : 0;
        const opponentDamageDealt = typeof stats.opponentDamageDealt === 'number' ? stats.opponentDamageDealt : 0;
        
        setPlayerStats({
          wpm: playerWpm,
          accuracy: playerAccuracy,
          damageDealt: playerDamageDealt,
        });
        
        setOpponentStats({
          wpm: opponentWpm,
          accuracy: opponentAccuracy,
          damageDealt: opponentDamageDealt,
        });
        
        console.log("Set stats - Player:", { wpm: playerWpm, accuracy: playerAccuracy, damageDealt: playerDamageDealt });
        console.log("Set stats - Opponent:", { wpm: opponentWpm, accuracy: opponentAccuracy, damageDealt: opponentDamageDealt });
      } catch (e) {
        console.error("Error parsing battle stats:", e);
        setDefaultStats();
      }
    } else {
      console.log("No stored stats found, using defaults");
      // If no stats found, use defaults based on winner
      setDefaultStats();
    }
    
    // Do not cleanup storage here - we may need it if the user goes back and forth
  }, [roomCode, winner]);
  
  // Set default stats if none are available
  function setDefaultStats() {
    setPlayerStats({
      wpm: winner === "player" ? 75 : 65,
      accuracy: winner === "player" ? 96 : 92,
      damageDealt: winner === "player" ? 100 : 75,
    });
    
    setOpponentStats({
      wpm: winner === "opponent" ? 75 : 65,
      accuracy: winner === "opponent" ? 96 : 92,
      damageDealt: winner === "opponent" ? 100 : 75,
    });
  }

  return <ResultsScreen 
    roomCode={roomCode} 
    winner={winner} 
    playerStats={playerStats} 
    opponentStats={opponentStats}
    textType={typeParam}
    language={languageParam}
  />
}
