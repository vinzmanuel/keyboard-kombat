"use client"

import { useState, useEffect, useRef } from "react"
import { useSocket, initSocket } from "../lib/socket"

interface MultiplayerOptions {
  roomCode: string
}

interface MultiplayerState {
  playerHealth: number
  opponentHealth: number
  playerWpm: number
  opponentWpm: number
  playerAccuracy: number
  opponentAccuracy: number
  opponentProgress: number
  gameText: string
  winner: "player" | "opponent" | null
  dealDamage: (source: "player" | "opponent", wpm: number, accuracy: number, progress: number) => void
  completeTyping: () => void
  resetBattle: () => void
}

export function useMultiplayer({ roomCode }: MultiplayerOptions): MultiplayerState {
  // Player stats
  const [playerHealth, setPlayerHealth] = useState(100)
  const [playerWpm, setPlayerWpm] = useState(0)
  const [playerAccuracy, setPlayerAccuracy] = useState(100)

  // Opponent stats
  const [opponentHealth, setOpponentHealth] = useState(100)
  const [opponentWpm, setOpponentWpm] = useState(0)
  const [opponentAccuracy, setOpponentAccuracy] = useState(0)
  const [opponentProgress, setOpponentProgress] = useState(0)
  
  // Game text
  const [gameText, setGameText] = useState("")

  // Battle state
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null)

  // Get socket connection
  const socket = useSocket() || initSocket()
  const lastProgressUpdateRef = useRef<number>(Date.now())
  const playerId = useRef<string | null>(null)
  const reconnectAttemptedRef = useRef<boolean>(false)
  const gameStateRef = useRef<{
    playerHealth: number;
    opponentHealth: number;
    playerWpm: number;
    opponentWpm: number;
    playerAccuracy: number;
    opponentAccuracy: number;
    opponentProgress: number;
    winner: "player" | "opponent" | null;
  }>({
    playerHealth: 100,
    opponentHealth: 100,
    playerWpm: 0,
    opponentWpm: 0,
    playerAccuracy: 100,
    opponentAccuracy: 0,
    opponentProgress: 0,
    winner: null
  });
  
  // Track last sequence number to prevent out-of-order updates
  const lastUpdateTimestampRef = useRef<number>(0)

  // Keep game state in ref for reconnection
  useEffect(() => {
    gameStateRef.current = {
      playerHealth,
      opponentHealth,
      playerWpm,
      opponentWpm,
      playerAccuracy,
      opponentAccuracy,
      opponentProgress,
      winner
    };
  }, [playerHealth, opponentHealth, playerWpm, opponentWpm, playerAccuracy, opponentAccuracy, opponentProgress, winner]);

  // Initialize socket communication
  useEffect(() => {
    if (!socket || !roomCode) return

    // Store the player's socket ID for identifying messages
    playerId.current = socket?.id || null;

    console.log("Battle: Socket initialized with ID:", socket.id, "Room:", roomCode)
    
    // Handle socket reconnection
    const onConnect = () => {
      console.log("Socket reconnected:", socket.id);
      // Update our player ID in case it changed
      playerId.current = socket.id || null;
      
      // Reconnect to room on socket reconnection
      if (!reconnectAttemptedRef.current && roomCode) {
        console.log("Rejoining room after reconnect");
        socket.emit('ensureInRoom', { roomCode });
        reconnectAttemptedRef.current = true;
        
        // Request latest game state
        setTimeout(() => {
          socket.emit('getGameStatus', { roomCode });
        }, 500);
      }
    };

    // Listen for game start
    const onGameStart = ({ gameText, players }: { gameText: string, players: any[] }) => {
      console.log("Game starting with text length:", gameText?.length || 0);
      
      if (!gameText) {
        console.error("No game text received!");
        return;
      }
      
      // Store the game text in state
      setGameText(gameText);
      
      // Also store in localStorage as backup
      localStorage.setItem(`gameText_${roomCode}`, gameText);
    }

    // Listen for game updates from server
    const onGameUpdate = (data: { timestamp?: number, players: any[] }) => {
      const updateTime = data.timestamp || Date.now();
      
      // Prevent processing out-of-order updates
      if (updateTime < lastUpdateTimestampRef.current) {
        console.log("Ignoring outdated game update");
        return;
      }
      
      lastUpdateTimestampRef.current = updateTime;
      
      const { players } = data;
      
      if (!players || players.length < 2) {
        console.error("Invalid players data in game update");
        return;
      }
      
      // Find self and opponent in player list
      const self = players.find(p => p.id === playerId.current);
      const opponent = players.find(p => p.id !== playerId.current);
      
      if (!self || !opponent) {
        console.error("Could not find self or opponent in player list, player ID:", playerId.current);
        return;
      }
      
      // Update health immediately (most critical)
      if (typeof self.health === 'number') {
        setPlayerHealth(self.health);
      }
      
      if (typeof opponent.health === 'number') {
        setOpponentHealth(opponent.health);
      }
      
      // Ensure WPM values are valid numbers
      const validPlayerWpm = typeof self.wpm === 'number' ? self.wpm : 0;
      const validOpponentWpm = typeof opponent.wpm === 'number' ? opponent.wpm : 0;
      
      // Batch other stat updates in a single tick to avoid multiple renders
      setTimeout(() => {
        // Update player stats (except health which was updated immediately)
        if (typeof self.wpm === 'number') {
          setPlayerWpm(Math.round(validPlayerWpm));
        }
        
        if (typeof self.accuracy === 'number') {
          setPlayerAccuracy(self.accuracy);
        }
        
        // Update opponent stats (except health which was updated immediately)
        if (typeof opponent.wpm === 'number') {
          setOpponentWpm(Math.round(validOpponentWpm));
        }
        
        if (typeof opponent.accuracy === 'number') {
          setOpponentAccuracy(opponent.accuracy);
        }
        
        if (typeof opponent.progress === 'number') {
          // Normalize progress to be between 0-100
          const normalized = opponent.progress > 1 && opponent.progress <= 100 
            ? opponent.progress 
            : opponent.progress * 100;
          setOpponentProgress(normalized);
        }
      }, 0);
      
      // Check for game over
      if (self.health <= 0 && winner !== "opponent") {
        setWinner("opponent");
      } else if (opponent.health <= 0 && winner !== "player") {
        setWinner("player");
      }
    }

    // Handle game over
    const onGameOver = ({ winner: winnerSocketId, players }: { winner: string, players: any[] }) => {
      console.log("Game over, winner:", winnerSocketId)
      
      if (winnerSocketId === playerId.current) {
        setWinner("player")
      } else {
        setWinner("opponent")
      }
      
      // Update final stats
      const self = players.find(p => p.id === playerId.current)
      const opponent = players.find(p => p.id !== playerId.current)
      
      if (self && opponent) {
        setPlayerHealth(self.health)
        setOpponentHealth(opponent.health)
        setOpponentWpm(opponent.wpm)
        setOpponentAccuracy(opponent.accuracy)
        
        // Update opponent progress to 100% if they won
        if (winnerSocketId !== playerId.current) {
          setOpponentProgress(100)
        }
      }
    }

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('gameStart', onGameStart);
    socket.on('gameUpdate', onGameUpdate);
    socket.on('gameOver', onGameOver);

    // Cleanup
    return () => {
      socket.off('connect', onConnect);
      socket.off('gameStart', onGameStart)
      socket.off('gameUpdate', onGameUpdate)
      socket.off('gameOver', onGameOver)
    }
  }, [socket, roomCode, winner])

  // Deal damage function
  const dealDamage = (source: "player" | "opponent", wpm: number, accuracy: number, progress: number) => {
    if (winner || !socket) {
      return;
    }

    // Only handle player damage - opponent damage comes through sockets
    if (source === "player") {
      // Update local player stats immediately for responsive UI
      setPlayerWpm(wpm);
      setPlayerAccuracy(accuracy);

      // Throttle updates to server to not flood the connection
      const now = Date.now();
      // Reduced throttle time to 100ms for more responsive updates
      if (now - lastProgressUpdateRef.current >= 100) {
        lastProgressUpdateRef.current = now;

        // Normalize progress to 0-100 range
        const normalizedProgress = progress > 1 && progress <= 100 ? progress : progress * 100;
        
        try {
          // Ensure we're in the room
          socket.emit('ensureInRoom', { roomCode });
          
          // Send typing progress after a small delay to let ensureInRoom complete
          setTimeout(() => {
            // Send typing progress update
            socket.emit('typingProgress', {
              roomCode,
              wpm,
              accuracy,
              progress: normalizedProgress
            });
          }, 10);
        } catch (error) {
          console.error("Error sending progress update:", error);
        }
      }
    }
  }

  // Notify server when player completes typing
  const completeTyping = () => {
    if (!socket || winner) return;
    
    try {
      socket.emit('typingComplete', {
        roomCode,
        wpm: playerWpm,
        accuracy: playerAccuracy,
        time: Date.now()
      });
    } catch (error) {
      console.error("Error sending typing completion:", error);
    }
  }

  // Reset battle function
  const resetBattle = () => {
    setPlayerHealth(100)
    setOpponentHealth(100)
    setPlayerWpm(0)
    setPlayerAccuracy(100)
    setOpponentWpm(0)
    setOpponentAccuracy(0)
    setOpponentProgress(0)
    setWinner(null)
    lastProgressUpdateRef.current = Date.now()
    lastUpdateTimestampRef.current = 0;
    reconnectAttemptedRef.current = false;

    // TODO: Implement server-side match reset
  }

  return {
    playerHealth,
    opponentHealth,
    playerWpm,
    opponentWpm,
    playerAccuracy,
    opponentAccuracy,
    opponentProgress,
    gameText,
    winner,
    dealDamage,
    completeTyping,
    resetBattle,
  }
}


