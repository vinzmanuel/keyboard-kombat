"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import RetroButton from "./ui/retro-button";
import RetroContainer from "./ui/retro-container";
import RetroTitle from "./ui/retro-title";
import RoomCodeDisplay from "./ui/room-code-display";
import { useSocket, initSocket } from "../lib/socket";

interface RematchWaitingRoomProps {
  roomCode: string;
  textType: string;
  language?: string;
}

export default function RematchWaitingRoom({ 
  roomCode, 
  textType, 
  language = "JavaScript" 
}: RematchWaitingRoomProps) {
  const router = useRouter();
  const socket = useSocket() || initSocket();
  const [waitTime, setWaitTime] = useState(0);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [isInitiator, setIsInitiator] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rematchInfo, setRematchInfo] = useState<{
    originalRoomCode: string;
    initiator: string;
  } | null>(null);

  // Setup timer for waiting display
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Load rematch info from localStorage
  useEffect(() => {
    const storedRematchInfo = localStorage.getItem('rematch_info');
    
    if (storedRematchInfo) {
      try {
        const parsedInfo = JSON.parse(storedRematchInfo);
        setRematchInfo(parsedInfo);
        
        // Check if this player is the initiator
        setIsInitiator(parsedInfo.initiator === true || parsedInfo.initiator === socket?.id);
        
        // Extract text type and language if they exist
        if (parsedInfo.textType && !textType) {
          router.replace(`/multiplayer/rematch?roomCode=${roomCode}&type=${parsedInfo.textType}&language=${parsedInfo.language || 'JavaScript'}`);
        }
      } catch (e) {
        console.error("Error parsing rematch info:", e);
      }
    } else {
      console.error("No rematch info found in localStorage");
      setError("Rematch information not found. Please try again.");
    }
  }, [socket?.id, router, roomCode, textType]);

  // Setup socket connection and event listeners
  useEffect(() => {
    if (!socket || !roomCode) {
      console.error("No socket connection or room code");
      setError("Connection failed. Please try again.");
      return;
    }
      
    console.log("Socket connected, setting up rematch room:", roomCode, "Socket ID:", socket.id);

    // Initialize the room based on initiator status
    const setupRoom = () => {
      console.log(`Setting up rematch room as ${isInitiator ? 'initiator' : 'joiner'}`);
      
      if (isInitiator) {
        console.log(`Creating rematch room: ${roomCode}`);
        socket.emit('createRoom', {
          roomCode,
          settings: {
            type: textType,
            language: language
          }
        });
        
        // Mark as ready after a short delay
        setTimeout(() => {
          socket.emit('playerReady', { roomCode });
        }, 1000);
      } else {
        console.log(`Joining rematch room: ${roomCode}`);
        socket.emit('joinRoom', {
          roomCode
        });
        
        // Mark as ready after a short delay
        setTimeout(() => {
          socket.emit('playerReady', { roomCode });
        }, 1000);
      }
    };
    
    // Only proceed if we know our role
    if (isInitiator !== undefined) {
      // Set a delay for the initial setup
      const setupTimeout = setTimeout(() => {
        setupRoom();
      }, 1000);
      
      return () => {
        clearTimeout(setupTimeout);
      };
    }

    // Listen for player joins
    const onPlayerJoined = ({ players: roomPlayers }: { players: any[] }) => {
      console.log("Players joined rematch:", roomPlayers);
      setPlayers(roomPlayers);
      if (roomPlayers.length > 1) {
        setOpponentJoined(true);
      }
    };

    // Listen for player status updates
    const onPlayerStatusUpdate = ({ players: roomPlayers, allReady: ready }: { players: any[], allReady: boolean }) => {
      console.log("Rematch player status update:", roomPlayers, "All ready:", ready);
      setPlayers(roomPlayers);
      setAllReady(ready);
    };

    // Listen for game start
    const onGameStart = ({ gameText, players: roomPlayers }: { gameText: string, players: any[] }) => {
      console.log("Rematch starting with", roomPlayers.length, "players");
      console.log("Game text received:", gameText ? `Length: ${gameText.length}` : "No text");
      
      // Store the game text in localStorage before redirecting
      if (gameText) {
        // Store the game text and player info
        localStorage.setItem(`gameText_${roomCode}`, gameText);
        
        // Store current player's socket ID to maintain identity
        if (socket && socket.id) {
          localStorage.setItem(`playerSocketId_${roomCode}`, socket.id);
          
          // Store player roles (which player index they are)
          const playerIndex = roomPlayers.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            localStorage.setItem(`playerIndex_${roomCode}`, playerIndex.toString());
          }
        }
        
        // Clean up rematch info
        localStorage.removeItem('rematch_info');
        
        // Redirect to battle page
        router.push(`/multiplayer/battle?roomCode=${roomCode}&type=${textType}&language=${language}`);
      } else {
        console.error("No game text received!");
        setError("Failed to start rematch. Please try again.");
      }
    };

    // Listen for errors
    const onRoomError = ({ error: errorMsg }: { error: string }) => {
      console.error("Room error:", errorMsg);
      setError(errorMsg);
    };

    // Check if this user is the room creator
    socket.on('roomCreated', (data: any) => {
      console.log("Rematch room created:", data);
      setIsInitiator(true);
      setError(null); // Clear any errors if room creation succeeded
    });

    socket.on('playerJoined', onPlayerJoined);
    socket.on('playerStatusUpdate', onPlayerStatusUpdate);
    socket.on('gameStart', onGameStart);
    socket.on('roomError', onRoomError);

    // Print current socket ID for debugging
    console.log("Current socket ID:", socket.id);

    // Cleanup event listeners and interval
    return () => {
      console.log("Cleaning up socket listeners");
      socket.off('playerJoined', onPlayerJoined);
      socket.off('playerStatusUpdate', onPlayerStatusUpdate);
      socket.off('gameStart', onGameStart);
      socket.off('roomError', onRoomError);
      socket.off('roomCreated');
    };
  }, [socket, roomCode, router, textType, language, isInitiator]);

  // Leave room when user leaves the page
  useEffect(() => {
    return () => {
      if (socket) {
        socket.emit('leaveRoom', { roomCode });
      }
    };
  }, [socket, roomCode]);

  return (
    <div className="min-h-screen  text-white p-4 flex items-center justify-center">
      <RetroContainer className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <RetroButton 
              onClick={() => {
                if (socket) {
                  socket.emit('leaveRoom', { roomCode });
                }
                router.push("/");
              }} 
              color="blue" 
              size="md" 
              className="mr-4"
            >
              <ArrowLeft size={20} className="mr-2" /> CANCEL
            </RetroButton>
            <RetroTitle size="md">REMATCH WAITING ROOM</RetroTitle>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900 border-2 border-red-500 text-red-200 rounded-md">
            <p className="text-center font-bold">{error}</p>
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-16">
          <RoomCodeDisplay roomCode={roomCode} />

          <div className="mt-16 text-center">
            {opponentJoined ? (
              <div className="animate-fadeIn">
                <div className="text-3xl font-bold text-green-400 mb-4">OPPONENT JOINED!</div>
                <div className="text-xl text-gray-400">
                  {allReady ? "Starting rematch battle..." : "Waiting for all players to be ready..."}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center mb-6">
                  <Loader2 className="animate-spin text-yellow-400 mr-3" size={32} />
                  <div className="text-2xl font-bold text-yellow-400">WAITING FOR OPPONENT</div>
                </div>
                <div className="text-xl text-gray-400">Time elapsed: {waitTime}s</div>
                <div className="mt-4 text-blue-300">Share this rematch code with your opponent</div>
              </>
            )}
          </div>

          <div className="mt-16 p-6 border-4 border-blue-500 bg-gray-800 rounded-lg max-w-md w-full">
            <h3 className="text-2xl font-bold text-blue-400 mb-4">REMATCH INFORMATION</h3>
            <div className="space-y-3 text-gray-300 text-lg">
              <div className="flex justify-between">
                <span>Text Type:</span>
                <span className="font-bold text-blue-300">{textType.toUpperCase()}</span>
              </div>
              {textType === "code" && (
                <div className="flex justify-between">
                  <span>Language:</span>
                  <span className="font-bold text-blue-300">{language}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Health:</span>
                <span className="font-bold text-blue-300">100 HP</span>
              </div>
              <div className="flex justify-between">
                <span>Players:</span>
                <span className="font-bold text-blue-300">{players.length}/2</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-bold text-blue-300">
                  {isInitiator ? "Rematch Initiator" : "Joining Rematch"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </RetroContainer>
    </div>
  );
} 