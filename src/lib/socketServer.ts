import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { wordList } from './wordList';

interface Player {
  id: string;
  name: string;
  score: number;
  previousScore: number;
  isDrawing: boolean;
  isHost: boolean;
}

interface Room {
  id: string;
  players: Player[];
  currentWord: string;
  currentDrawer: Player | null;
  isPlaying: boolean;
  roundNumber: number;
  maxRounds: number;
  roundStartTime: number;
  firstGuesser: boolean;
  gameState: 'waiting' | 'playing' | 'ended';
  hintTimer?: NodeJS.Timeout;
  wordOptions?: string[];
  roundEndTime: number;
  roundDuration: number;
  roundInterval: number;
  currentRound: number;
  roundIntervalTimer: NodeJS.Timeout | null;
  gameTimer: NodeJS.Timeout | null;
  gameStartTime: number;
  gameEndTime: number;
  gameDuration: number;
  gameInterval: number;
  gameMode: 'classic' | 'timeAttack' | 'team';
  gameSettings: {
    roundDuration: number;
    roundInterval: number;
    maxPlayers: number;
    minPlayers: number;
    maxRounds: number;
    gameDuration: number;
    gameInterval: number;
    gameMode: 'classic' | 'timeAttack' | 'team';
  };
  gameHistory: {
    roundNumber: number;
    word: string;
    drawer: string;
    guesses: {
      player: string;
      word: string;
      time: number;
      score: number;
    }[];
  }[];
  gameStats: {
    totalRounds: number;
    totalGuesses: number;
    correctGuesses: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    mostGuessedWord: string;
    mostGuessedWordCount: number;
    mostGuessedPlayer: string;
    mostGuessedPlayerCount: number;
    mostGuessedTime: number;
    mostGuessedTimeCount: number;
  };
  revealedLetters: string[];
}

const rooms = new Map<string, Room>();

// Lists for generating fun room IDs
const adjectives = [
  'happy', 'lucky', 'brave', 'clever', 'swift', 'mighty', 'wise', 'bold',
  'calm', 'cool', 'daring', 'eager', 'fair', 'gentle', 'kind', 'merry',
  'noble', 'proud', 'quiet', 'ready', 'smart', 'tender', 'witty', 'young'
];

const nouns = [
  'penguin', 'dolphin', 'tiger', 'eagle', 'lion', 'bear', 'wolf', 'owl',
  'fox', 'deer', 'duck', 'frog', 'fish', 'bird', 'cat', 'dog', 'horse',
  'sheep', 'cow', 'pig', 'chicken', 'rabbit', 'monkey', 'zebra'
];

// Helper functions
function getRandomWord(): string {
  const randomIndex = Math.floor(Math.random() * wordList.length);
  return wordList[randomIndex];
}

