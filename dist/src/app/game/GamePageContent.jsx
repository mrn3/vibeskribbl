"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GamePageContent;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const uuid_1 = require("uuid");
const Canvas_1 = __importDefault(require("@/components/Canvas"));
const Chat_1 = __importDefault(require("@/components/Chat"));
const PlayerList_1 = __importDefault(require("@/components/PlayerList"));
const GameHeader_1 = __importDefault(require("@/components/GameHeader"));
const WordSelector_1 = __importDefault(require("@/components/WordSelector"));
const socketClient_1 = require("@/lib/socketClient");
function GamePageContent() {
    const searchParams = (0, navigation_1.useSearchParams)();
    const playerName = searchParams.get('name') || 'Anonymous';
    const roomIdParam = searchParams.get('roomId');
    const [playerId, setPlayerId] = (0, react_1.useState)('');
    const [roomId, setRoomId] = (0, react_1.useState)(roomIdParam || '');
    const [room, setRoom] = (0, react_1.useState)(null);
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [currentWord, setCurrentWord] = (0, react_1.useState)('');
    const [wordHint, setWordHint] = (0, react_1.useState)('');
    const [isDrawing, setIsDrawing] = (0, react_1.useState)(false);
    const [timeLeft, setTimeLeft] = (0, react_1.useState)(0);
    const [wordOptions, setWordOptions] = (0, react_1.useState)([]);
    const [clearCanvas, setClearCanvas] = (0, react_1.useState)(false);
    const [remoteDrawData, setRemoteDrawData] = (0, react_1.useState)(undefined);
    // Socket reference to maintain across renders
    const socketRef = (0, react_1.useRef)(null);
    // Define message handlers first so they can be referenced in the dependency array
    // Helper to add a message to the chat
    const addMessage = (0, react_1.useCallback)((playerId, playerName, content) => {
        setMessages((prev) => [
            ...prev,
            {
                id: (0, uuid_1.v4)(),
                playerId,
                playerName,
                content
            }
        ]);
    }, []);
    // Helper to add a system message
    const addSystemMessage = (0, react_1.useCallback)((content, isSystem = true, isCorrectGuess = false) => {
        setMessages((prev) => [
            ...prev,
            {
                id: (0, uuid_1.v4)(),
                playerId: 'system',
                playerName: 'System',
                content,
                isSystemMessage: isSystem,
                isCorrectGuess
            }
        ]);
    }, []);
    // Handle drawing events from remote users
    const handleDrawEvent = (0, react_1.useCallback)((data) => {
        console.log('Received draw event from server:', data.type);
        setRemoteDrawData(data);
    }, []);
    // Connect to socket and join/create room - only on initial mount
    (0, react_1.useEffect)(() => {
        console.log('GamePageContent mounted - initializing socket connection');
        // Only create a socket if we don't already have one
        if (!socketRef.current) {
            const socket = (0, socketClient_1.getSocket)();
            socketRef.current = socket;
            if (!socket) {
                console.error('Failed to create socket connection');
                addSystemMessage('Error: Could not connect to game server');
                return () => { };
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
            (0, socketClient_1.disconnectSocket)();
            socketRef.current = null;
        };
    }, [addSystemMessage, playerName, roomIdParam]); // Add addSystemMessage to dependency array
    // Set up socket event listeners - these can update when playerId changes
    (0, react_1.useEffect)(() => {
        const socket = socketRef.current;
        if (!socket)
            return;
        console.log('Setting up socket event listeners');
        // Handle room joined
        const handleRoomJoined = ({ roomId: joinedRoomId, playerId: joinedPlayerId }) => {
            setRoomId(joinedRoomId);
            setPlayerId(joinedPlayerId);
            // Add system message
            addSystemMessage(`You joined room ${joinedRoomId}`);
        };
        // Handle room updates
        const handleRoomUpdate = (updatedRoom) => {
            setRoom(updatedRoom);
            // Check if current player is the drawer
            const isCurrentPlayerDrawing = updatedRoom.currentDrawer === playerId;
            console.log('Room update received:', {
                roomId: updatedRoom.id,
                currentDrawer: updatedRoom.currentDrawer,
                playerId,
                isCurrentPlayerDrawing,
                gameState: updatedRoom.gameState,
                players: updatedRoom.players.map(p => ({ id: p.id, name: p.name, isDrawing: p.isDrawing }))
            });
            setIsDrawing(isCurrentPlayerDrawing);
        };
        // Handle game started
        const handleGameStarted = ({ currentRound, maxRounds }) => {
            addSystemMessage(`Game started! ${currentRound} of ${maxRounds} rounds`);
        };
        // Handle new drawer
        const handleNewDrawer = ({ drawerId, drawerName, roundNumber }) => {
            addSystemMessage(`Round ${roundNumber}: ${drawerName} is drawing now!`);
            console.log('New drawer assigned:', {
                drawerId,
                drawerName,
                roundNumber,
                currentPlayerId: playerId,
                isCurrentPlayerDrawing: drawerId === playerId
            });
            // Explicitly update drawing state
            const isCurrentPlayerDrawing = drawerId === playerId;
            setIsDrawing(isCurrentPlayerDrawing);
            // Reset word-related state
            setCurrentWord('');
            setWordHint('');
            // Clear canvas for everyone
            setClearCanvas(true);
        };
        // Handle drawing updates from other users
        socket.on('draw-update', handleDrawEvent);
        // Register all event listeners
        socket.on('room-joined', handleRoomJoined);
        socket.on('room-update', handleRoomUpdate);
        socket.on('game-started', handleGameStarted);
        socket.on('new-drawer', handleNewDrawer);
        socket.on('word-options', ({ options }) => setWordOptions(options));
        socket.on('word-to-draw', ({ word }) => {
            setCurrentWord(word);
            addSystemMessage(`Your word to draw is: ${word}`);
            // If we're receiving a word to draw, we MUST be the drawer
            console.log('Received word to draw, setting drawing mode to TRUE');
            setIsDrawing(true);
        });
        // Handle round started
        socket.on('round-started', ({ drawerId: _drawerId, wordLength }) => {
            // Create word hint (e.g., "_ _ _ _" for a 4-letter word)
            const hint = Array(wordLength).fill('_').join(' ');
            setWordHint(hint);
            if (_drawerId !== playerId) {
                addSystemMessage(`Round started! Word has ${wordLength} letters`);
            }
        });
        socket.on('round-timer-started', ({ duration }) => {
            setTimeLeft(duration);
        });
        socket.on('round-ended', ({ word }) => {
            addSystemMessage(`Round ended! The word was: ${word}`);
        });
        socket.on('game-ended', ({ players: _players, winner }) => {
            addSystemMessage(`Game ended! Winner: ${winner.name} with ${winner.score} points`);
        });
        socket.on('player-guessed', ({ playerId: guesserId, playerName: guesserName }) => {
            // Create a more celebratory message for correct guesses
            addSystemMessage(`🎉 ${guesserName} guessed the word correctly! 🎉`, true, true);
            // Add celebration sound/notification (future enhancement)
            // If there's a drawing player, update their status as well
            if (isDrawing) {
                addSystemMessage(`${guesserName} figured out your drawing!`, false, true);
            }
        });
        socket.on('word-guessed', ({ word }) => {
            addSystemMessage(`You guessed the word: ${word}!`, false, true);
        });
        socket.on('chat-update', ({ playerId, playerName, message }) => {
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
    }, [playerId, addSystemMessage, addMessage, handleDrawEvent]);
    // Set up local timer when timeLeft changes
    (0, react_1.useEffect)(() => {
        if (timeLeft <= 0)
            return;
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
    (0, react_1.useEffect)(() => {
        if (clearCanvas) {
            setTimeout(() => setClearCanvas(false), 100);
        }
    }, [clearCanvas]);
    // Update these functions to use the socket reference
    const handleSendMessage = (message) => {
        if (!roomId || !playerId || !socketRef.current)
            return;
        socketRef.current.emit('chat-message', {
            roomId,
            message,
            playerId
        });
    };
    // Handle drawing from local user
    const handleDraw = (0, react_1.useCallback)((drawData) => {
        if (!roomId || !isDrawing || !socketRef.current) {
            console.log('Cannot emit draw event - not drawing or no socket connection');
            return;
        }
        console.log('Emitting draw event to server:', drawData.type);
        socketRef.current.emit('draw', {
            roomId,
            drawData
        });
    }, [roomId, isDrawing]);
    // Handle canvas clearing
    const handleClearCanvas = (0, react_1.useCallback)(() => {
        if (!roomId || !isDrawing || !socketRef.current)
            return;
        console.log('Emitting clear-canvas event to server');
        socketRef.current.emit('clear-canvas', { roomId });
    }, [roomId, isDrawing]);
    const handleWordSelect = (word) => {
        if (!roomId || !socketRef.current)
            return;
        socketRef.current.emit('word-selected', {
            roomId,
            word
        });
        setWordOptions([]);
    };
    // Get current drawer info
    const getCurrentDrawer = () => {
        if (!room || !room.currentDrawer)
            return undefined;
        const drawer = room.players.find(p => p.id === room.currentDrawer);
        if (!drawer)
            return undefined;
        return {
            id: drawer.id,
            name: drawer.name
        };
    };
    // Render loading state
    if (!roomId || !playerId || !room) {
        return (<div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-400 to-purple-500">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Joining game...</h1>
          <p>Please wait while we connect you to the game.</p>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 p-4">
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
        <GameHeader_1.default round={room.currentRound} maxRounds={room.maxRounds} timeLeft={timeLeft} drawer={getCurrentDrawer()} word={currentWord} wordHint={wordHint} isDrawer={isDrawing}/>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Player list */}
          <div className="lg:col-span-3">
            <PlayerList_1.default players={room.players} currentPlayerId={playerId}/>
          </div>
          
          {/* Main game area */}
          <div className="lg:col-span-6">
            <Canvas_1.default isDrawing={isDrawing} onDraw={handleDraw} onClear={handleClearCanvas} clearCanvas={clearCanvas} remoteDrawData={remoteDrawData} width={undefined} // Let canvas be responsive
     height={undefined} // Let canvas be responsive
    />
          </div>
          
          {/* Chat */}
          <div className="lg:col-span-3">
            <div className="h-full max-h-[calc(100vh-200px)]">
              <Chat_1.default playerId={playerId} onSendMessage={handleSendMessage} messages={messages} disabled={isDrawing} placeholder={isDrawing ? "You're drawing! Can't chat now." : "Type your guess here..."}/>
            </div>
          </div>
        </div>
      </div>
      
      {/* Word selector modal */}
      {wordOptions.length > 0 && (<WordSelector_1.default words={wordOptions} onSelect={handleWordSelect} timeLeft={10}/>)}
    </div>);
}
