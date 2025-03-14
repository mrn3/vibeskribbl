'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import Canvas, { DrawData } from '@/components/Canvas';
import Chat from '@/components/Chat';
import PlayerList from '@/components/PlayerList';
import GameHeader from '@/components/GameHeader';
import WordSelector from '@/components/WordSelector';
import { getSocket, disconnectSocket } from '@/lib/socketClient';
import { Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  score: number;
  isDrawing: boolean;
}

interface Message {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  isSystemMessage?: boolean;
  isCorrectGuess?: boolean;
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
}

// Define types for socket event data
interface RoomJoinedData {
  roomId: string;
  playerId: string;
}

interface GameStartedData {
  currentRound: number;
  maxRounds: number;
}

interface NewDrawerData {
  drawerId: string;
  drawerName: string;
  roundNumber: number;
}

interface WordOptionsData {
  options: string[];
}

interface WordToDrawData {
  word: string;
}

interface RoundStartedData {
  drawerId: string;
  wordLength: number;
}

interface RoundTimerData {
  duration: number;
}

interface RoundEndedData {
  word: string;
}

interface GameEndedData {
  players: Player[];
  winner: Player;
}

interface PlayerGuessedData {
  playerId: string;
  playerName: string;
}

interface ChatUpdateData {
  playerId: string;
  playerName: string;
  message: string;
}