function generateRoomId(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}-${noun}-${Math.floor(Math.random() * 1000)}`;
}

function createRoom(): Room {
  return {
    id: generateRoomId(),
    players: [],
    currentWord: '',
    currentDrawer: null,
    isPlaying: false,
    roundNumber: 0,
    maxRounds: 10,
    roundStartTime: 0,
    firstGuesser: false,
    gameState: 'waiting',
    roundEndTime: 0,
    roundDuration: 60,
    roundInterval: 5,
    currentRound: 1,
    roundIntervalTimer: null,
    gameTimer: null,
    gameStartTime: 0,
    gameEndTime: 0,
    gameDuration: 600,
    gameInterval: 5,
    gameMode: 'classic',
    gameSettings: {
      roundDuration: 60,
      roundInterval: 5,
      maxPlayers: 8,
      minPlayers: 2,
      maxRounds: 10,
      gameDuration: 600,
      gameInterval: 5,
      gameMode: 'classic'
    },
    gameHistory: [],
    gameStats: {
      totalRounds: 0,
      totalGuesses: 0,
      correctGuesses: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      mostGuessedWord: '',
      mostGuessedWordCount: 0,
      mostGuessedPlayer: '',
      mostGuessedPlayerCount: 0,
      mostGuessedTime: 0,
      mostGuessedTimeCount: 0
    },
    revealedLetters: []
  };
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

export function setupSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('joinRoom', ({ roomId, playerName }) => {
      let room = rooms.get(roomId);

      if (!roomId) {
        roomId = generateRoomId();
        console.log(`Creating new room with ID: ${roomId}`);
        room = createRoom();
        rooms.set(roomId, room);
      } else {
        room = rooms.get(roomId);
        if (!room) {
          console.log(`Room ${roomId} not found, creating new room`);
          room = createRoom();
          rooms.set(roomId, room);
        }
      }

      // Add player to room
      const player: Player = {
        id: socket.id,
        name: playerName || `Player ${room.players.length + 1}`,
        score: 0,
        previousScore: 0,
        isDrawing: false,
        isHost: room.players.length === 0
      };
      room.players.push(player);
      socket.join(roomId);

      // Notify room of new player
      io.to(roomId).emit('playerJoined', {
        player: player.name,
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
      });

      // Send current game state to new player
      socket.emit('gameState', {
        currentWord: player.isDrawing ? room.currentWord : '***',
        currentDrawer: room.currentDrawer?.name || null,
        roundNumber: room.roundNumber,
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
      });
    });

    socket.on('startGame', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player || !player.isHost) return;

      startGame(io, room);
    });

    socket.on('startRound', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player || !player.isHost) return;

      startRound(io, room);
    });

    socket.on('guess', ({ roomId, guess }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      handleGuess(io, room, socket.id, guess);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      // Find and remove player from room
      for (const [roomId, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          const player = room.players[playerIndex];
          room.players.splice(playerIndex, 1);

          // If drawer disconnected, end round
          if (room.currentDrawer?.id === socket.id) {
            endRound(io, room);
          }

          // If no players left, remove room
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            // Notify remaining players
            io.to(roomId).emit('playerLeft', {
              player: player.name,
              players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
            });
          }
          break;
        }
      }
    });
  });

  return io;
}

// Helper functions

function startGame(io: Server, room: Room) {
  room.gameState = 'playing';
  room.currentRound = 1;
  
  // Reset player scores
  room.players.forEach(player => {
    player.score = 0;
    player.isDrawing = false;
  });
  
  // Select first drawer and start round
  nextRound(io, room);
  
  // Ensure round is still set to 1 after nextRound to prevent any increment issues
  room.currentRound = 1;
  
  // Notify everyone that game started
  io.to(room.id).emit('game-started', { 
    currentRound: room.currentRound,
    maxRounds: room.maxRounds
  });
  
  // Send updated room state to all clients with the correct round number
  io.to(room.id).emit('room-update', room);
}

function nextRound(io: Server, room: Room) {
  room.roundNumber++;
  room.currentWord = getRandomWord();
  room.currentDrawer = room.players[Math.floor(Math.random() * room.players.length)];
  room.isPlaying = true;
  room.gameState = 'playing';
  room.roundStartTime = Date.now();
  room.firstGuesser = false;

  // Notify players
  io.to(room.id).emit('roundStarted', {
    drawer: room.currentDrawer.name,
    wordLength: room.currentWord.length
  });

  // Send word to drawer
  io.to(room.currentDrawer.id).emit('wordToDraw', { word: room.currentWord });

  // Start round timer
  startRoundTimer(io, room);
}

function endGame(io: Server, room: Room) {
  room.gameState = 'waiting';
  
  // Sort players by score
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  
  // Notify everyone about game end and final scores
  io.to(room.id).emit('game-ended', { 
    players: sortedPlayers,
    winner: sortedPlayers[0]
  });
}

function startRoundTimer(io: Server, room: Room) {
  const ROUND_TIME = 60; // 60 seconds per round

  // Clear any existing timer
  if (room.hintTimer) {
    clearInterval(room.hintTimer);
  }

  // Start new timer
  room.hintTimer = setInterval(() => {
    const timeElapsed = (Date.now() - room.roundStartTime) / 1000;
    const timeLeft = Math.max(0, ROUND_TIME - timeElapsed);

    if (timeLeft === 0) {
      endRound(io, room);
    } else {
      io.to(room.id).emit('timeUpdate', { timeLeft });
    }
  }, 1000);
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

function startRound(io: Server, room: Room) {
  if (room.players.length < 2) {
    io.to(room.id).emit('error', 'Not enough players to start the round');
    return;
  }

  // Select a random drawer
  const nonDrawingPlayers = room.players.filter(p => !p.isDrawing);
  const randomIndex = Math.floor(Math.random() * nonDrawingPlayers.length);
  room.currentDrawer = nonDrawingPlayers[randomIndex];
  room.currentDrawer.isDrawing = true;

  // Get a random word
  room.currentWord = getRandomWord();
  room.roundStartTime = Date.now();
  room.firstGuesser = false;

  // Notify players
  io.to(room.id).emit('roundStart', {
    drawer: room.currentDrawer.name,
    word: room.currentDrawer.id === room.currentDrawer.id ? room.currentWord : '***'
  });

  // Start round timer
  startRoundTimer(io, room);
}

function handleGuess(io: Server, room: Room, playerId: string, guess: string) {
  const player = room.players.find(p => p.id === playerId);
  if (!player || player.id === room.currentDrawer?.id) return;

  if (guess.toLowerCase() === room.currentWord.toLowerCase()) {
    // Calculate points based on time
    const timeElapsed = (Date.now() - room.roundStartTime) / 1000;
    let points = 40; // Default points

    if (timeElapsed <= 10) points = 100;
    else if (timeElapsed <= 20) points = 80;

    // Add first guesser bonus
    if (!room.firstGuesser) {
      points += 30;
      room.firstGuesser = true;
    }

    // Update scores
    player.previousScore = player.score;
    player.score += points;
    if (room.currentDrawer) {
      room.currentDrawer.previousScore = room.currentDrawer.score;
      room.currentDrawer.score += 20;
    }

    // Notify players
    io.to(room.id).emit('correctGuess', {
      player: player.name,
      points,
      drawer: room.currentDrawer?.name
    });

    // Check if all players have guessed
    const allGuessed = room.players.every(p => 
      p.id === room.currentDrawer?.id || p.score > (p.previousScore || 0)
    );

    if (allGuessed) {
      endRound(io, room);
    }
  }
}

function endRound(io: Server, room: Room) {
  if (room.hintTimer) {
    clearInterval(room.hintTimer);
    room.hintTimer = undefined;
  }

  // Send round summary
  io.to(room.id).emit('roundSummary', {
    word: room.currentWord,
    players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
  });

  // Move to next round after delay
  setTimeout(() => {
    nextRound(io, room);
  }, 5000);
} 