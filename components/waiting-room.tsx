"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import RetroButton from "./ui/retro-button";
import RetroContainer from "./ui/retro-container";
import RetroTitle from "./ui/retro-title";
import RoomCodeDisplay from "./ui/room-code-display";
import { useSocket, initSocket } from "../lib/socket";

interface WaitingRoomProps {
  roomCode: string;
  textType: string;
  language?: string;
}

export default function WaitingRoom({ roomCode, textType, language = "JavaScript" }: WaitingRoomProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const socket = useSocket();
  const [waitTime, setWaitTime] = useState(0);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Rematch logic: parse query params ---
  const rematch = searchParams?.get("rematch") === "1";
  const initiator = searchParams?.get("initiator"); // "1" or "0"
  const isRematchCreator = rematch && initiator === "1";
  const isRematchJoiner = rematch && initiator === "0";

  // Setup timer for waiting display
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitTime((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Setup socket connection and event listeners
  useEffect(() => {
    console.log("Starting socket connection setup for room:", roomCode);
    const currentSocket = socket || initSocket();
    if (!currentSocket) {
      console.error("Socket connection not established");
      setError("Connection failed. Please try again.");
      return;
    }
    console.log("Socket connected, setting up room:", roomCode, "Socket ID:", currentSocket.id);

    // --- Robust creator/joiner logic ---
    let isCreator = false;
    if (rematch) {
      isCreator = initiator === "1";
    } else {
      // Fallback for normal matches
      isCreator = window.location.href.includes('/create') || window.location.href.includes(`/room/${roomCode}?type=`);
    }

    // Track attempts for retry logic
    let attempts = 0;
    const maxAttempts = 3;
    const setupRoom = () => {
      if (isCreator) {
        console.log(`Creating room (attempt ${attempts + 1}): ${roomCode}`);
        currentSocket.emit('createRoom', {
          roomCode,
          settings: {
            type: textType,
            language: language
          }
        });
      } else {
        console.log(`Joining room (attempt ${attempts + 1}): ${roomCode}`);
        currentSocket.emit('joinRoom', {
          roomCode
        });
      }
      attempts++;
    };
    setupRoom();
    const intervalId = setInterval(() => {
      if (attempts < maxAttempts && !opponentJoined) {
        console.log(`Room connection verification check for ${roomCode}`);
        currentSocket.emit('getGameStatus', { roomCode });
        if (error) {
          console.log("Retrying room setup due to error");
          setupRoom();
        }
      } else if (attempts >= maxAttempts && !opponentJoined && !error) {
        console.log("Max attempts reached without opponent joining");
        setError("Room connection timed out. Please try again.");
        clearInterval(intervalId);
      }
    }, 5000);
    setTimeout(() => {
      console.log("Marking player ready for room:", roomCode);
      currentSocket.emit('playerReady', { roomCode });
    }, 2000);
    const onPlayerJoined = ({ players: roomPlayers }: { players: any[] }) => {
      console.log("Players joined:", roomPlayers);
      setPlayers(roomPlayers);
      if (roomPlayers.length > 1) {
        setOpponentJoined(true);
      }
    };
    const onPlayerStatusUpdate = ({ players: roomPlayers, allReady: ready }: { players: any[], allReady: boolean }) => {
      console.log("Player status update:", roomPlayers, "All ready:", ready);
      setPlayers(roomPlayers);
      setAllReady(ready);
    };
    const onGameStart = ({ gameText, players: roomPlayers }: { gameText: string, players: any[] }) => {
      console.log("Game starting with", roomPlayers.length, "players");
      console.log("Game text received:", gameText ? `Length: ${gameText.length}` : "No text");
      if (gameText) {
        localStorage.setItem(`gameText_${roomCode}`, gameText);
        if (socket && socket.id) {
          localStorage.setItem(`playerSocketId_${roomCode}`, socket.id);
          const playerIndex = roomPlayers.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            localStorage.setItem(`playerIndex_${roomCode}`, playerIndex.toString());
          }
        }
        router.push(`/multiplayer/battle?roomCode=${roomCode}&type=${textType}&language=${language}`);
      } else {
        console.error("No game text received!");
        setError("Failed to start game. Please try again.");
      }
    };
    const onRoomError = ({ error: errorMsg }: { error: string }) => {
      console.error("Room error:", errorMsg);
      setError(errorMsg);
      if (!isCreator && errorMsg === "Room does not exist") {
        clearInterval(intervalId);
      }
    };
    currentSocket.on('roomCreated', (data: any) => {
      console.log("Room created:", data);
      setIsCreator(true);
      setError(null);
    });
    currentSocket.on('playerJoined', onPlayerJoined);
    currentSocket.on('playerStatusUpdate', onPlayerStatusUpdate);
    currentSocket.on('gameStart', onGameStart);
    currentSocket.on('roomError', onRoomError);
    console.log("Current socket ID:", currentSocket.id);
    return () => {
      console.log("Cleaning up socket listeners");
      clearInterval(intervalId);
      currentSocket.off('playerJoined', onPlayerJoined);
      currentSocket.off('playerStatusUpdate', onPlayerStatusUpdate);
      currentSocket.off('gameStart', onGameStart);
      currentSocket.off('roomError', onRoomError);
      currentSocket.off('roomCreated');
    };
  }, [socket, roomCode, router, textType, language, error, opponentJoined, rematch, initiator]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.emit('leaveRoom', { roomCode });
      }
    };
  }, [socket, roomCode]);

  // --- Rematch-specific UI messages ---
  let waitingMessage = null;
  if (rematch) {
    if (isRematchCreator) {
      waitingMessage = (
        <>
          <div className="flex items-center justify-center mb-6">
            <Loader2 className="animate-spin text-yellow-400 mr-3" size={32} />
            <div className="text-2xl font-bold text-yellow-400">WAITING FOR OPPONENT TO ACCEPT REMATCH</div>
          </div>
          <div className="text-xl text-gray-400">Time elapsed: {waitTime}s</div>
        </>
      );
    } else if (isRematchJoiner) {
      waitingMessage = (
        <>
          <div className="flex items-center justify-center mb-6">
            <Loader2 className="animate-spin text-yellow-400 mr-3" size={32} />
            <div className="text-2xl font-bold text-yellow-400">JOINING REMATCH...</div>
          </div>
          <div className="text-xl text-gray-400">Time elapsed: {waitTime}s</div>
        </>
      );
    }
  }

  return (
    <div className="min-h-screen text-white p-4 flex items-center justify-center">
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
            <img
              src="/WAITING_ROOM.png"
              alt="KEYBOARD KOMBAT"
              className=" h-[80px] -mb-5 -mt-5 -ml-4 object-contain drop-shadow-[0_3px_3px_rgba(0,0,255,0.8)]"
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <RoomCodeDisplay roomCode={roomCode} />
          <div className="mt-16 text-center">
            {opponentJoined ? (
              <div className="animate-fadeIn">
                <div className="text-3xl font-bold text-green-400 mb-4">OPPONENT JOINED!</div>
                <div className="text-xl text-gray-400">
                  {allReady ? "Starting battle..." : "Waiting for all players to be ready..."}
                </div>
              </div>
            ) : (
              waitingMessage || (
                <>
                  <div className="flex items-center justify-center mb-6">
                    <Loader2 className="animate-spin text-yellow-400 mr-3" size={32} />
                    <div className="text-2xl font-bold text-yellow-400">WAITING FOR OPPONENT</div>
                  </div>
                  <div className="text-xl text-gray-400">Time elapsed: {waitTime}s</div>
                </>
              )
            )}
          </div>
          <div className="mt-16 p-6 border-4 border-blue-500 bg-gray-800 rounded-lg max-w-md w-full">
            <h3 className="text-2xl font-bold text-blue-400 mb-4">BATTLE INFORMATION</h3>
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
            </div>
          </div>
        </div>
      </RetroContainer>
    </div>
  );
}