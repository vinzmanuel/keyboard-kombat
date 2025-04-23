/*
import type { Socket } from "socket.io-client"

let socket: Socket | null = null

export const initializeSocket = async (): Promise<Socket> => {
  if (socket) return socket

  // In a real implementation, this would connect to your actual WebSocket server
  // For this example, we'll create a mock socket that simulates the behavior
  const mockSocket = createMockSocket()
  socket = mockSocket

  return mockSocket
}

// This is a mock implementation for demonstration purposes
// In a real app, you would connect to a real WebSocket server
const createMockSocket = (): Socket => {
  // @ts-ignore - Creating a mock socket for demonstration
  const mockSocket: Socket = {
    id: `user-${Math.random().toString(36).substring(2, 9)}`,
    connected: true,
    disconnected: false,

    // Event handlers
    handlers: {} as Record<string, Function[]>,

    // Emit method
    emit: function (event: string, data: any) {
      console.log(`[MOCK SOCKET] Emitting event: ${event}`, data)

      // Simulate server responses based on the event
      setTimeout(() => {
        switch (event) {
          case "create_room":
            this.triggerHandler("room_created", { roomCode: data.roomCode })
            break

          case "join_room":
          case "join_game":
            this.triggerHandler("player_joined", {
              playerId: this.id,
              roomCode: data.roomCode,
            })

            // Simulate opponent joining after a delay
            setTimeout(() => {
              this.triggerHandler("opponent_joined", {
                opponentId: `opponent-${Math.random().toString(36).substring(2, 9)}`,
              })

              // Send game text
              this.triggerHandler("game_text", {
                text: "The quick brown fox jumps over the lazy dog. Programming requires practice and patience. Typing speed improves with regular practice sessions. Focus on accuracy first and speed will follow naturally.",
              })
            }, 2000)
            break

          case "player_ready":
            // Start countdown after both players are ready
            setTimeout(() => {
              for (let i = 3; i > 0; i--) {
                setTimeout(
                  () => {
                    this.triggerHandler("game_countdown", { count: i })
                  },
                  (3 - i) * 1000,
                )
              }

              // Start game after countdown
              setTimeout(() => {
                this.triggerHandler("game_start", {})
              }, 3000)
            }, 1000)
            break

          case "player_update":
            // Simulate opponent updates
            setTimeout(() => {
              const opponentProgress = Math.min(data.progress + Math.random() * 5, 100)
              const opponentWpm = data.wpm + (Math.random() * 10 - 5)
              const opponentAccuracy = Math.min(data.accuracy + (Math.random() * 5 - 2.5), 100)

              // Update player health based on opponent's performance
              if (opponentWpm > data.wpm) {
                const damage = Math.min(Math.round((opponentWpm - data.wpm) / 5), 10)
                this.triggerHandler("player_damaged", {
                  newHealth: Math.max(0, 100 - damage),
                })
              }

              this.triggerHandler("opponent_update", {
                progress: opponentProgress,
                wpm: opponentWpm,
                accuracy: opponentAccuracy,
                health: Math.max(0, 100 - Math.round(data.progress / 2)),
              })

              // Check for game over condition
              if (data.progress >= 100) {
                this.triggerHandler("game_over", { winner: this.id })
              } else if (opponentProgress >= 100) {
                this.triggerHandler("game_over", { winner: "opponent" })
              }
            }, 500)
            break

          case "player_finished":
            this.triggerHandler("game_over", { winner: this.id })
            break

          case "request_restart":
            // Reset the game state
            setTimeout(() => {
              this.triggerHandler("player_joined", {
                playerId: this.id,
                roomCode: data.roomCode,
              })

              this.triggerHandler("opponent_joined", {
                opponentId: `opponent-${Math.random().toString(36).substring(2, 9)}`,
              })

              this.triggerHandler("game_text", {
                text: "Practice makes perfect. The early bird catches the worm. A stitch in time saves nine. Actions speak louder than words. All that glitters is not gold. Better late than never.",
              })
            }, 1000)
            break
        }
      }, 300)

      return this
    },

    // Event listener
    on: function (event: string, callback: Function) {
      if (!this.handlers[event]) {
        this.handlers[event] = []
      }
      this.handlers[event].push(callback)
      return this
    },

    // Trigger event handlers
    triggerHandler: function (event: string, data: any) {
      if (this.handlers[event]) {
        this.handlers[event].forEach((callback) => callback(data))
      }
    },

    // Disconnect
    disconnect: function () {
      this.connected = false
      this.disconnected = true
      console.log("[MOCK SOCKET] Disconnected")
      return this
    },
  }

  return mockSocket as unknown as Socket
}
 */ 
