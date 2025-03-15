import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

interface Player {
  id: string;
  name: string;
  score: number;
  isDrawing: boolean;
  hasGuessedCorrectly?: boolean;
}

interface Room {
  id: string;
  players: Player[];
  currentWord?: string;
  currentDrawer?: string;
  gameState: 'waiting' | 'playing' | 'between-rounds';
  roundTime: number;
  currentRound: number;
  maxRounds: number;
  wordOptions?: string[];
}

const rooms = new Map<string, Room>();

// Words for drawing game
const wordList = [
  'dog', 'cat', 'house', 'tree', 'beach', 'phone', 'computer', 'chair', 
  'table', 'book', 'car', 'bicycle', 'mountain', 'river', 'ocean', 'sun', 
  'moon', 'star', 'pizza', 'hamburger', 'cake', 'flower', 'bird', 'fish',
  'clock', 'shoe', 'hat', 'glasses', 'shirt', 'pants', 'door', 'window'
];

// Lists for generating fun room IDs
const adjectives = [
  'happy', 'funny', 'silly', 'clever', 'wild', 'fluffy', 'bouncy', 'crazy',
  'magical', 'dancing', 'sparkly', 'jumpy', 'giggly', 'playful', 'fancy',
  'colorful', 'jazzy', 'cosmic', 'mighty', 'super', 'dazzling', 'glowing'
];

const nouns = [
  'panda', 'dragon', 'tiger', 'unicorn', 'penguin', 'monkey', 'robot', 'wizard',
  'dinosaur', 'dolphin', 'raccoon', 'koala', 'rocket', 'ninja', 'pizza',
  'pirate', 'monster', 'banana', 'cupcake', 'rainbow', 'octopus', 'llama'
];

// Function to generate a fun room ID
function generateFunRoomId(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 100); // Optional number for uniqueness
  return `${adjective}-${noun}-${number}`;
}

// Map to track word selection timers
const wordSelectionTimers = new Map<string, NodeJS.Timeout>();

// Helper to clear word selection timers
function clearWordSelectionTimer(playerId: string) {
  const timer = wordSelectionTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    wordSelectionTimers.delete(playerId);
  }
}

