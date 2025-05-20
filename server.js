const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

// Import shared text generation logic
const { getTextByType } = require('./data/text-samples.cjs');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Store active rooms and their data
const rooms = {};

// Track active countdowns to prevent duplicates
const activeCountdowns = new Set();

// Interval time for inactive room cleanup (5 minutes)
const ROOM_CLEANUP_INTERVAL = 5 * 60 * 1000;
// Max inactive time for a room (10 minutes)
const MAX_ROOM_INACTIVE_TIME = 10 * 60 * 1000;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins during testing
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Set up room cleanup interval
  setInterval(() => {
    cleanupInactiveRooms();
  }, ROOM_CLEANUP_INTERVAL);

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle ping (heartbeat) messages
    socket.on('ping', () => {
      // Silently acknowledge the ping
    });

    // Create a new room
    socket.on('createRoom', ({ roomCode, settings }) => {
      // Log for debugging
      console.log(`Attempting to create/join room ${roomCode} with socket ${socket.id}`);
      
      // Check if room already exists
      if (rooms[roomCode]) {
        // Check if the creator is the same or if the game has already started
        if (rooms[roomCode].creator === socket.id || rooms[roomCode].gameStarted) {
          console.log(`Room ${roomCode} already exists, joining existing room`);
          socket.join(roomCode);
          socket.emit('roomCreated', { roomCode, playerId: socket.id });
          return;
        }
        
        // If room exists with different creator and game hasn't started
        console.log(`Room ${roomCode} already exists with different creator, sending error`);
        socket.emit('roomError', { error: 'Room already exists' });
        return;
      }
      
      // Generate text when creating the room so both players get the same text
      const gameText = generateGameText(settings);
      
      console.log(`Creating NEW room ${roomCode} with settings:`, settings);
      console.log(`Generated game text length: ${gameText.length}`);
      
      rooms[roomCode] = {
        creator: socket.id,
        players: [{ id: socket.id, ready: false, health: 100, wpm: 0, accuracy: 0, progress: 0 }],
        settings,
        gameText,  // Store the text in the room data
        gameStarted: false,
        gameFinished: false,
        playersLoaded: 0,
        countdownStarted: false,
        createdAt: Date.now(),
        lastUpdate: Date.now()
      };

      socket.join(roomCode);
      socket.emit('roomCreated', { roomCode, playerId: socket.id });
      console.log(`Room created: ${roomCode}`);
    });

    // Join an existing room
    socket.on('joinRoom', ({ roomCode }) => {
      console.log(`Attempting to join room ${roomCode}`);
      
      if (!roomCode) {
        socket.emit('roomError', { error: 'Invalid room code' });
        return;
      }
      
      if (rooms[roomCode]) {
        // Check if room is full (limit to 2 players)
        if (rooms[roomCode].players.length < 2) {
          socket.join(roomCode);
          
          // Add player to room data
          rooms[roomCode].players.push({
            id: socket.id,
            ready: false,
            health: 100,
            wpm: 0,
            accuracy: 0,
            progress: 0
          });
          
          // Update room's last activity timestamp
          rooms[roomCode].lastUpdate = Date.now();
          
          socket.emit('roomJoined', { 
            roomCode,
            playerId: socket.id,
            settings: rooms[roomCode].settings 
          });
          
          // Notify all players in the room about the new player
          io.to(roomCode).emit('playerJoined', {
            players: rooms[roomCode].players
          });
          
          console.log(`Player ${socket.id} joined room: ${roomCode}`);
        } else {
          socket.emit('roomError', { error: 'Room is full' });
        }
      } else {
        console.log(`Room ${roomCode} not found for join request`);
        socket.emit('roomError', { error: 'Room does not exist' });
      }
    });

    // Player ready status
    socket.on('playerReady', ({ roomCode }) => {
      if (rooms[roomCode]) {
        const playerIndex = rooms[roomCode].players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          rooms[roomCode].players[playerIndex].ready = true;
          
          // Update room last activity time
          rooms[roomCode].lastUpdate = Date.now();
          
          // Check if all players are ready
          const allReady = rooms[roomCode].players.every(p => p.ready);
          
          console.log(`Player ${socket.id} is ready in room ${roomCode}. All ready: ${allReady}`);
          console.log(`Room ${roomCode} has ${rooms[roomCode].players.length} players`);
          
          io.to(roomCode).emit('playerStatusUpdate', {
            players: rooms[roomCode].players,
            allReady
          });
          
          // Start the game if all players are ready
          if (allReady && rooms[roomCode].players.length === 2) {
            // Use the saved game text from when the room was created
            const gameText = rooms[roomCode].gameText;
            rooms[roomCode].gameStarted = true;
            rooms[roomCode].startTime = Date.now();
            
            // Set the room to transition mode to prevent premature deletion
            rooms[roomCode].inTransition = true;
            console.log(`Setting room ${roomCode} to transition mode to prevent deletion during navigation`);
            
            // Add transition timestamp for debugging
            rooms[roomCode].transitionStartTime = Date.now();
            
            console.log(`Starting game in room ${roomCode} with text length: ${gameText.length}`);
            console.log(`Text preview: ${gameText.substring(0, 50)}...`);
            
            // Send the text to both players for the battle
            io.to(roomCode).emit('gameStart', {
              gameText,
              players: rooms[roomCode].players
            });
            
            console.log(`Game started in room: ${roomCode}`);
          }
        }
      }
    });

    // Player has loaded the battle screen
    socket.on('battleScreenLoaded', ({ roomCode, previousSocketId, playerIndex }) => {
      console.log(`Received battleScreenLoaded for room ${roomCode}, socket ID: ${socket.id}`);
      
      if (!roomCode) {
        console.log(`Invalid room code for battleScreenLoaded`);
        socket.emit('roomError', { error: 'Invalid room code' });
        return;
      }
      
      if (rooms[roomCode]) {
        // Ensure socket is in the room
        socket.join(roomCode);
        
        console.log(`Room found with ${rooms[roomCode].players.length} players, game started: ${rooms[roomCode].gameStarted}`);
        
        // Update room last activity time
        rooms[roomCode].lastUpdate = Date.now();
        
        // Initialize playerLoaded counter if it doesn't exist
        if (typeof rooms[roomCode].playersLoaded === 'undefined') {
          rooms[roomCode].playersLoaded = 0;
        }
        
        // First check if the player ID is in the room
        let playerFound = rooms[roomCode].players.findIndex(p => p.id === socket.id);
        
        // If not found but we have previousSocketId, try to update the player's socket ID
        if (playerFound === -1 && previousSocketId) {
          const prevPlayerIndex = rooms[roomCode].players.findIndex(p => p.id === previousSocketId);
          
          if (prevPlayerIndex !== -1) {
            console.log(`Updating player socket ID from ${previousSocketId} to ${socket.id}`);
            rooms[roomCode].players[prevPlayerIndex].id = socket.id;
            playerFound = prevPlayerIndex;
          } else if (playerIndex !== undefined && playerIndex >= 0 && playerIndex < rooms[roomCode].players.length) {
            // Use player index directly if we have it and the previous ID wasn't found
            console.log(`Using player index ${playerIndex} to update player ID to ${socket.id}`);
            rooms[roomCode].players[playerIndex].id = socket.id;
            playerFound = playerIndex;
          }
        }
        
        // If we found the player, update their loaded status
        if (playerFound !== -1) {
          // If the player was marked inactive, reactivate them
          if (rooms[roomCode].players[playerFound].inactive) {
            console.log(`Reactivating player ${socket.id} in room ${roomCode}`);
            rooms[roomCode].players[playerFound].inactive = false;
          }
          
          // Mark as loaded if not already
          if (!rooms[roomCode].players[playerFound].loaded) {
            rooms[roomCode].players[playerFound].loaded = true;
            rooms[roomCode].playersLoaded += 1;
            
            console.log(`Player ${socket.id} loaded battle screen in room ${roomCode}. Players loaded: ${rooms[roomCode].playersLoaded}/${rooms[roomCode].players.length}`);
          }
        } else {
          // If player wasn't found at all in the room, try to add them
          if (rooms[roomCode].players.length < 2) {
            console.log(`Adding missing player ${socket.id} to room ${roomCode}`);
            
            // Add as a new player
            rooms[roomCode].players.push({
              id: socket.id,
              ready: true, // Mark as ready since we're in battle screen
              loaded: true,
              health: 100,
              wpm: 0,
              accuracy: 0,
              progress: 0
            });
            
            rooms[roomCode].playersLoaded += 1;
          } else {
            console.log(`Player ${socket.id} not found in room ${roomCode}, cannot mark as loaded`);
            socket.emit('roomError', { error: 'You are not a player in this room' });
            return;
          }
        }
        
        // Start countdown if not already started and all players are loaded
        const allPlayersLoaded = rooms[roomCode].playersLoaded >= rooms[roomCode].players.length;
        
        if (!rooms[roomCode].countdownStarted && allPlayersLoaded) {
          startCountdown(roomCode, io);
        } else {
          // Send current countdown state to the player who just loaded
          if (rooms[roomCode].countdownStarted && rooms[roomCode].currentCount) {
            socket.emit('syncCountdown', { count: rooms[roomCode].currentCount });
          }
        }
      } else {
        console.log(`Room ${roomCode} not found for battleScreenLoaded event`);
        socket.emit('roomError', { error: 'Room not found' });
      }
    });

    // Player typing progress updates
    socket.on('typingProgress', ({ roomCode, wpm, accuracy, progress }) => {
      if (rooms[roomCode] && rooms[roomCode].gameStarted) {
        // Ensure socket is in the room
        socket.join(roomCode);
        
        const playerIndex = rooms[roomCode].players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
          console.log(`Player ${socket.id} progress update:`, { wpm, accuracy, progress });
          
          // Make sure progress is in the expected range (0-100)
          const normalizedProgress = progress > 0 && progress <= 100 ? progress : 0;
          
          // Update player stats
          rooms[roomCode].players[playerIndex].wpm = wpm;
          rooms[roomCode].players[playerIndex].accuracy = accuracy;
          rooms[roomCode].players[playerIndex].progress = normalizedProgress;
          rooms[roomCode].players[playerIndex].lastUpdate = Date.now();
          
          // Update room last activity time
          rooms[roomCode].lastUpdate = Date.now();
          
          // Calculate damage to opponent based on typing speed and accuracy
          // We know there are only 2 players, so the opponent is the other player
          const opponentIndex = playerIndex === 0 ? 1 : 0;
          
          if (opponentIndex < rooms[roomCode].players.length) {
            const opponent = rooms[roomCode].players[opponentIndex];
            
            // Deal damage based on typing performance
            const damage = calculateDamage(wpm, accuracy, normalizedProgress);
            opponent.health = Math.max(0, opponent.health - damage);
            
            console.log(`Player ${socket.id} dealt ${damage.toFixed(2)} damage to opponent. Opponent health: ${opponent.health}`);
            
            // Create a broadcast-safe version of the update
            const gameUpdateData = {
              timestamp: Date.now(),
              players: rooms[roomCode].players.map(p => ({
                id: p.id,
                health: p.health,
                wpm: p.wpm,
                accuracy: p.accuracy,
                progress: p.progress
              }))
            };
            
            // Send to all players in the room
            io.to(roomCode).emit('gameUpdate', gameUpdateData);
            
            // Check if game is over
            if (opponent.health <= 0) {
              rooms[roomCode].gameFinished = true;
              io.to(roomCode).emit('gameOver', {
                winner: socket.id,
                players: rooms[roomCode].players
              });
              
              console.log(`Game over in room ${roomCode}. Winner: ${socket.id}`);
            }
          }
        }
      }
    });

    // Player finishes typing
    socket.on('typingComplete', ({ roomCode, wpm, accuracy, time }) => {
      if (rooms[roomCode] && rooms[roomCode].gameStarted) {
        // Ensure socket is in the room
        socket.join(roomCode);
        
        const playerIndex = rooms[roomCode].players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
          // Update final stats
          rooms[roomCode].players[playerIndex].wpm = wpm;
          rooms[roomCode].players[playerIndex].accuracy = accuracy;
          rooms[roomCode].players[playerIndex].completionTime = time;
          rooms[roomCode].players[playerIndex].progress = 100; // Set to 100% completion
          
          // Update room last activity time
          rooms[roomCode].lastUpdate = Date.now();
          
          // Deal final damage to opponent
          const opponentIndex = playerIndex === 0 ? 1 : 0;
          
          if (opponentIndex < rooms[roomCode].players.length) {
            const opponent = rooms[roomCode].players[opponentIndex];
            
            // Bigger damage for completing the text
            const finalDamage = calculateFinalDamage(wpm, accuracy);
            opponent.health = Math.max(0, opponent.health - finalDamage);
            
            console.log(`Player ${socket.id} completed typing with ${wpm} WPM and dealt ${finalDamage.toFixed(2)} final damage. Opponent health: ${opponent.health}`);
            
            // Check if opponent's health is zero
            if (opponent.health <= 0) {
              rooms[roomCode].gameFinished = true;
              io.to(roomCode).emit('gameOver', {
                winner: socket.id,
                players: rooms[roomCode].players
              });
              
              console.log(`Game over in room ${roomCode}. Winner: ${socket.id}`);
            } else {
              // Just update the game state
              io.to(roomCode).emit('gameUpdate', {
                players: rooms[roomCode].players
              });
            }
          }
        }
      }
    });

    // Leave room
    socket.on('leaveRoom', ({ roomCode }) => {
      if (rooms[roomCode]) {
        leaveRoom(socket, roomCode);
      }
    });

    // Disconnection handling
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Find and leave any rooms the player was in
      Object.keys(rooms).forEach(roomCode => {
        const playerIndex = rooms[roomCode].players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          leaveRoom(socket, roomCode);
        }
      });
    });

    // Rematch request
    socket.on('rematchRequest', ({ originalRoomCode, newRoomCode, settings }) => {
      console.log(`Rematch request from ${socket.id} for room ${originalRoomCode} -> ${newRoomCode}`);
      
      if (!originalRoomCode || !newRoomCode) {
        socket.emit('error', { error: 'Invalid room parameters' });
        return;
      }
      
      // Check if the original room exists
      if (rooms[originalRoomCode]) {
        // Find the opponent
        const opponent = rooms[originalRoomCode].players.find(p => p.id !== socket.id && !p.inactive);
        
        if (opponent) {
          // Forward the request to the opponent
          io.to(opponent.id).emit('rematchRequest', {
            roomCode: newRoomCode,
            fromSocketId: socket.id,
            settings
          });
          
          console.log(`Forwarded rematch request to ${opponent.id}`);
        } else {
          socket.emit('error', { error: 'Opponent not found or inactive' });
        }
      } else {
        socket.emit('error', { error: 'Original room not found' });
      }
    });
    
    // Rematch accepted
    socket.on('rematchAccepted', ({ originalRoomCode, newRoomCode }) => {
      console.log(`Rematch accepted by ${socket.id} for room ${newRoomCode}`);
      
      if (!originalRoomCode || !newRoomCode) {
        socket.emit('error', { error: 'Invalid room parameters' });
        return;
      }
      
      // Notify the original requester
      if (rooms[originalRoomCode]) {
        // Find the requester (the other player)
        const requester = rooms[originalRoomCode].players.find(p => p.id !== socket.id && !p.inactive);
        
        if (requester) {
          // Notify the requester
          io.to(requester.id).emit('rematchAccepted', {
            roomCode: newRoomCode
          });
          
          console.log(`Notified ${requester.id} that rematch was accepted`);
        }
      }
    });
    
    // Rematch declined
    socket.on('rematchDeclined', ({ originalRoomCode }) => {
      console.log(`Rematch declined by ${socket.id} for room ${originalRoomCode}`);
      
      if (!originalRoomCode) {
        return;
      }
      
      // Notify the original requester
      if (rooms[originalRoomCode]) {
        // Find the requester (the other player)
        const requester = rooms[originalRoomCode].players.find(p => p.id !== socket.id && !p.inactive);
        
        if (requester) {
          // Notify the requester
          io.to(requester.id).emit('rematchDeclined');
          
          console.log(`Notified ${requester.id} that rematch was declined`);
        }
      }
    });

    // Get game status (for debugging)
    socket.on('getGameStatus', ({ roomCode, previousSocketId, playerIndex }) => {
      console.log(`Received game status request for room ${roomCode}`);
      
      if (!roomCode) {
        socket.emit('gameStatusResponse', { error: 'Invalid room code' });
        return;
      }
      
      if (rooms[roomCode]) {
        const room = rooms[roomCode];
        
        // First check if the player is already in the room
        let playerFound = false;
        room.players.forEach(player => {
          if (player.id === socket.id) {
            playerFound = true;
          }
        });
        
        // If player not found but has previousSocketId, check for that
        if (!playerFound && previousSocketId) {
          let prevPlayerIndex = -1;
          room.players.forEach((player, index) => {
            if (player.id === previousSocketId) {
              prevPlayerIndex = index;
            }
          });
          
          // Update the player's socket ID if found
          if (prevPlayerIndex !== -1) {
            console.log(`Updating player socket ID from ${previousSocketId} to ${socket.id} in getGameStatus`);
            room.players[prevPlayerIndex].id = socket.id;
            playerFound = true;
            
            // Add to socket.io room
            socket.join(roomCode);
          }
        }
        
        // Update room last activity time
        room.lastUpdate = Date.now();
        
        socket.emit('gameStatusResponse', {
          gameStarted: room.gameStarted,
          playersLoaded: room.playersLoaded || 0,
          playersCount: room.players.length,
          countdownStarted: room.countdownStarted || false,
          currentCount: room.currentCount || null,
          playerFound
        });
        
        // If both players are loaded but countdown hasn't started, try to start it
        if ((room.playersLoaded || 0) >= room.players.length && !(room.countdownStarted || false)) {
          startCountdown(roomCode, io);
        }
      } else {
        console.log(`Room ${roomCode} not found for game status request`);
        socket.emit('gameStatusResponse', { error: 'Room not found' });
      }
    });

    // Ensure socket is in room
    socket.on('ensureInRoom', ({ roomCode, previousSocketId, playerIndex }) => {
      console.log(`ensureInRoom request for room ${roomCode} from socket ${socket.id}`);
      
      if (!roomCode) {
        socket.emit('roomError', { error: 'Invalid room code' });
        return;
      }
      
      if (rooms[roomCode]) {
        // Check if socket is already a player in the room
        const playerFound = rooms[roomCode].players.findIndex(p => p.id === socket.id);
        
        if (playerFound !== -1) {
          // Player is already in the room
          socket.join(roomCode);
          console.log(`Ensured socket ${socket.id} is in room ${roomCode}`);
          
          // Update player's last activity timestamp
          rooms[roomCode].players[playerFound].lastUpdate = Date.now();
          rooms[roomCode].lastUpdate = Date.now();
          
          // Send current game state
          socket.emit('gameUpdate', {
            timestamp: Date.now(),
            players: rooms[roomCode].players.map(p => ({
              id: p.id,
              health: p.health,
              wpm: p.wpm,
              accuracy: p.accuracy,
              progress: p.progress
            }))
          });
          
          // If countdown is in progress, sync the current countdown value
          if (rooms[roomCode].countdownStarted && !rooms[roomCode].gameStarted && rooms[roomCode].currentCount) {
            socket.emit('syncCountdown', { count: rooms[roomCode].currentCount });
          }
          
          // If battle has already started, make sure client knows
          if (rooms[roomCode].gameStarted) {
            socket.emit('battleStart');
          }
        } else if (previousSocketId) {
          // Try to find the player with the previous socket ID
          const prevPlayerIndex = rooms[roomCode].players.findIndex(p => p.id === previousSocketId);
          
          if (prevPlayerIndex !== -1) {
            console.log(`Found player with previous socket ID ${previousSocketId}, updating to ${socket.id}`);
            
            // Update the socket ID
            rooms[roomCode].players[prevPlayerIndex].id = socket.id;
            
            // Add to socket.io room
            socket.join(roomCode);
            
            console.log(`Reconnected socket ${socket.id} to room ${roomCode} (was ${previousSocketId})`);
            
            // Send current game state
            socket.emit('gameUpdate', {
              timestamp: Date.now(),
              players: rooms[roomCode].players.map(p => ({
                id: p.id,
                health: p.health,
                wpm: p.wpm,
                accuracy: p.accuracy,
                progress: p.progress
              }))
            });
            
            // If countdown is in progress, sync the current countdown value
            if (rooms[roomCode].countdownStarted && !rooms[roomCode].gameStarted && rooms[roomCode].currentCount) {
              socket.emit('syncCountdown', { count: rooms[roomCode].currentCount });
            }
            
            // If battle has already started, make sure client knows
            if (rooms[roomCode].gameStarted) {
              socket.emit('battleStart');
            }
          } else if (playerIndex !== undefined && playerIndex >= 0 && playerIndex < rooms[roomCode].players.length) {
            // If we have a player index but no matching previous socket ID
            console.log(`Using player index ${playerIndex} to reconnect socket ${socket.id} to room ${roomCode}`);
            
            // Update the socket ID
            rooms[roomCode].players[playerIndex].id = socket.id;
            
            // Add to socket.io room
            socket.join(roomCode);
            
            // Send current game state
            socket.emit('gameUpdate', {
              timestamp: Date.now(),
              players: rooms[roomCode].players.map(p => ({
                id: p.id,
                health: p.health,
                wpm: p.wpm,
                accuracy: p.accuracy,
                progress: p.progress
              }))
            });
            
            // If countdown is in progress, sync the current countdown value
            if (rooms[roomCode].countdownStarted && !rooms[roomCode].gameStarted && rooms[roomCode].currentCount) {
              socket.emit('syncCountdown', { count: rooms[roomCode].currentCount });
            }
            
            // If battle has already started, make sure client knows
            if (rooms[roomCode].gameStarted) {
              socket.emit('battleStart');
            }
          } else {
            console.log(`Socket ${socket.id} is not a player in room ${roomCode} and previous socket ID ${previousSocketId} not found`);
            socket.emit('roomError', { error: 'You are not a player in this room' });
          }
        } else {
          console.log(`Socket ${socket.id} is not a player in room ${roomCode}`);
          socket.emit('roomError', { error: 'You are not a player in this room' });
        }
      } else {
        console.log(`Room ${roomCode} not found for ensureInRoom request`);
        socket.emit('roomError', { error: 'Room not found' });
      }
    });
  });

  // Improved synchronized countdown function
  function startCountdown(roomCode, io) {
    if (!rooms[roomCode] || rooms[roomCode].countdownStarted || activeCountdowns.has(roomCode)) {
      console.log(`Cannot start countdown for room ${roomCode}: already started or room invalid`);
      return;
    }
    
    // Mark countdown as started
    rooms[roomCode].countdownStarted = true;
    activeCountdowns.add(roomCode);
    
    console.log(`Starting synchronized countdown in room ${roomCode}`);
    
    // Start with count 3
    let count = 3;
    rooms[roomCode].currentCount = count;
    
    // Send initial countdown signal
    io.to(roomCode).emit('syncCountdown', { count });
    console.log(`Sent countdown: ${count} to room ${roomCode}`);
    
    // Create a repeating interval
    const countdownInterval = setInterval(() => {
      // Decrement the count
      count--;
      
      // Check if room still exists
      if (!rooms[roomCode]) {
        clearInterval(countdownInterval);
        activeCountdowns.delete(roomCode);
        console.log(`Countdown stopped: room ${roomCode} no longer exists`);
        return;
      }
      
      // Update the current count in room data
      rooms[roomCode].currentCount = count;
      console.log(`Sending countdown: ${count} to room ${roomCode}`);
      
      if (count > 0) {
        // Send the current countdown number
        io.to(roomCode).emit('syncCountdown', { count });
      } else {
        // Send 0 and start the battle
        io.to(roomCode).emit('syncCountdown', { count: 0 });
        io.to(roomCode).emit('battleStart');
        
        // Mark game as started
        if (rooms[roomCode]) {
          rooms[roomCode].gameStarted = true;
        }
        
        console.log(`Battle started in room ${roomCode}`);
        
        // Clean up
        clearInterval(countdownInterval);
        activeCountdowns.delete(roomCode);
      }
    }, 1000);
  }

  // Helper function to handle leaving a room
  function leaveRoom(socket, roomCode) {
    if (!rooms[roomCode]) {
      console.log(`Cannot leave room ${roomCode}: room does not exist`);
      return;
    }
    
    // Remove player from socket.io room
    socket.leave(roomCode);
    
    // Find the player in the room data
    const playerIndex = rooms[roomCode].players.findIndex(p => p.id === socket.id);
    
    if (playerIndex === -1) {
      console.log(`Player ${socket.id} not found in room ${roomCode}, cannot leave`);
      return;
    }
    
    // Critical change: NEVER delete a room if game has started
    if (rooms[roomCode].gameStarted) {
      console.log(`Game already started in room ${roomCode}, marking player ${socket.id} as inactive`);
      // Instead of removing, mark player as inactive
      rooms[roomCode].players[playerIndex].inactive = true;
      rooms[roomCode].lastUpdate = Date.now();
      return;
    }
    
    // Remove player from room data if game hasn't started
    console.log(`Player ${socket.id} left room: ${roomCode}`);
      rooms[roomCode].players.splice(playerIndex, 1);
      
      // If the room is now empty, delete it
      if (rooms[roomCode].players.length === 0) {
      // Clean up active countdown if it exists
      if (activeCountdowns.has(roomCode)) {
        activeCountdowns.delete(roomCode);
      }
      
        delete rooms[roomCode];
        console.log(`Room deleted: ${roomCode}`);
      } else {
        // Notify remaining players
        io.to(roomCode).emit('playerLeft', {
          playerId: socket.id,
          players: rooms[roomCode].players
        });
    }
  }

  // Helper function to generate game text based on settings
  function generateGameText(settings) {
    // Use shared logic from data/text-samples.cjs
    const { type, language } = settings;
    return getTextByType(type, language);
  }

  // Helper function to calculate damage based on typing performance
  function calculateDamage(wpm, accuracy, progress) {
    // Drastically reduce base damage for much longer battles
    const baseWpmDamage = wpm * 0.01; // Reduced from 0.02
    
    // Accuracy multiplier (0.5 to 1.2) - scales less steeply
    const accuracyMultiplier = 0.5 + (accuracy / 250); // Reduced impact from accuracy
    
    // Progress multiplier (0.5 to 1.0) - reduced impact
    const progressMultiplier = 0.5 + (progress / 250); // Reduced from 200
    
    // Calculate final damage
    const damage = baseWpmDamage * accuracyMultiplier * progressMultiplier;
    
    // Cap damage per update to 3 to prevent quick kills
    const cappedDamage = Math.min(damage, 3);
    
    console.log(`Damage calculation:`, {
      wpm,
      accuracy,
      progress,
      baseWpmDamage,
      accuracyMultiplier,
      progressMultiplier,
      finalDamage: cappedDamage
    });
    
    return cappedDamage;
  }

  // Helper function to calculate final damage when a player completes typing
  function calculateFinalDamage(wpm, accuracy) {
    // Reduce completion bonus damage to extend battles
    const baseCompletionDamage = 5; // Reduced from 10
    const wpmBonus = wpm * 0.015; // Reduced from 0.03
    const accuracyMultiplier = accuracy / 100;
    
    // Cap the final damage to prevent quick kills
    const damage = (baseCompletionDamage + wpmBonus) * accuracyMultiplier;
    return Math.min(damage, 15); // Cap at 15 damage (reduced from 25)
  }

  // Helper function to clean up inactive rooms
  function cleanupInactiveRooms() {
    const now = Date.now();
    let roomsDeleted = 0;
    
    Object.keys(rooms).forEach(roomCode => {
      const room = rooms[roomCode];
      
      // Check if the room has any active players
      if (room.players.length === 0) {
        delete rooms[roomCode];
        activeCountdowns.delete(roomCode);
        roomsDeleted++;
        return;
      }
      
      // Calculate how long since the last activity in the room
      const lastActivity = room.lastUpdate || room.createdAt;
      const inactiveTime = now - lastActivity;
      
      if (inactiveTime > MAX_ROOM_INACTIVE_TIME) {
        console.log(`Deleting inactive room ${roomCode} - inactive for ${Math.round(inactiveTime / 1000 / 60)} minutes`);
        
        // Notify any connected players that the room was deleted
        io.to(roomCode).emit('roomError', { error: 'Room closed due to inactivity' });
        
        // Clean up the room
        delete rooms[roomCode];
        activeCountdowns.delete(roomCode);
        roomsDeleted++;
      }
    });
    
    if (roomsDeleted > 0) {
      console.log(`Cleaned up ${roomsDeleted} inactive rooms. Active rooms: ${Object.keys(rooms).length}`);
    }
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});