export default function GamePageContent() {
  const searchParams = useSearchParams();
  const playerName = searchParams.get('name') || 'Anonymous';
  const roomIdParam = searchParams.get('roomId');
  
  const [playerId, setPlayerId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>(roomIdParam || '');
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [wordHint, setWordHint] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [clearCanvas, setClearCanvas] = useState<boolean>(false);
  const [remoteDrawData, setRemoteDrawData] = useState<DrawData | undefined>(undefined);
  
  // Socket reference to maintain across renders
  const socketRef = useRef<Socket | null>(null);
  
  // Define message handlers first so they can be referenced in the dependency array
  // Helper to add a message to the chat
  const addMessage = useCallback((playerId: string, playerName: string, content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        playerId,
        playerName,
        content
      }
    ]);
  }, []);
  
  // Helper to add a system message
  const addSystemMessage = useCallback((content: string, isSystem = true, isCorrectGuess = false) => {
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        playerId: 'system',
        playerName: 'System',
        content,
        isSystemMessage: isSystem,
        isCorrectGuess
      }
    ]);
  }, []);
  
  // Connect to socket and join/create room - only on initial mount
  useEffect(() => {
    console.log('GamePageContent mounted - initializing socket connection');
    
    // Only create a socket if we don't already have one
    if (!socketRef.current) {
      const socket = getSocket();
      socketRef.current = socket;
      
      if (!socket) {
        console.error('Failed to create socket connection');
        addSystemMessage('Error: Could not connect to game server');
        return () => {};
      }
      
      // Join or create room
      socket.emit('join-room', {
        roomId: roomIdParam,
        playerName
      });
    }
    
    // Clean up on unmount
    return () => {
      console.log('GamePageContent unmounting - disconnecting socket');
      disconnectSocket();
      socketRef.current = null;
    };
  }, [addSystemMessage, playerName, roomIdParam]); // Add addSystemMessage to dependency array
  
  // Set up socket event listeners - these can update when playerId changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    
    console.log('Setting up socket event listeners');
    
    // Handle room joined
    const handleRoomJoined = ({ roomId: joinedRoomId, playerId: joinedPlayerId }: RoomJoinedData) => {
      setRoomId(joinedRoomId);
      setPlayerId(joinedPlayerId);
      
      // Add system message
      addSystemMessage(`You joined room ${joinedRoomId}`);
    };
    
    // Handle room updates
    const handleRoomUpdate = (updatedRoom: Room) => {
      setRoom(updatedRoom);
      
      // Check if current player is the drawer
      const isCurrentPlayerDrawing = updatedRoom.currentDrawer === playerId;
      setIsDrawing(isCurrentPlayerDrawing);
    };
    
    // Handle game started
    const handleGameStarted = ({ currentRound, maxRounds }: GameStartedData) => {
      addSystemMessage(`Game started! ${currentRound} of ${maxRounds} rounds`);
    };
    
    // Handle new drawer
    const handleNewDrawer = ({ drawerId, drawerName, roundNumber }: NewDrawerData) => {
      addSystemMessage(`Round ${roundNumber}: ${drawerName} is drawing now!`);
      
      // Reset word-related state
      setCurrentWord('');
      setWordHint('');
      
      // Clear canvas for everyone
      setClearCanvas(true);
    };
    
    // Handle drawing updates from other users
    socket.on('draw-update', (drawData: DrawData) => {
      setRemoteDrawData(drawData);
    });
    
    // Register all event listeners
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-update', handleRoomUpdate);
    socket.on('game-started', handleGameStarted);
    socket.on('new-drawer', handleNewDrawer);
    socket.on('word-options', ({ options }: WordOptionsData) => setWordOptions(options));
    socket.on('word-to-draw', ({ word }: WordToDrawData) => {
      setCurrentWord(word);
      addSystemMessage(`Your word to draw is: ${word}`);
    });
    
    // Handle round started
    socket.on('round-started', ({ drawerId: _drawerId, wordLength }: RoundStartedData) => {
      // Create word hint (e.g., "_ _ _ _" for a 4-letter word)
      const hint = Array(wordLength).fill('_').join(' ');
      setWordHint(hint);
      
      if (_drawerId !== playerId) {
        addSystemMessage(`Round started! Word has ${wordLength} letters`);
      }
    });
    
    socket.on('round-timer-started', ({ duration }: RoundTimerData) => {
      setTimeLeft(duration);
    });
    
    socket.on('round-ended', ({ word }: RoundEndedData) => {
      addSystemMessage(`Round ended! The word was: ${word}`);
    });
    
    socket.on('game-ended', ({ players: _players, winner }: GameEndedData) => {
      addSystemMessage(`Game ended! Winner: ${winner.name} with ${winner.score} points`);
    });
    
    socket.on('player-guessed', ({ playerId: guesserId, playerName: guesserName }: PlayerGuessedData) => {
      addSystemMessage(`${guesserName} guessed the word!`, false, true);
    });
    
    socket.on('word-guessed', ({ word }: WordToDrawData) => {
      addSystemMessage(`You guessed the word: ${word}!`, false, true);
    });
    
    socket.on('chat-update', ({ playerId, playerName, message }: ChatUpdateData) => {
      addMessage(playerId, playerName, message);
    });
    
    socket.on('canvas-cleared', () => {
      setClearCanvas(true);
    });
    
    // Clean up event listeners when dependency changes
    return () => {
      console.log('Removing socket event listeners');
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-update', handleRoomUpdate);
      socket.off('game-started', handleGameStarted);
      socket.off('new-drawer', handleNewDrawer);
      socket.off('word-options');
      socket.off('word-to-draw');
      socket.off('round-started');
      socket.off('round-timer-started');
      socket.off('round-ended');
      socket.off('game-ended');
      socket.off('player-guessed');
      socket.off('word-guessed');
      socket.off('chat-update');
      socket.off('draw-update');
      socket.off('canvas-cleared');
    };
  }, [playerId, addSystemMessage, addMessage]); 
  
  // Set up local timer when timeLeft changes
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);
  
  // Reset clearCanvas flag after it's been used
  useEffect(() => {
    if (clearCanvas) {
      setTimeout(() => setClearCanvas(false), 100);
    }
  }, [clearCanvas]);
  
  // Update these functions to use the socket reference
  const handleSendMessage = (message: string) => {
    if (!roomId || !playerId || !socketRef.current) return;
    
    socketRef.current.emit('chat-message', {
      roomId,
      message,
      playerId
    });
  };
  
  const handleDraw = (drawData: DrawData) => {
    if (!roomId || !isDrawing || !socketRef.current) return;
    
    socketRef.current.emit('draw', {
      roomId,
      drawData
    });
  };
  
  const handleClearCanvas = () => {
    if (!roomId || !isDrawing || !socketRef.current) return;
    
    socketRef.current.emit('clear-canvas', { roomId });
  };
  
  const handleWordSelect = (word: string) => {
    if (!roomId || !socketRef.current) return;
    
    socketRef.current.emit('word-selected', {
      roomId,
      word
    });
    
    setWordOptions([]);
  };
  
  // Get current drawer info
  const getCurrentDrawer = () => {
    if (!room || !room.currentDrawer) return undefined;
    
    const drawer = room.players.find(p => p.id === room.currentDrawer);
    if (!drawer) return undefined;
    
    return {
      id: drawer.id,
      name: drawer.name
    };
  };
  
  // Render loading state
  if (!roomId || !playerId || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-400 to-purple-500">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Joining game...</h1>
          <p>Please wait while we connect you to the game.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Room ID display */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">VibeSkribbl</h1>
          <div className="flex items-center">
            <span className="mr-2">Room ID:</span>
            <span className="font-mono bg-gray-100 px-3 py-1 rounded">{roomId}</span>
          </div>
        </div>
        
        {/* Game header with round info */}
        <GameHeader
          round={room.currentRound}
          maxRounds={room.maxRounds}
          timeLeft={timeLeft}
          drawer={getCurrentDrawer()}
          word={currentWord}
          wordHint={wordHint}
          isDrawer={isDrawing}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Player list */}
          <div className="lg:col-span-1">
            <PlayerList players={room.players} currentPlayerId={playerId} />
          </div>
          
          {/* Main game area */}
          <div className="lg:col-span-2">
            <Canvas
              isDrawing={isDrawing}
              onDraw={handleDraw}
              onClear={handleClearCanvas}
              clearCanvas={clearCanvas}
              remoteDrawData={remoteDrawData}
            />
          </div>
          
          {/* Chat */}
          <div className="lg:col-span-1 h-[600px]">
            <Chat
              playerId={playerId}
              onSendMessage={handleSendMessage}
              messages={messages}
              disabled={isDrawing}
              placeholder={isDrawing ? "You're drawing! Can't chat now." : "Type your guess here..."}
            />
          </div>
        </div>
      </div>
      
      {/* Word selector modal */}
      {wordOptions.length > 0 && (
        <WordSelector
          words={wordOptions}
          onSelect={handleWordSelect}
          timeLeft={15}
        />
      )}
    </div>
  );
} 