export function setupSocketServer(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000
  });

  // Track metrics for debugging
  const connectionCount = {
    total: 0,
    active: 0,
    disconnected: 0
  };

  // Better connection logging
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });

  io.on('connection', (socket) => {
    connectionCount.total++;
    connectionCount.active++;
    
    console.log(`New client connected: ${socket.id}`);
    console.log(`Connection stats - Total: ${connectionCount.total}, Active: ${connectionCount.active}, Disconnected: ${connectionCount.disconnected}`);
    console.log(`Socket handshake: ${JSON.stringify({
      headers: socket.handshake.headers['user-agent'],
      query: socket.handshake.query,
      time: new Date().toISOString()
    })}`);

    // Create or join a room
    socket.on('join-room', ({ roomId, playerName }) => {
      console.log(`Join room request received: roomId=${roomId}, playerName=${playerName}`);
      let room: Room;

      if (!roomId) {
        // Create a new room with a fun ID instead of UUID
        roomId = generateFunRoomId();
        console.log(`Creating new room with ID: ${roomId}`);
        room = {
          id: roomId,
          players: [],
          gameState: 'waiting',
          roundTime: 30,
          currentRound: 0,
          maxRounds: 3
        };
        rooms.set(roomId, room);
      } else {
        // Get existing room
        room = rooms.get(roomId) as Room;
        
        // If room doesn't exist, create a new one
        if (!room) {
          console.log(`Room ${roomId} not found, creating new room`);
          room = {
            id: roomId,
            players: [],
            gameState: 'waiting',
            roundTime: 30,
            currentRound: 0,
            maxRounds: 3
          };
          rooms.set(roomId, room);
        } else {
          console.log(`Joining existing room ${roomId} with ${room.players.length} players`);
        }
      }

      // Add player to room
      const player: Player = {
        id: socket.id,
        name: playerName || `Player ${room.players.length + 1}`,
        score: 0,
        isDrawing: false
      };

      console.log(`Adding player to room ${roomId}: ${player.name} (${player.id})`);
      room.players.push(player);
      socket.join(roomId);

      // Send room data to all clients in the room
      console.log(`Emitting room-update to all clients in room ${roomId}`);
      io.to(roomId).emit('room-update', room);
      
      console.log(`Emitting room-joined to player ${player.id}`);
      socket.emit('room-joined', { roomId, playerId: player.id });

      // No longer auto-start the game when 2+ players join
      // Instead, wait for the start-game event
    });

    // New event handler for manually starting the game
    socket.on('start-game', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      // Only allow starting the game if there are at least 2 players
      if (room.players.length < 2) {
        socket.emit('chat-update', {
          playerId: 'system',
          playerName: 'System',
          message: 'Need at least 2 players to start the game'
        });
        return;
      }

      // Only start if the game is in waiting state
      if (room.gameState !== 'waiting') {
        socket.emit('chat-update', {
          playerId: 'system',
          playerName: 'System',
          message: 'Game is already in progress'
        });
        return;
      }

      console.log(`Game manually started in room ${roomId} by ${socket.id}`);
      startGame(io, room);
    });

    // Handle drawing data
    socket.on('draw', ({ roomId, drawData }) => {
      // Forward drawing data to all clients in the room except the sender
      socket.to(roomId).emit('draw-update', drawData);
    });

    // Handle chat messages and word guessing
    socket.on('chat-message', ({ roomId, message, playerId }) => {
      console.log(`Received chat message from ${playerId} in room ${roomId}: "${message}"`);
      
      const room = rooms.get(roomId);
      if (!room) {
        console.error(`Room ${roomId} not found for chat message`);
        return;
      }

      const player = room.players.find(p => p.id === playerId);
      if (!player) {
        console.error(`Player ${playerId} not found in room ${roomId}`);
        return;
      }

      console.log(`Processing message from ${player.name} (${playerId}): "${message}"`);

      // Special debug command to force drawing mode
      if (message.startsWith('/drawme')) {
        console.log(`Player ${player.name} forcing drawing mode`);
        // Reset drawing flag for all players
        room.players.forEach(p => p.isDrawing = false);
        
        // Set this player as drawer
        player.isDrawing = true;
        room.currentDrawer = player.id;
        room.gameState = 'playing';
        
        // Send the room update
        io.to(roomId).emit('room-update', room);
        
        // Notify about the new drawer
        io.to(roomId).emit('new-drawer', { 
          drawerId: player.id,
          drawerName: player.name,
          roundNumber: room.currentRound
        });
        
        // Generate word options
        const wordOptions = getRandomWords(3);
        room.wordOptions = wordOptions;
        
        // Send word options only to the drawer
        socket.emit('word-options', { options: wordOptions });
        
        return;
      }

      // Debug command to show current word
      if (message === '/word' && player.id === room.currentDrawer) {
        socket.emit('chat-update', {
          playerId: 'system',
          playerName: 'System',
          message: `Current word is: "${room.currentWord}"`
        });
        return;
      }

      // Debug command to show game state
      if (message === '/state') {
        const stateInfo = `Game state: ${room.gameState}
Current drawer: ${room.currentDrawer ? room.players.find(p => p.id === room.currentDrawer)?.name : 'None'}
Current word: ${player.id === room.currentDrawer ? room.currentWord : '[hidden]'}
Round: ${room.currentRound}/${room.maxRounds}`;
        
        socket.emit('chat-update', {
          playerId: 'system',
          playerName: 'System',
          message: stateInfo
        });
        return;
      }

      // Debug command to show all player states
      if (message === '/players') {
        const playersInfo = room.players.map(p => 
          `${p.name}: score=${p.score}, drawing=${p.isDrawing}, guessed=${p.hasGuessedCorrectly || false}`
        ).join('\n');
        
        socket.emit('chat-update', {
          playerId: 'system',
          playerName: 'System',
          message: `Players in room:\n${playersInfo}`
        });
        return;
      }

      // Check if message is the correct word
      if (room.gameState === 'playing' && room.currentWord) {
        console.log(`Checking guess: "${message.toLowerCase()}" against word "${room.currentWord.toLowerCase()}" by ${player.name}`);
        console.log(`Game state: ${room.gameState}, Current word: ${room.currentWord}, Player is drawer: ${player.id === room.currentDrawer}`);
        
        // Check if the guess matches the word exactly (case insensitive)
        const guessMatches = message.toLowerCase() === room.currentWord.toLowerCase();
        const playerIsNotDrawer = player.id !== room.currentDrawer;

        console.log(`Guess matches: ${guessMatches}, Player is not drawer: ${playerIsNotDrawer}`);
        
        if (guessMatches && playerIsNotDrawer) {
          // Player guessed correctly
          console.log(`CORRECT GUESS by ${player.name}!`);
          player.score += 100;
          player.hasGuessedCorrectly = true;
          
          // Join the player to a guessed-room to track who has guessed
          socket.join(`${roomId}-guessed`);
          
          console.log(`Player ${player.name} guessed the word: ${room.currentWord}`);
          console.log(`Updated player state: ${JSON.stringify(player)}`);
          
          // Notify everyone
          io.to(roomId).emit('player-guessed', { playerId: player.id, playerName: player.name });
          socket.emit('word-guessed', { word: room.currentWord });
          
          // Send updated player list to everyone
          io.to(roomId).emit('room-update', room);
          
          // Check if all players have guessed
          const nonDrawingPlayers = room.players.filter(p => p.id !== room.currentDrawer);
          const allGuessed = nonDrawingPlayers.every(p => p.hasGuessedCorrectly);
          
          console.log(`Non-drawing players: ${nonDrawingPlayers.length}, All guessed: ${allGuessed}`);
          
          if (allGuessed) {
            console.log('All players have guessed the word, moving to next round');
            
            // Notify all players about moving to next round
            io.to(roomId).emit('chat-update', {
              playerId: 'system',
              playerName: 'System',
              message: `All players guessed the word! Next round starting in 3 seconds...`
            });
            
            // Delay before starting next round to give time for celebration
            setTimeout(() => {
              // Move to next round after delay
              nextRound(io, room);
            }, 3000); // 3 second delay
          }
          
          // Don't emit this as a regular chat message
          return;
        } else {
          // Regular chat message
          console.log(`Regular chat message from ${player.name}: "${message}"`);
          io.to(roomId).emit('chat-update', {
            playerId,
            playerName: player.name,
            message
          });
        }
      } else {
        // Game not in playing state or no current word, just send as regular chat
        console.log(`Chat message in non-playing state from ${player.name}: "${message}"`);
        io.to(roomId).emit('chat-update', {
          playerId,
          playerName: player.name,
          message
        });
      }
    });

    // Handle word selection by drawer
    socket.on('word-selected', ({ roomId, word }) => {
      const room = rooms.get(roomId);
      if (!room || room.currentDrawer !== socket.id) return;

      console.log(`Drawer ${socket.id} selected word: ${word}`);
      
      // Clear any word selection timer
      clearWordSelectionTimer(socket.id);
      
      // Update room state with the word and change game state to playing
      room.currentWord = word;
      room.wordOptions = undefined;
      room.gameState = 'playing'; // Ensure game state is set to playing
      
      console.log(`Game state changed to: ${room.gameState}`);
      
      // Notify everyone that word was selected
      io.to(roomId).emit('round-started', {
        drawerId: room.currentDrawer,
        wordLength: word.length
      });
      
      // Send the actual word to the drawer
      socket.emit('word-to-draw', { word });
      
      // Send updated room to everyone
      io.to(roomId).emit('room-update', room);
      
      // Start round timer
      startRoundTimer(io, room);
    });

    // Handle clear canvas
    socket.on('clear-canvas', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.currentDrawer !== socket.id) return;
      
      io.to(roomId).emit('canvas-cleared');
    });

    // Handle player disconnect
    socket.on('disconnect', (reason) => {
      connectionCount.active--;
      connectionCount.disconnected++;
      
      console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
      console.log(`Connection stats - Total: ${connectionCount.total}, Active: ${connectionCount.active}, Disconnected: ${connectionCount.disconnected}`);
      
      // Clear any word selection timer for this player
      clearWordSelectionTimer(socket.id);
      
      // Find and remove player from any rooms
      for (const [roomId, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
          // Remove player from room
          room.players.splice(playerIndex, 1);
          
          // If this was the drawer, move to next round
          if (room.currentDrawer === socket.id && room.gameState === 'playing') {
            nextRound(io, room);
          }
          
          // If not enough players, reset game
          if (room.players.length < 2) {
            room.gameState = 'waiting';
            room.currentRound = 0;
            io.to(roomId).emit('game-stopped', { reason: 'Not enough players' });
          }
          
          // Update room state for remaining players
          io.to(roomId).emit('room-update', room);
          
          // Remove room if empty
          if (room.players.length === 0) {
            rooms.delete(roomId);
          }
          
          break;
        }
      }
    });
  });

  return io;
}

