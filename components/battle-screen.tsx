"use client"

import type React from "react"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import HealthBar from "./ui/health-bar"
import RetroButton from "./ui/retro-button"
import RetroContainer from "./ui/retro-container"
import RetroTitle from "./ui/retro-title"
import Modal from "./modal"
import { useMultiplayer } from "@/hooks/use-multiplayer"
import { useSocket, initSocket } from "../lib/socket"

interface BattleScreenProps {
  roomCode: string
  textType: string
  language?: string
}

export default function BattleScreen({ roomCode, textType, language = "JavaScript" }: BattleScreenProps) {
  console.log(`BattleScreen rendering with roomCode: ${roomCode}`);
  
  const router = useRouter()
  const [text, setText] = useState("")
  const [battleStarted, setBattleStarted] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [battleEnded, setBattleEnded] = useState(false)
  const [pageLoaded, setPageLoaded] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [loadRetries, setLoadRetries] = useState(0)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [showGiveUpModal, setShowGiveUpModal] = useState(false)
  const [opponentGaveUp, setOpponentGaveUp] = useState(false)
  const loadTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Get socket directly
  const socket = useSocket() || initSocket()

  // On mount, override the background video to kkburn_2_2.mp4
  useEffect(() => {
    // Find the background video element in layout
    const video = document.querySelector('video[autoplay][loop][muted][playsinline]');
    if (video && video instanceof HTMLVideoElement) {
      video.src = '/kkburn_2_2.mp4';
      video.load();
      video.play().catch(() => {});
    }
    // On unmount, restore to default background
    return () => {
      if (video && video instanceof HTMLVideoElement) {
        video.src = '/KKBG_2_2_2.mp4';
        video.load();
        video.play().catch(() => {});
      }
    };
  }, []);

  // Track when socket connects/disconnects
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      console.log(`Socket connected: ${socket.id}`);
      setSocketConnected(true);
      
      // Reset error state when reconnecting
      if (roomError) {
        setRoomError(null);
      }
      
      // When reconnecting, make sure we rejoin the room
      if (roomCode) {
        console.log('Reconnected, ensuring room membership');
        socket.emit('ensureInRoom', { roomCode });
        
        // Request current game status after a short delay
        setTimeout(() => {
          if (socket.connected) {
            socket.emit('getGameStatus', { roomCode });
          }
        }, 500);
      }
    };

    const onDisconnect = () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    };
    
    // Listen for custom socket error events
    const onSocketError = (event: CustomEvent) => {
      console.error('Socket error event:', event.detail);
      setRoomError(event.detail as string);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    
    // Add custom event listeners
    window.addEventListener('socket-error', onSocketError as EventListener);
    window.addEventListener('socket-disconnect', () => {
      setSocketConnected(false);
    });

    // Initial state
    setSocketConnected(socket.connected);
    
    // Ensure we're in the room on first load
    if (socket.connected && roomCode) {
      // Initial connection attempt
      socket.emit('ensureInRoom', { roomCode });
      
      // Setup a retry mechanism for initial connection
      const maxRetries = 3;
      let retryCount = 0;
      
      const retryInterval = setInterval(() => {
        if (roomError && retryCount < maxRetries) {
          console.log(`Retry attempt ${retryCount + 1} to join room ${roomCode}`);
          socket.emit('ensureInRoom', { roomCode });
          retryCount++;
        } else {
          clearInterval(retryInterval);
        }
      }, 2000);
      
      // Clean up the retry interval when component unmounts
      return () => {
        clearInterval(retryInterval);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        window.removeEventListener('socket-error', onSocketError as EventListener);
        window.removeEventListener('socket-disconnect', () => {
          setSocketConnected(false);
        });
      };
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      window.removeEventListener('socket-error', onSocketError as EventListener);
      window.removeEventListener('socket-disconnect', () => {
        setSocketConnected(false);
      });
    };
  }, [socket, roomCode, roomError]);
  
  // Multiplayer hook
  const {
    playerHealth,
    opponentHealth,
    playerWpm,
    opponentWpm,
    playerAccuracy,
    opponentAccuracy,
    dealDamage,
    resetBattle,
    completeTyping,
    winner,
    opponentProgress,
    gameText,
  } = useMultiplayer({ roomCode })

  // Set the text when received from the server
  useEffect(() => {
    console.log("Game text received:", gameText ? `Length: ${gameText.length}` : "No text");
    
    // First check localStorage for game text
    const storedText = localStorage.getItem(`gameText_${roomCode}`);
    if (storedText) {
      console.log("Found game text in localStorage");
      setText(storedText);
      // Clean up localStorage
      localStorage.removeItem(`gameText_${roomCode}`);
    } else if (gameText) {
      console.log("Using game text from server");
      setText(gameText);
    }
  }, [gameText, roomCode]);

  // Notify server that battle screen has loaded
  useEffect(() => {
    if (!pageLoaded && roomCode && socket && socketConnected && !roomError) {
      console.log("Notifying server that battle screen has loaded");
      
      // Clear any existing timer
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
      }
      
      try {
        // Check if we have stored player identity from waiting room
        const storedSocketId = localStorage.getItem(`playerSocketId_${roomCode}`);
        const storedPlayerIndex = localStorage.getItem(`playerIndex_${roomCode}`);
        
        console.log(`Battle screen loaded with socket ID: ${socket.id}`);
        console.log(`Stored socket ID from waiting room: ${storedSocketId}`);
        
        // Simple approach: First try to ensure we're in the room
        socket.emit('ensureInRoom', { 
          roomCode,
          previousSocketId: storedSocketId,
          playerIndex: storedPlayerIndex ? parseInt(storedPlayerIndex) : undefined
        });
        
        // Then notify that battle screen is loaded
        setTimeout(() => {
          socket.emit('battleScreenLoaded', { 
            roomCode,
            previousSocketId: storedSocketId,
            playerIndex: storedPlayerIndex ? parseInt(storedPlayerIndex) : undefined
          });
          
          // Also request current game status
          socket.emit('getGameStatus', { 
            roomCode,
            previousSocketId: storedSocketId,
            playerIndex: storedPlayerIndex ? parseInt(storedPlayerIndex) : undefined
          });
        }, 500);
        
        setPageLoaded(true);
        
        // Just one retry after a delay if needed
        const retryTimeout = setTimeout(() => {
          if (!battleStarted && !roomError) {
            console.log("Retrying connection to room");
            // Try connection again
            socket.emit('ensureInRoom', { 
              roomCode,
              previousSocketId: storedSocketId,
              playerIndex: storedPlayerIndex ? parseInt(storedPlayerIndex) : undefined 
            });
            
            socket.emit('battleScreenLoaded', { 
              roomCode,
              previousSocketId: storedSocketId,
              playerIndex: storedPlayerIndex ? parseInt(storedPlayerIndex) : undefined
            });
            
            socket.emit('getGameStatus', { roomCode });
          }
        }, 5000);
        
        return () => {
          clearTimeout(retryTimeout);
        };
      } catch (error) {
        console.error("Error in battle screen load:", error);
        setRoomError("Failed to connect to game server. Please try again later.");
      }
    }
  }, [pageLoaded, roomCode, socket, socketConnected, battleStarted, roomError]);

  // Listen for synchronized countdown from server
  useEffect(() => {
    if (!socket) return;
    
    console.log("Setting up countdown and battle start listeners");
    
    // Listen for synchronized countdown
    const onSyncCountdown = (data: { count: number }) => {
      console.log("Received countdown:", data.count);
      setCountdown(data.count);
    };
    
    // Listen for battle start signal
    const onBattleStart = () => {
      console.log("Battle starting now!");
      setBattleStarted(true);
      setRoomError(null); // Clear any error when battle starts
      
      // Clear any retry timers since battle has started
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
      }
    };
    
    // Handle game status response
    const onGameStatusResponse = (data: any) => {
      console.log("Received game status:", data);
      
      if (data.error) {
        console.error("Game status error:", data.error);
        setRoomError(data.error);
        
        // Stop any retry attempts
        if (loadTimerRef.current) {
          clearTimeout(loadTimerRef.current);
          loadTimerRef.current = null;
        }
        return;
      }
      
      // Update countdown based on server state
      if (data.currentCount !== null && data.currentCount !== undefined) {
        setCountdown(data.currentCount);
      }
      
      // If battle has already started, force to started state
      if (data.gameStarted && !battleStarted) {
        console.log("Game already started according to server, updating UI");
        setBattleStarted(true);
      }
    };
    
    // Handle room error events
    const onRoomError = ({ error }: { error: string }) => {
      console.error("Room error:", error);
      setRoomError(error);
      
      // Stop any retry attempts
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
      }
    };

    // Listen for opponent giving up (legacy event)
    const onPlayerGaveUp = () => {
      setOpponentGaveUp(true);
      setBattleEnded(true);
    };

    // Listen for gameOver with forfeit
    const onGameOver = (data: any) => {
      if (data && data.forfeit) {
        if (data.winner && data.winner === socket.id) {
          setOpponentGaveUp(true);
          setBattleEnded(true);
        } else if (data.winner && data.winner !== socket.id) {
          setBattleEnded(true);
        }
      }
    };

    socket.on('syncCountdown', onSyncCountdown);
    socket.on('battleStart', onBattleStart);
    socket.on('gameStatusResponse', onGameStatusResponse);
    socket.on('roomError', onRoomError);
    socket.on('playerGaveUp', onPlayerGaveUp);
    socket.on('gameOver', onGameOver);

    // Request game status when component mounts
    const storedSocketId = localStorage.getItem(`playerSocketId_${roomCode}`);
    const storedPlayerIndex = localStorage.getItem(`playerIndex_${roomCode}`);
    
    socket.emit('getGameStatus', { 
      roomCode,
      previousSocketId: storedSocketId,
      playerIndex: storedPlayerIndex ? parseInt(storedPlayerIndex) : undefined
    });
    
    // Cleanup
    return () => {
      socket.off('syncCountdown', onSyncCountdown);
      socket.off('battleStart', onBattleStart);
      socket.off('gameStatusResponse', onGameStatusResponse);
      socket.off('roomError', onRoomError);
      socket.off('playerGaveUp', onPlayerGaveUp);
      socket.off('gameOver', onGameOver);
    };
  }, [socket, roomCode, battleStarted]);

  // Handle player typing progress
  const handlePlayerProgress = useCallback(
    (stats: { wpm: number; accuracy: number; progress: number }) => {
      if (roomError) return; // Don't process progress if there's a room error
      
      console.log("Player typing progress update:", stats);
      
      // Ensure we have valid stats
      if (stats.wpm < 0 || stats.accuracy < 0 || stats.progress < 0) {
        console.error("Invalid stats received:", stats);
        return;
      }
      
      // Pass the actual progress percentage to the dealDamage function
      dealDamage("player", stats.wpm, stats.accuracy, stats.progress);
    },
    [dealDamage, roomError],
  );

  // Handle player typing completion
  const handlePlayerComplete = useCallback(() => {
    if (roomError) return; // Don't process completion if there's a room error
    
    if (typeof completeTyping === 'function') {
      completeTyping();
    }
  }, [completeTyping, roomError]);

  // Watch for health reaching zero to end battle
  useEffect(() => {
    if (battleStarted && !battleEnded) {
      if (playerHealth <= 0 || opponentHealth <= 0) {
        setBattleEnded(true);
        
        // Save battle stats to localStorage for the results page
        const damageToPlayer = 100 - playerHealth;
        const damageToOpponent = 100 - opponentHealth;
        
        // Log stats for debugging
        console.log("Saving battle stats to localStorage:", {
          playerWpm, playerAccuracy, opponentWpm, opponentAccuracy,
          damageToPlayer, damageToOpponent
        });
        
        // Make sure WPM values are properly formatted numbers
        const formattedPlayerWpm = Math.round(Number(playerWpm) || 0);
        const formattedOpponentWpm = Math.round(Number(opponentWpm) || 0);
        
        const battleStats = {
          playerWpm: formattedPlayerWpm,
          playerAccuracy: playerAccuracy,
          playerDamageDealt: damageToOpponent,
          opponentWpm: formattedOpponentWpm,
          opponentAccuracy: opponentAccuracy,
          opponentDamageDealt: damageToPlayer
        };
        
        // Store the stats with a unique timestamp to avoid conflicts
        localStorage.setItem(`battleStats_${roomCode}`, JSON.stringify(battleStats));
      }
    }
  }, [playerHealth, opponentHealth, battleStarted, battleEnded, playerWpm, playerAccuracy, opponentWpm, opponentAccuracy, roomCode]);

  // Add states for rematch request
  const [rematchRequested, setRematchRequested] = useState(false);
  const [incomingRematchRequest, setIncomingRematchRequest] = useState(false);
  const [rematchRoomCode, setRematchRoomCode] = useState("");
  const [rematchDeclined, setRematchDeclined] = useState(false);
  
  // Listen for rematch requests
  useEffect(() => {
    if (!socket) return;
    
    // Handle incoming rematch request
    const handleRematchRequest = (data: { roomCode: string, fromSocketId: string }) => {
      console.log(`Received rematch request for room: ${data.roomCode}`);
      setIncomingRematchRequest(true);
      setRematchRoomCode(data.roomCode);
    };
    
    // Handle rematch accepted
    const handleRematchAccepted = (data: { roomCode: string }) => {
      console.log(`Rematch request accepted for room: ${data.roomCode}`);
      // Store in localStorage for the waiting room to access
      localStorage.setItem('rematch_info', JSON.stringify({
        originalRoomCode: roomCode,
        textType,
        language,
        initiator: false
      }));
      
      // Navigate to rematch waiting room
      router.push(`/multiplayer/room/${data.roomCode}?type=${textType}&language=${language}&rematch=1&initiator=0`);
    };
    
    // Handle rematch declined
    const handleRematchDeclined = () => {
      console.log(`Rematch request declined`);
      setRematchRequested(false);
      setRematchDeclined(true);
      
      // Auto-clear the declined message after 5 seconds
      setTimeout(() => {
        setRematchDeclined(false);
      }, 5000);
    };
    
    socket.on('rematchRequest', handleRematchRequest);
    socket.on('rematchAccepted', handleRematchAccepted);
    socket.on('rematchDeclined', handleRematchDeclined);
    
    return () => {
      socket.off('rematchRequest', handleRematchRequest);
      socket.off('rematchAccepted', handleRematchAccepted);
      socket.off('rematchDeclined', handleRematchDeclined);
    };
  }, [socket, roomCode, router, textType, language]);

  // Return to main menu
  const handleReturnToMenu = () => {
    router.push("/")
  }

  // View results
  const handleViewResults = () => {
    router.push(`/multiplayer/results?roomCode=${roomCode}&winner=${winner}`)
  }

  // Rematch
  const handleRematch = () => {
    if (!socket) return;
    // Generate a new room code for the rematch
    const newRematchRoomCode = generateRematchCode();
    setRematchRoomCode(newRematchRoomCode);
    // Send rematch request to opponent
    socket.emit('rematchRequest', {
      originalRoomCode: roomCode,
      newRoomCode: newRematchRoomCode,
      settings: {
        type: textType,
        language
      }
    });
    setRematchRequested(true);
    // Store rematch info in localStorage for the initiator
    localStorage.setItem('rematch_info', JSON.stringify({
      originalRoomCode: roomCode,
      textType,
      language,
      initiator: true
    }));
    // Route to the waiting room for the new room code, with rematch flag
    router.push(`/multiplayer/room/${newRematchRoomCode}?type=${textType}&language=${language}&rematch=1&initiator=1`);
  }

  // Accept rematch request
  const handleAcceptRematch = () => {
    if (!socket || !rematchRoomCode) return;
    // Tell the requester that we've accepted
    socket.emit('rematchAccepted', {
      originalRoomCode: roomCode,
      newRoomCode: rematchRoomCode
    });
    // Store rematch info in localStorage for the acceptor
    localStorage.setItem('rematch_info', JSON.stringify({
      originalRoomCode: roomCode,
      textType,
      language,
      initiator: false
    }));
    // Navigate to rematch waiting room for the new room code, with rematch flag
    router.push(`/multiplayer/room/${rematchRoomCode}?type=${textType}&language=${language}&rematch=1&initiator=0`);
  }
  
  // Decline rematch request
  const handleDeclineRematch = () => {
    if (!socket) return;
    
    socket.emit('rematchDeclined', {
      originalRoomCode: roomCode
    });
    
    setIncomingRematchRequest(false);
  }
  
  // Generate a rematch code based on the original with a suffix
  function generateRematchCode() {
    // Create a code that's related to the original but different
    // Take first 4 chars of original code and add a random suffix
    const prefix = roomCode.substring(0, 4);
    const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${prefix}${suffix}`;
  }

  // Give up handler
  const handleGiveUp = () => {
    setShowGiveUpModal(true);
  };

  const confirmGiveUp = () => {
    if (socket && roomCode) {
      socket.emit('giveUp', { roomCode });
    }
    setShowGiveUpModal(false);
    router.push("/");
  };

  // If there's a room error, show it
  if (roomError) {
    return (
      <div className="min-h-screen text-white p-4 flex items-center justify-center">
        <RetroContainer className="w-full max-w-7xl border-red-900 border-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500 mb-4">BATTLE ERROR</div>
            <div className="text-xl text-white mb-6">{roomError}</div>
            <div className="text-gray-400 mb-8">
              {roomError.includes("not found") ? (
                <div>
                  <p>The room may have been closed due to inactivity or the creator left.</p>
                  <p className="mt-2">You can try creating a new room or joining a different one.</p>
                </div>
              ) : roomError.includes("full") ? (
                <p>The room is already full with 2 players. Try joining a different room or create your own.</p>
              ) : (
                <p>The room may have been closed due to inactivity or the creator left.</p>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <RetroButton onClick={() => router.push("/multiplayer/create")} color="green" size="lg">
                CREATE NEW ROOM
              </RetroButton>
              <RetroButton onClick={() => router.push("/multiplayer/join")} color="blue" size="lg">
                JOIN ANOTHER ROOM
              </RetroButton>
              <RetroButton onClick={handleReturnToMenu} color="red" size="lg">
                RETURN TO MAIN MENU
              </RetroButton>
            </div>
            {socketConnected && (
              <div className="mt-8">
                <RetroButton 
                  onClick={() => {
                    setRoomError(null);
                    if (socket) {
                      socket.emit('ensureInRoom', { roomCode });
                      socket.emit('getGameStatus', { roomCode });
                    }
                  }} 
                  color="yellow" 
                  size="md"
                >
                  RETRY CONNECTION
                </RetroButton>
              </div>
            )}
          </div>
        </RetroContainer>
      </div>
    )
  }

  // If text is not yet loaded, show loading state
  if (!text) {
    console.log("Waiting for game text to load...");
    return (
      <div className="min-h-screen  text-white p-4 flex items-center justify-center">
        <RetroContainer className="w-full max-w-7xl border-red-500 border-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-4">LOADING BATTLE...</div>
            <div className="text-xl text-gray-400">Preparing your typing challenge</div>
            {!socketConnected && (
              <div className="text-red-400 mt-4 animate-pulse">
                Connecting to server... Please wait.
              </div>
            )}
          </div>
        </RetroContainer>
      </div>
    )
  }

  return (
    <div className="min-h-screen  text-white p-4 flex items-center justify-center">
      <RetroContainer className="w-full max-w-7xl border-red-800 shadow-[0_0_30px_rgba(255,0,0,0.5)] rounded-lg p-8 border-4">
        <div className="flex justify-between items-center mb-6">
          <img
            src="/kk-fire2.png"
            alt="KEYBOARD KOMBAT"
            className=" h-[80px] -mb-5 -mt-5 object-contain drop-shadow-[0_3px_3px_rgba(255,0,0,0.8)]"
          />
          {/* GIVE UP BUTTON */}
          <div className="flex flex-col items-end">
            <button
              onClick={handleGiveUp}
              className="mb-2 px-6 py-2 bg-red-700 hover:bg-red-900 text-white font-bold rounded-lg border-2 border-red-400 shadow-lg transition-all duration-150 text-lg"
              disabled={battleEnded || !battleStarted}
            >
              GIVE UP
            </button>
            <div className="text-red-500 font-bold text-3xl">ROOM: {roomCode}</div>
          </div>
        </div>

        {/* Stats display - Single location for WPM and accuracy */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-800 rounded-lg border-4 border-gray-700">
          <div className="text-center">
            <div className="text-lg text-gray-400">YOUR WPM</div>
            <div className="text-3xl font-bold text-green-400">{playerWpm}</div>
          </div>
          <div className="text-center">
            <div className="text-lg text-gray-400">YOUR ACCURACY</div>
            <div className="text-3xl font-bold text-green-400">{playerAccuracy}%</div>
          </div>
          <div className="text-center">
            <div className="text-lg text-gray-400">OPPONENT WPM</div>
            <div className="text-3xl font-bold text-red-400">{opponentWpm}</div>
          </div>
          <div className="text-center">
            <div className="text-lg text-gray-400">OPPONENT ACCURACY</div>
            <div className="text-3xl font-bold text-red-400">{opponentAccuracy}%</div>
          </div>
        </div>

        {/* Connection indicator */}
        {!socketConnected && (
          <div className="mb-6 p-2 bg-red-900 border-2 border-red-500 text-red-200 rounded-md text-center">
            <span className="animate-pulse">Connection lost. Reconnecting...</span>
          </div>
        )}

        {/* Health bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <HealthBar currentHealth={playerHealth} maxHealth={100} playerName="YOU" />
          <HealthBar currentHealth={opponentHealth} maxHealth={100} playerName="OPPONENT" />
        </div>

        {/* Battle area */}
        <div className="relative">
          {!battleStarted && !battleEnded && (
            <div className="absolute inset-0 flex items-center justify-center z-10 ">
              <div className="text-center">
                <div className="text-8xl font-bold text-yellow-400 mb-4">
                  {countdown > 0 ? countdown : "FIGHT!"}
                </div>
                <div className="text-2xl text-gray-400">
                  {countdown > 0 ? "Get ready..." : "Start typing!"}
                </div>
                <div className="text-sm text-gray-600 mt-4">Waiting for both players to load</div>
              </div>
            </div>
          )}

          {battleEnded && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="text-6xl font-bold mb-6">
                  {winner === "player" ? (
                    <span className="text-green-500">
                      {opponentGaveUp ? "YOU WIN! (Victory by Forfeit)" : "YOU WIN!"}
                    </span>
                  ) : (
                    <span className="text-red-500">YOU LOSE!</span>
                  )}
                </div>
                
                {/* Show incoming rematch request */}
                {incomingRematchRequest && (
                  <div className="mb-8 p-6 border-4 border-yellow-500 bg-gray-800 rounded-lg animate-pulse">
                    <div className="text-2xl text-yellow-400 font-bold mb-4">REMATCH REQUESTED</div>
                    <div className="text-lg text-gray-300 mb-6">Your opponent wants a rematch!</div>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                      <RetroButton onClick={handleAcceptRematch} color="green" size="md">
                        ACCEPT REMATCH
                      </RetroButton>
                      <RetroButton onClick={handleDeclineRematch} color="red" size="md">
                        DECLINE
                      </RetroButton>
                    </div>
                  </div>
                )}
                
                {/* Show rematch requested message */}
                {rematchRequested && !incomingRematchRequest && !rematchDeclined && (
                  <div className="mb-8 p-6 border-4 border-blue-500 bg-gray-800 rounded-lg">
                    <div className="text-2xl text-blue-400 font-bold mb-4">REMATCH REQUESTED</div>
                    <div className="text-lg text-gray-300">Waiting for opponent to accept...</div>
                    <div className="animate-pulse mt-4 text-sm text-gray-500">
                      You can also view results or return to menu while waiting
                    </div>
                  </div>
                )}
                
                {/* Show rematch declined message */}
                {rematchDeclined && (
                  <div className="mb-8 p-6 border-4 border-red-500 bg-gray-800 rounded-lg">
                    <div className="text-2xl text-red-400 font-bold mb-4">REMATCH DECLINED</div>
                    <div className="text-lg text-gray-300">Your opponent has declined the rematch request.</div>
                  </div>
                )}
                
                <div className="flex flex-col md:flex-row gap-4 mt-6 justify-center">
                  {!rematchRequested && !incomingRematchRequest && (
                    <RetroButton onClick={handleRematch} color="green" size="lg">
                      REQUEST REMATCH
                    </RetroButton>
                  )}
                  <RetroButton onClick={handleViewResults} color="blue" size="lg">
                    VIEW RESULTS
                  </RetroButton>
                  <RetroButton onClick={handleReturnToMenu} color="red" size="lg">
                    MAIN MENU
                  </RetroButton>
                </div>
              </div>
            </div>
          )}

          {/* Modal for Give Up Confirmation */}
          {showGiveUpModal && (
            <Modal isOpen={showGiveUpModal} onClose={() => setShowGiveUpModal(false)}>
              <div className="p-8 bg-gray-900 border-4 border-red-700 rounded-lg text-center max-w-md mx-auto">
                <div className="text-3xl font-bold text-red-400 mb-4">ABANDON MATCH?</div>
                <div className="text-lg text-gray-200 mb-6">Are you sure you want to give up? Your opponent will win by forfeit.</div>
                <div className="flex justify-center gap-6">
                  <button
                    onClick={confirmGiveUp}
                    className="px-6 py-2 bg-red-700 hover:bg-red-900 text-white font-bold rounded-lg border-2 border-red-400 shadow-lg text-lg"
                  >
                    YES, GIVE UP
                  </button>
                  <button
                    onClick={() => setShowGiveUpModal(false)}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-lg border-2 border-gray-400 shadow-lg text-lg"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </Modal>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player typing area */}
            <div>
              <div className="text-center mb-2 text-green-400 font-bold text-xl">YOUR BATTLE STATION</div>
              <MultiplierTypingArea
                mode="interactive"
                text={text}
                onProgress={handlePlayerProgress}
                onComplete={handlePlayerComplete}
                disabled={!battleStarted || battleEnded}
              />
            </div>

            {/* Opponent typing area */}
            <div>
              <div className="text-center mb-2 text-red-400 font-bold text-xl">OPPONENT</div>
              <MultiplierTypingArea
                mode="opponent"
                wpm={opponentWpm}
                accuracy={opponentAccuracy}
                progress={opponentProgress}
                text={text}
                disabled={!battleStarted || battleEnded}
              />
            </div>
          </div>
        </div>
      </RetroContainer>
    </div>
  )
}

// Specialized typing area for multiplayer mode with improved scrolling and stats updates
function MultiplierTypingArea({
  mode,
  wpm = 0,
  accuracy = 0,
  progress = 0,
  text,
  disabled = false,
  onProgress,
  onComplete,
}: {
  mode: "simulation" | "interactive" | "opponent"
  wpm?: number
  accuracy?: number
  progress?: number
  text: string
  disabled?: boolean
  onProgress?: (stats: { wpm: number; accuracy: number; progress: number }) => void
  onComplete?: () => void
}) {
  // For debugging
  const componentId = useRef(`${mode}_${Math.random().toString(36).substring(2, 8)}`);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textContainerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)

  // State for tracking typing progress
  const [typedIndex, setTypedIndex] = useState(0)
  const [userInput, setUserInput] = useState("")
  const [incorrectChars, setIncorrectChars] = useState(new Set<number>())
  const [currentWpm, setCurrentWpm] = useState(wpm)
  const [currentAccuracy, setCurrentAccuracy] = useState(accuracy)

  // Refs for calculations
  const startTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const lastProgressRef = useRef<number>(progress);

  // Add a 3-second initial lockout before typing is enabled
  const [inputEnabled, setInputEnabled] = useState(mode !== "interactive");
  const [countdown, setCountdown] = useState(3);
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (mode === "interactive") {
      setInputEnabled(false);
      setCountdown(3);
      let count = 3;
      timer = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          setInputEnabled(true);
          setCountdown(0);
          if (timer) clearInterval(timer);
        }
      }, 1000);
      return () => { if (timer) clearInterval(timer); };
    } else {
      setInputEnabled(true);
      setCountdown(0);
    }
  }, [mode]);

  // Update state when props change for opponent mode
  useEffect(() => {
    if (mode === "opponent") {
      // Only update if values have changed
      if (wpm !== currentWpm) {
        setCurrentWpm(wpm);
      }
      
      if (accuracy !== currentAccuracy) {
        setCurrentAccuracy(accuracy);
      }
      
      if (progress !== lastProgressRef.current) {
        lastProgressRef.current = progress;
        
        // Force update typed index when progress changes
        const normalizedProgress = typeof progress === 'number' ? 
          (progress > 1 ? progress / 100 : progress) : 0;
          
        const newTypedIndex = Math.max(0, Math.round(normalizedProgress * text.length));
        
        if (newTypedIndex !== typedIndex) {
          setTypedIndex(newTypedIndex);
        }
      }
    }
  }, [mode, wpm, accuracy, progress, currentWpm, currentAccuracy, typedIndex, text]);

  // Animation loop for real-time stats updates and simulation
  useEffect(() => {
    if (disabled) return

    // Start time on first render or reset
    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now()
    }

    const updateStats = (timestamp: number) => {
      // Skip if disabled
      if (disabled) return

      // Calculate elapsed time
      const elapsedTime = timestamp - (startTimeRef.current || timestamp)
      const elapsedMinutes = elapsedTime / 60000

      if (mode === "interactive") {
        // Update WPM and accuracy in real-time for interactive mode
        if (typedIndex > 0 && elapsedMinutes > 0) {
          // Calculate WPM based on correct characters only
          const correctChars = typedIndex - incorrectChars.size
          const wordsTyped = Math.max(0, correctChars) / 5 // Standard: 5 chars = 1 word
          const newWpm = Math.round(wordsTyped / elapsedMinutes)

          // Calculate accuracy
          const errorRate = incorrectChars.size > 0 ? (incorrectChars.size / typedIndex) * 100 : 0
          const newAccuracy = Math.round(100 - errorRate)

          // Update state if changed
          if (newWpm !== currentWpm) {
            setCurrentWpm(newWpm)
          }
          if (newAccuracy !== currentAccuracy) {
            setCurrentAccuracy(newAccuracy)
          }

          // Report progress to parent component
          if (onProgress && timestamp - lastUpdateTimeRef.current > 100) {
            // Limit updates to every 100ms
            lastUpdateTimeRef.current = timestamp
            
            // Calculate progress as percentage of text completed
            const progressPercentage = Math.round((typedIndex / text.length) * 100);
            
            onProgress({ 
              wpm: newWpm, 
              accuracy: newAccuracy, 
              progress: progressPercentage 
            });
            
            // If typing is complete, trigger completion callback
            if (typedIndex === text.length && onComplete) {
              onComplete();
            }
          }
        }
      } else if (mode === "opponent") {
        // Opponent mode - use provided WPM, accuracy, and progress
        if (elapsedTime > 0) {
          // Update display stats
          setCurrentWpm(wpm || 0);
          setCurrentAccuracy(accuracy || 0);
          
          // Make sure progress is handled correctly (0-100 or 0-1)
          const normalizedProgress = typeof progress === 'number' ? 
            (progress > 1 ? progress / 100 : progress) : 0;
          
          // Calculate typed index based on progress percentage
          const newTypedIndex = Math.max(0, Math.round(normalizedProgress * text.length));
          
          if (newTypedIndex !== typedIndex || Math.abs(newTypedIndex - typedIndex) > 0) {
            setTypedIndex(newTypedIndex);
          }
          
          // Update incorrect characters based on accuracy
          if (accuracy < 100) {
            const incorrectCount = Math.floor((100 - accuracy) * newTypedIndex / 100);
            const newIncorrectChars = new Set<number>();
            
            // Add incorrect characters at random positions
            let added = 0;
            while (added < incorrectCount && newTypedIndex > 0) {
              const pos = Math.floor(Math.random() * newTypedIndex);
              if (!newIncorrectChars.has(pos)) {
                newIncorrectChars.add(pos);
                added++;
              }
            }
            
            setIncorrectChars(newIncorrectChars);
          } else {
            // Clear incorrect chars if 100% accuracy
            if (incorrectChars.size > 0) {
              setIncorrectChars(new Set());
            }
          }
        }
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(updateStats)
    }

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(updateStats)

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [mode, disabled, typedIndex, incorrectChars, text.length, onProgress, currentWpm, currentAccuracy, onComplete, wpm, accuracy, progress]);

  // Handle user input for interactive mode
  const handleInputChange = useCallback(
    (value: string) => {
      if (mode !== "interactive" || disabled || !inputEnabled) return

      // Start timer on first input
      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now()
      }

      // Update input state
      setUserInput(value)
      setTypedIndex(value.length)

      // Check for incorrect characters
      const newIncorrectChars = new Set<number>()
      for (let i = 0; i < value.length; i++) {
        if (i < text.length && value[i] !== text[i]) {
          newIncorrectChars.add(i)
        }
      }
      setIncorrectChars(newIncorrectChars)
    },
    [mode, disabled, text, inputEnabled],
  )

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (mode !== "interactive" || disabled || !inputEnabled) return

      // Prevent default behavior for Tab key to avoid losing focus
      if (e.key === "Tab") {
        e.preventDefault()

        // Simulate typing the next word when Tab is pressed
        const currentPosition = userInput.length
        const nextSpaceIndex = text.indexOf(" ", currentPosition)

        if (nextSpaceIndex !== -1) {
          const nextWord = text.substring(currentPosition, nextSpaceIndex + 1)
          handleInputChange(userInput + nextWord)
        }
      }
    },
    [mode, disabled, userInput, text, handleInputChange, inputEnabled],
  )

  // Auto-focus input and maintain focus
  useEffect(() => {
    if (mode === "interactive" && !disabled && inputEnabled) {
      inputRef.current?.focus()
    }

    const handleContainerClick = () => {
      if (mode === "interactive" && !disabled && inputEnabled) {
        inputRef.current?.focus()
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("click", handleContainerClick)
    }

    return () => {
      if (container) {
        container.removeEventListener("click", handleContainerClick)
      }
    }
  }, [mode, disabled, inputEnabled])

  // Reset when disabled changes
  useEffect(() => {
    if (disabled) {
      setTypedIndex(0)
      setUserInput("")
      setIncorrectChars(new Set())
      startTimeRef.current = null
    }
  }, [disabled])

  // Strict auto-scroll that keeps cursor visible at all times
  useEffect(() => {
    if (cursorRef.current) {
      cursorRef.current.scrollIntoView({ block: "center", behavior: "smooth" })
    }
  }, [typedIndex])

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-lg border-4 border-gray-700 bg-gray-900 shadow-[0_0_20px_rgba(255,0,0,0.3)] ${
        disabled || !inputEnabled ? "opacity-70" : ""
      }`}
    >
      {/* Text display area */}
      <div
        ref={textContainerRef}
        className="font-mono text-3xl leading-relaxed whitespace-pre-wrap h-[300px] overflow-y-auto scrollbar-hide bg-gray-800 p-6 rounded-lg relative"
      >
        {/* Show countdown overlay if input is not enabled */}
        {mode === "interactive" && !inputEnabled && (
          <div className="absolute inset-0 flex items-center justify-center  z-20">
            <span className="text-6xl text-yellow-400 font-bold animate-pulse">
              {countdown > 0 ? countdown : "GO!"}
            </span>
          </div>
        )}
        {/* Characters before cursor */}
        <span className="text-green-500">
          {text
            .substring(0, typedIndex)
            .split("")
            .map((char, i) => {
              const isIncorrect = incorrectChars.has(i)
              return (
                <span key={i} className={isIncorrect ? "text-red-500 bg-red-900/30" : ""}>
                  {char}
                </span>
              )
            })}
        </span>

        {/* Current cursor */}
        <span ref={cursorRef} className="bg-yellow-500 text-black animate-pulse cursor-element">
          {text.charAt(typedIndex) || " "}
        </span>

        {/* Characters after cursor */}
        <span className="text-gray-500">{text.substring(typedIndex + 1)}</span>
      </div>

      {/* Hidden input for interactive mode */}
      {mode === "interactive" && (
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="opacity-0 absolute inset-0 w-full h-full cursor-text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          autoCapitalize="off"
          disabled={disabled}
        />
      )}
    </div>
  )
}
