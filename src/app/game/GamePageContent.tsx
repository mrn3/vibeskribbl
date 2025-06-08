'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import Canvas from '@/components/Canvas';
import { DrawData } from '@/types/game';
import Chat from '@/components/Chat';
import PlayerList from '@/components/PlayerList';
import GameHeader from '@/components/GameHeader';
import WordSelector from '@/components/WordSelector';
import { getSocket, disconnectSocket, resetSocketConnection } from '@/lib/socketClient';
import { Socket } from 'socket.io-client';
import RoundSummary from '@/components/RoundSummary';

interface Player {
  id: string;
  name: string;
  score: number;
  isDrawing: boolean;
  hasGuessedCorrectly?: boolean;
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

interface WordHintData {
  hint: string;
}

interface RoundSummaryData {
  word: string;
  players: Player[];
  drawer: {
    id: string;
    name: string;
  };
}

interface WordGuessedData {
  word: string;
  pointsEarned?: number;
  message?: string;
}

export default function GamePageContent() {
  const searchParams = useSearchParams();
  const playerNameParam = searchParams.get('name');
  const roomIdParam = searchParams.get('roomId');
  
  // Add an explicit connection state to track what's happening
  const [connectionState, setConnectionState] = useState<'initial' | 'connecting' | 'connected' | 'error'>('initial');
  const [showNameInput, setShowNameInput] = useState<boolean>(!playerNameParam && !!roomIdParam);
  const [playerName, setPlayerName] = useState<string>(playerNameParam || 'Anonymous');
  const [nameInputValue, setNameInputValue] = useState<string>('');
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
  
  // Add toast state
  const [toast, setToast] = useState<{visible: boolean, message: string}>({
    visible: false,
    message: ''
  });
  
  // Keep track of socket connection status
  const hasConnected = useRef<boolean>(false);
  const connectionInProgress = useRef<boolean>(false);
  
  // Socket reference to maintain across renders
  const socketRef = useRef<Socket | null>(null);
  
  // Add state for round summary modal
  const [roundSummary, setRoundSummary] = useState<RoundSummaryData | null>(null);
  const [showRoundSummary, setShowRoundSummary] = useState<boolean>(false);
  
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
  
  // Handle drawing events from remote users
  const handleDrawEvent = useCallback((data: DrawData) => {
    console.log('Received draw event from server:', {
      type: data.type,
      color: data.color,
      lineWidth: data.lineWidth,
      x: data.x,
      y: data.y
    });
    setRemoteDrawData(data);
  }, []);
  
  // Extract game event handlers to a separate function - MOVED UP before connectToSocketWithName
  const setupGameEventHandlers = useCallback((socket: Socket) => {
    socket.off('draw-update');
    socket.off('game-started');
    socket.off('new-drawer');
    socket.off('word-options');
    socket.off('word-to-draw');
    socket.off('round-started');
    socket.off('round-timer-started');
    socket.off('round-ended');
    socket.off('game-ended');
    socket.off('player-guessed');
    socket.off('word-guessed');
    socket.off('chat-update');
    socket.off('canvas-cleared');
    socket.off('word-hint');
    socket.off('round-summary');
    
    socket.on('draw-update', handleDrawEvent);
    
    socket.on('game-started', ({ currentRound, maxRounds }: GameStartedData) => {
      addSystemMessage(`Game started! ${currentRound} of ${maxRounds} rounds`);
    });
    
    socket.on('new-drawer', ({ drawerId, drawerName, roundNumber }: NewDrawerData) => {
      addSystemMessage(`Round ${roundNumber}: ${drawerName} is drawing now!`);
      setIsDrawing(drawerId === playerId);
      setCurrentWord('');
      setWordHint('');
      setClearCanvas(true);
    });
    
    socket.on('word-options', ({ options }: WordOptionsData) => {
      // Only show word options if the current player is the drawer
      if (room && room.currentDrawer === playerId) {
        setWordOptions(options);
      }
    });

    socket.on('word-to-draw', ({ word }: WordToDrawData) => {
      setCurrentWord(word);
      addSystemMessage(`Your word to draw is: ${word}`);
      setIsDrawing(true);
    });

    socket.on('round-started', ({ drawerId, wordLength }: RoundStartedData) => {
      const hint = Array(wordLength).fill('_').join(' ');
      setWordHint(hint);

      if (drawerId !== playerId) {
        addSystemMessage(`Round started! Word has ${wordLength} letters`);
      }

      // Close round summary when round starts
      setShowRoundSummary(false);
    });
    
    socket.on('round-timer-started', ({ duration }: RoundTimerData) => {
      setTimeLeft(duration);
    });
    
    socket.on('round-ended', ({ word }: RoundEndedData) => {
      addSystemMessage(`Round ended! The word was: ${word}`);
    });
    
    socket.on('game-ended', ({ winner }: GameEndedData) => {
      addSystemMessage(`Game ended! Winner: ${winner.name} with ${winner.score} points`);
    });

    socket.on('player-guessed', ({ playerName: guesserName }: PlayerGuessedData) => {
      addSystemMessage(`🎉 ${guesserName} guessed the word correctly! 🎉`, true, true);
      
      if (isDrawing) {
        addSystemMessage(`${guesserName} figured out your drawing!`, false, true);
      }
    });
    
    socket.on('word-guessed', ({ word, pointsEarned, message }: WordGuessedData) => {
      if (message) {
        addSystemMessage(message, false, true);
      } else {
        addSystemMessage(`You guessed the word: ${word}!`, false, true);
      }
      
      if (pointsEarned) {
        addSystemMessage(`+${pointsEarned} points!`, false, true);
      }
    });
    
    socket.on('chat-update', ({ playerId, playerName, message }: ChatUpdateData) => {
      addMessage(playerId, playerName, message);
    });
    
    socket.on('canvas-cleared', () => {
      setClearCanvas(true);
    });
    
    socket.on('word-hint', ({ hint }: WordHintData) => {
      setWordHint(hint);
      // No need to update the drawer with hints
      if (!room || playerId === room.currentDrawer) return;
      
      // We'll let the chat update handle displaying the hint
    });
    
    // Add the new round-summary event handler
    socket.on('round-summary', (data: RoundSummaryData) => {
      console.log('Received round summary:', data);
      // Only show round summary if the current player is NOT the next drawer
      if (room && room.currentDrawer !== playerId) {
        setRoundSummary(data);
        setShowRoundSummary(true);
      }
    });
  }, [handleDrawEvent, playerId, isDrawing, addSystemMessage, addMessage, room]);
  
  // Function to handle name submission
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInputValue.trim()) {
      // Store the trimmed name in a local variable to ensure we use this exact value
      const enteredName = nameInputValue.trim();
      console.log(`Name submitted: ${enteredName}`);
      
      // Update playerName state with the input value
      setPlayerName(enteredName);
      setShowNameInput(false);
      
      // Reset connection state
      connectionInProgress.current = false;
      hasConnected.current = false;
      setConnectionState('connecting');
      
      // Store the entered name in sessionStorage for persistence
      try {
        sessionStorage.setItem('playerName', enteredName);
      } catch (e) {
        console.error('Failed to store name in sessionStorage:', e);
      }
      
      // Directly trigger connection with the updated name
      setTimeout(() => {
        console.log(`Initiating connection after name submission with name: ${enteredName}`);
        // Pass the entered name directly to ensure it's used
        connectToSocketWithName(enteredName);
      }, 100);
    }
  };
  
  // Add a function to connect with a specific name
  const connectToSocketWithName = useCallback((name: string) => {
    // Avoid multiple simultaneous connections
    if (connectionInProgress.current) {
      console.log('Connection already in progress');
      return;
    }
    
    connectionInProgress.current = true;
    console.log(`Establishing socket connection to join room ${roomIdParam || roomId} as "${name}"`);
    
    // Create a new socket - we can safely do this because our getSocket function handles reuse
    const socket = getSocket();
    
    if (!socket) {
      console.error('Failed to create socket');
      setConnectionState('error');
      connectionInProgress.current = false;
      return;
    }
    
    socketRef.current = socket;
    
    // Remove any existing listeners first to prevent duplicates
    socket.off('connect');
    socket.off('connect_error');
    socket.off('room-joined');
    socket.off('room-update');
    socket.off('disconnect');
    
    // Core connection events
    socket.on('connect', () => {
      console.log(`Socket connected with ID: ${socket.id}`);
      
      // Directly emit join-room when connected
      console.log(`Emitting join-room for room "${roomIdParam || roomId}" as "${name}"`);
      socket.emit('join-room', {
        roomId: roomIdParam || roomId,
        playerName: name
      });
    });
    
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setConnectionState('error');
      connectionInProgress.current = false;
    });
    
    // Game events
    socket.on('room-joined', ({ roomId: joinedRoomId, playerId: joinedPlayerId }) => {
      console.log(`Room joined: ${joinedRoomId}, playerId: ${joinedPlayerId}`);
      setRoomId(joinedRoomId);
      setPlayerId(joinedPlayerId);
      setConnectionState('connected');
      hasConnected.current = true;
      connectionInProgress.current = false;
      addSystemMessage(`You joined room ${joinedRoomId} as ${name}`);
    });
    
    socket.on('room-update', (updatedRoom) => {
      console.log(`Room update received for room: ${updatedRoom.id}, players: ${updatedRoom.players.length}`, 
        updatedRoom.players.map((p: Player) => p.name));
      setRoom(updatedRoom);
      
      // Check if current player is the drawer
      if (playerId) {
        const isCurrentPlayerDrawing = updatedRoom.currentDrawer === playerId;
        setIsDrawing(isCurrentPlayerDrawing);
      }
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      
      // Only set error state if we had previously connected successfully 
      // and this is an unexpected disconnect
      if (hasConnected.current && reason !== 'io client disconnect') {
        // Don't show error if we're just navigating away
        addSystemMessage(`Disconnected from server: ${reason}. Attempting to reconnect...`);
      }
    });
    
    // Check socket state and connect if needed
    if (!socket.connected) {
      console.log('Socket is not connected, connecting now...');
      socket.connect();
    } else {
      console.log('Socket is already connected, joining room directly');
      socket.emit('join-room', {
        roomId: roomIdParam || roomId,
        playerName: name
      });
    }
    
    // Set up game event handlers
    setupGameEventHandlers(socket);
    
  }, [roomId, roomIdParam, addSystemMessage, setupGameEventHandlers, playerId]);
  
  // Update the original connectToSocket to use the new function
  const connectToSocket = useCallback(() => {
    // Try to get saved name from sessionStorage if available
    let nameToUse = playerName;
    try {
      const savedName = sessionStorage.getItem('playerName');
      if (savedName && savedName.trim() !== '') {
        nameToUse = savedName;
        setPlayerName(savedName);
      }
    } catch (e) {
      console.error('Failed to retrieve name from sessionStorage:', e);
    }
    
    connectToSocketWithName(nameToUse);
  }, [playerName, connectToSocketWithName]);
  
  // Initialize name input value when component mounts
  useEffect(() => {
    if (showNameInput) {
      // If we're showing the name input, focus and pre-populate with a default or saved name
      try {
        const savedName = sessionStorage.getItem('playerName');
        if (savedName && savedName.trim() !== '') {
          setNameInputValue(savedName);
        }
      } catch (e) {
        console.error('Failed to retrieve name from sessionStorage:', e);
      }
    }
  }, [showNameInput]);
  
  // Connect to socket when component mounts or when name is submitted
  useEffect(() => {
    // Skip if showing name input
    if (showNameInput) {
      console.log('Showing name input form, not connecting yet');
      return () => {}; // Empty cleanup function
    }
    
    console.log(`Connection flow: state=${connectionState}, hasConnected=${hasConnected.current}`);
    
    // If we're not connected or connecting, start the connection process
    if ((connectionState === 'initial' || connectionState === 'error') && !connectionInProgress.current) {
      console.log('Initiating socket connection...');
      setConnectionState('connecting');
      connectToSocket();
    }
    
    return () => {
      // We'll handle cleanup in the unmount useEffect
    };
  }, [showNameInput, connectToSocket, connectionState]);
  
  // Cleanup socket on component unmount ONLY
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up socket');
      if (socketRef.current) {
        disconnectSocket();
        socketRef.current = null;
      }
    };
  }, []);
  
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
  
  // Handle drawing from local user
  const handleDraw = useCallback((drawData: DrawData) => {
    if (!roomId || !isDrawing || !socketRef.current) {
      console.log('Cannot emit draw event - not drawing or no socket connection');
      return;
    }

    console.log('Emitting draw event to server:', {
      type: drawData.type,
      color: drawData.color,
      lineWidth: drawData.lineWidth,
      x: drawData.x,
      y: drawData.y,
      roomId
    });

    socketRef.current.emit('draw', {
      roomId,
      drawData
    });
  }, [roomId, isDrawing]);
  
  // Handle canvas clearing
  const handleClearCanvas = useCallback(() => {
    if (!roomId || !isDrawing || !socketRef.current) return;
    
    console.log('Emitting clear-canvas event to server');
    socketRef.current.emit('clear-canvas', { roomId });
  }, [roomId, isDrawing]);
  
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
  
  // Add a function to handle starting the game
  const handleStartGame = () => {
    if (!roomId || !socketRef.current) return;
    
    console.log('Attempting to start the game');
    socketRef.current.emit('start-game', { roomId });
  };
  
  // Function to retry connection
  const handleRetryConnection = () => {
    console.log('Retrying connection...');
    resetSocketConnection();
    setConnectionState('connecting');
    connectionInProgress.current = false;
    hasConnected.current = false;
    connectToSocket();
  };
  
  // Function to create a shareable room link
  const getRoomLink = useCallback(() => {
    // Get base URL (without any query parameters)
    const baseUrl = window.location.origin + '/game';
    // Only include the roomId parameter, so users can enter their name
    return `${baseUrl}?roomId=${roomId}`;
  }, [roomId]);
  
  // Function to copy link to clipboard
  const copyLinkToClipboard = () => {
    const link = getRoomLink();
    
    try {
      // Modern clipboard API - only works in secure contexts (HTTPS or localhost)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link)
          .then(() => {
            showCopiedToast();
          })
          .catch(err => {
            console.error('Could not copy using Clipboard API:', err);
            fallbackCopyToClipboard(link);
          });
      } else {
        // Fallback for browsers without clipboard API
        fallbackCopyToClipboard(link);
      }
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      fallbackCopyToClipboard(link);
    }
  };
  
  // Fallback clipboard copy method using textarea
  const fallbackCopyToClipboard = (text: string) => {
    try {
      // Create a temporary textarea element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      // Select and copy
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        showCopiedToast();
      } else {
        // If even the fallback fails, show a different message
        setToast({
          visible: true,
          message: "Couldn't copy automatically. Link: " + text
        });
      }
    } catch (err) {
      console.error('Fallback clipboard copy failed:', err);
      // If all else fails, at least show the link
      setToast({
        visible: true,
        message: "Copy failed. Use this link: " + text
      });
    }
  };
  
  // Helper to show the copied toast
  const showCopiedToast = () => {
    setToast({
      visible: true,
      message: "Room link copied to clipboard!"
    });
    
    // Hide toast after 3 seconds
    setTimeout(() => {
      setToast({
        visible: false,
        message: ''
      });
    }, 3000);
  };
  
  // Add handler to close the round summary modal
  const handleCloseRoundSummary = useCallback(() => {
    setShowRoundSummary(false);
  }, []);
  
  // Render name input screen if needed
  if (showNameInput) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-400 to-purple-500">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-3xl font-bold mb-4 text-center">Join Game</h1>
          <p className="mb-6 text-center text-gray-600">You&apos;ve been invited to join room: <span className="font-mono font-medium">{roomIdParam}</span></p>
          
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">
                Enter your name:
              </label>
              <input
                type="text"
                id="playerName"
                value={nameInputValue}
                onChange={(e) => setNameInputValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
                autoFocus
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
            >
              Join Game
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  // Render connecting state
  if (connectionState === 'connecting' || !roomId || !playerId || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-400 to-purple-500">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Joining game...</h1>
          <p className="mb-4">Connecting to room as {playerName}</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (connectionState === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-400 to-purple-500">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Connection Error</h1>
          <p className="mb-4">Unable to connect to the game room.</p>
          <button 
            onClick={handleRetryConnection}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // Render waiting room UI when game is in waiting state and connection is successful
  if (room.gameState === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold text-center mb-2">VibeSkribbl</h1>
            <p className="text-center text-gray-600 mb-6">Waiting for players to join...</p>
            
            <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg mb-6">
              <div>
                <p className="font-medium">Room ID:</p>
                <div className="flex items-center gap-2">
                  <a 
                    href={getRoomLink()} 
                    className="font-mono bg-white px-3 py-1 rounded border hover:bg-blue-50 transition-colors duration-200 text-blue-600 flex items-center"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      copyLinkToClipboard();
                    }}
                  >
                    {roomId}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </a>
                </div>
                <p className="text-sm text-gray-500 mt-2">Click to copy sharable link</p>
              </div>
              <div>
                <p className="font-medium">Players:</p>
                <p className="text-xl font-bold">{room.players.length} / 8</p>
              </div>
            </div>
            
            {/* Toast notification */}
            {toast.visible && (
              <div className="fixed bottom-4 right-4 bg-white text-gray-800 px-4 py-3 rounded-lg shadow-lg animate-fade-in-up flex items-center z-50 border-l-4 border-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-800 font-medium">{toast.message}</span>
              </div>
            )}
            
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-3">Players in Room:</h2>
              <div className="bg-white border rounded-lg p-2">
                <ul className="divide-y">
                  {room.players.map((player) => (
                    <li key={player.id} className="py-2 px-3 flex items-center">
                      <span className={`font-medium ${player.id === playerId ? 'text-blue-600' : 'text-gray-900'}`}>
                        {player.name} {player.id === playerId && '(You)'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={handleStartGame}
                disabled={room.players.length < 2}
                className={`px-6 py-3 rounded-lg text-xl font-bold text-white transition-colors ${
                  room.players.length < 2
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {room.players.length < 2 ? 'Need at least 2 players' : 'Start Game'}
              </button>
            </div>
          </div>
          
          {/* Chat in waiting room */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-bold mb-3">Chat</h2>
            <div className="h-64">
              <Chat
                playerId={playerId}
                onSendMessage={handleSendMessage}
                messages={messages}
                disabled={false}
                placeholder="Chat with other players..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Regular game UI when game is in playing or between-rounds state
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Room ID display */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">VibeSkribbl</h1>
          <div className="flex items-center">
            <span className="mr-2">Room ID:</span>
            <a 
              href={getRoomLink()} 
              className="font-mono bg-gray-100 px-3 py-1 rounded hover:bg-blue-50 transition-colors duration-200 text-blue-600 flex items-center"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                copyLinkToClipboard();
              }}
            >
              {roomId}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </a>
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
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Player list */}
          <div className="lg:col-span-3">
            <PlayerList players={room.players} currentPlayerId={playerId} />
          </div>
          
          {/* Main game area */}
          <div className="lg:col-span-6">
            <Canvas
              isDrawing={isDrawing}
              onDraw={handleDraw}
              onClear={handleClearCanvas}
              clearCanvas={clearCanvas}
              remoteDrawData={remoteDrawData}
              width={undefined}  // Let canvas be responsive
              height={undefined}  // Let canvas be responsive
            />
          </div>
          
          {/* Chat */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-2 h-full overflow-hidden" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              <h3 className="font-semibold px-2 pb-2">Chat</h3>
              <div className="h-[calc(100%-40px)]">
                <Chat
                  playerId={playerId}
                  onSendMessage={handleSendMessage}
                  messages={messages}
                  disabled={isDrawing || (room?.players.find(p => p.id === playerId)?.hasGuessedCorrectly ?? false)}
                  placeholder={
                    isDrawing 
                      ? "You're drawing! Can't chat now." 
                      : room?.players.find(p => p.id === playerId)?.hasGuessedCorrectly
                        ? "You've already guessed correctly!"
                        : "Type your guess here..."
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Word selector modal */}
      {wordOptions.length > 0 && (
        <WordSelector
          words={wordOptions}
          onSelect={handleWordSelect}
          timeLeft={10}
        />
      )}
      
      {/* Toast notification */}
      {toast.visible && (
        <div className="fixed bottom-4 right-4 bg-white text-gray-800 px-4 py-3 rounded-lg shadow-lg animate-fade-in-up flex items-center z-50 border-l-4 border-green-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-gray-800 font-medium">{toast.message}</span>
        </div>
      )}
      
      {/* Round Summary Modal */}
      {roundSummary && (
        <RoundSummary
          word={roundSummary.word}
          players={roundSummary.players}
          drawer={roundSummary.drawer}
          isVisible={showRoundSummary}
          onClose={handleCloseRoundSummary}
        />
      )}
    </div>
  );
} 