// Helper functions

function startGame(io: SocketIOServer, room: Room) {
  room.gameState = 'playing';
  room.currentRound = 1;
  
  // Reset player scores
  room.players.forEach(player => {
    player.score = 0;
    player.isDrawing = false;
  });
  
  // Select first drawer and start round
  nextRound(io, room);
  
  // Notify everyone that game started
  io.to(room.id).emit('game-started', { 
    currentRound: room.currentRound,
    maxRounds: room.maxRounds
  });
}

function nextRound(io: SocketIOServer, room: Room) {
  // Clear any timers
  // (In a real implementation, you'd store and clear the timer)
  
  console.log('Starting next round for room:', room.id);
  
  // Check if game should end
  if (room.currentRound > room.maxRounds) {
    console.log('Max rounds reached, ending game');
    endGame(io, room);
    return;
  }
  
  // Reset drawing flag and guessed status for all players
  room.players.forEach(p => {
    p.isDrawing = false;
    p.hasGuessedCorrectly = false;
  });
  
  // Remove all players from the guessed room for this round
  const guessedRoom = `${room.id}-guessed`;
  const socketIdsInGuessedRoom = io.sockets.adapter.rooms.get(guessedRoom);
  if (socketIdsInGuessedRoom) {
    for (const socketId of socketIdsInGuessedRoom) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(guessedRoom);
      }
    }
  }
  
  // Select next drawer (round robin)
  const currentDrawerIndex = room.players.findIndex(p => p.id === room.currentDrawer);
  console.log('Current drawer index:', currentDrawerIndex);
  
  const nextDrawerIndex = (currentDrawerIndex + 1) % room.players.length;
  console.log('Next drawer index:', nextDrawerIndex);
  
  const nextDrawer = room.players[nextDrawerIndex];
  console.log('Selected next drawer:', nextDrawer.name, nextDrawer.id);
  
  nextDrawer.isDrawing = true;
  room.currentDrawer = nextDrawer.id;
  
  // Generate word options
  const wordOptions = getRandomWords(3);
  room.wordOptions = wordOptions;
  
  // Move to between-rounds state
  room.gameState = 'between-rounds';
  
  // Send word options only to the drawer
  const drawerSocket = io.sockets.sockets.get(nextDrawer.id);
  if (drawerSocket) {
    console.log('Sending word options to drawer:', nextDrawer.name);
    drawerSocket.emit('word-options', { options: wordOptions });
    
    // Start a timer for word selection
    clearWordSelectionTimer(nextDrawer.id); // Clear any existing timer
    
    const timer = setTimeout(() => {
      // If the room still exists and the player is still the drawer
      if (rooms.has(room.id) && room.currentDrawer === nextDrawer.id && room.gameState === 'between-rounds') {
        console.log(`Word selection timeout for ${nextDrawer.name}, auto-selecting a word`);
        
        // Select a random word
        const randomWord = wordOptions[Math.floor(Math.random() * wordOptions.length)];
        
        // Update room state
        room.currentWord = randomWord;
        room.wordOptions = undefined;
        room.gameState = 'playing';
        
        console.log(`Auto-selected word: ${randomWord}, game state changed to: ${room.gameState}`);
        
        // Notify everyone that word was selected
        io.to(room.id).emit('round-started', {
          drawerId: nextDrawer.id,
          wordLength: randomWord.length
        });
        
        // Send the actual word to the drawer
        drawerSocket.emit('word-to-draw', { word: randomWord });
        
        // Send updated room to everyone
        io.to(room.id).emit('room-update', room);
        
        // Start round timer
        startRoundTimer(io, room);
      }
    }, 10000); // 10 seconds timeout
    
    wordSelectionTimers.set(nextDrawer.id, timer);
  } else {
    console.warn('Could not find drawer socket for:', nextDrawer.id);
  }
  
  // Notify everyone about the drawer
  console.log('Notifying all players about new drawer:', nextDrawer.name);
  io.to(room.id).emit('new-drawer', { 
    drawerId: nextDrawer.id,
    drawerName: nextDrawer.name,
    roundNumber: room.currentRound
  });
  
  // Send current room state to all players
  io.to(room.id).emit('room-update', room);
  
  // Increment round counter if we've gone through all players
  if (nextDrawerIndex === 0) {
    room.currentRound++;
  }
}

function endGame(io: SocketIOServer, room: Room) {
  room.gameState = 'waiting';
  
  // Sort players by score
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  
  // Notify everyone about game end and final scores
  io.to(room.id).emit('game-ended', { 
    players: sortedPlayers,
    winner: sortedPlayers[0]
  });
}

function startRoundTimer(io: SocketIOServer, room: Room) {
  // In a real implementation, you'd set up an actual timer
  // and store it to be canceled if needed
  
  // For now, just emit an event that will be handled by clients
  io.to(room.id).emit('round-timer-started', { 
    duration: room.roundTime
  });
  
  // Simulate a timer ending after roundTime seconds
  setTimeout(() => {
    if (rooms.has(room.id) && room.gameState === 'playing') {
      // Announce that time is up
      io.to(room.id).emit('round-ended', { 
        word: room.currentWord
      });
      
      // Notify players about the delay before next round
      io.to(room.id).emit('chat-update', {
        playerId: 'system',
        playerName: 'System',
        message: `Time's up! The word was "${room.currentWord}". Next round starting in 3 seconds...`
      });
      
      // Add delay before starting next round
      setTimeout(() => {
        nextRound(io, room);
      }, 3000); // 3 second delay
    }
  }, room.roundTime * 1000);
}

function getRandomWords(count: number): string[] {
  const words: string[] = [];
  const wordListCopy = [...wordList];
  
  for (let i = 0; i < count; i++) {
    if (wordListCopy.length === 0) break;
    const index = Math.floor(Math.random() * wordListCopy.length);
    words.push(wordListCopy[index]);
    wordListCopy.splice(index, 1);
  }
  
  return words;
} 