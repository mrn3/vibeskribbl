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
    // Connect to socket and join/create room
    (0, react_1.useEffect)(() => {
        const socket = (0, socketClient_1.getSocket)();
        // Join or create room
        socket.emit('join-room', {
            roomId: roomIdParam,
            playerName
        });
        // Handle room joined
        socket.on('room-joined', ({ roomId: joinedRoomId, playerId: joinedPlayerId }) => {
            setRoomId(joinedRoomId);
            setPlayerId(joinedPlayerId);
            // Add system message
            addSystemMessage(`You joined room ${joinedRoomId}`);
        });
        // Handle room updates
        socket.on('room-update', (updatedRoom) => {
            setRoom(updatedRoom);
            // Check if current player is the drawer
            const isCurrentPlayerDrawing = updatedRoom.currentDrawer === playerId;
            setIsDrawing(isCurrentPlayerDrawing);
        });
        // Handle game started
        socket.on('game-started', ({ currentRound, maxRounds }) => {
            addSystemMessage(`Game started! ${currentRound} of ${maxRounds} rounds`);
        });
        // Handle new drawer
        socket.on('new-drawer', ({ drawerId, drawerName, roundNumber }) => {
            addSystemMessage(`Round ${roundNumber}: ${drawerName} is drawing now!`);
            // Reset word-related state
            setCurrentWord('');
            setWordHint('');
            // Clear canvas for everyone
            setClearCanvas(true);
        });
        // Handle word options for drawer
        socket.on('word-options', ({ options }) => {
            setWordOptions(options);
        });
        // Handle word to draw (only for drawer)
        socket.on('word-to-draw', ({ word }) => {
            setCurrentWord(word);
            addSystemMessage(`Your word to draw is: ${word}`);
        });
        // Handle round started
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        socket.on('round-started', ({ drawerId: _drawerId, wordLength }) => {
            // Create word hint (e.g., "_ _ _ _" for a 4-letter word)
            const hint = Array(wordLength).fill('_').join(' ');
            setWordHint(hint);
            if (_drawerId !== playerId) {
                addSystemMessage(`Round started! Word has ${wordLength} letters`);
            }
        });
        // Handle round timer
        socket.on('round-timer-started', ({ duration }) => {
            setTimeLeft(duration);
            // Set up local timer
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
        });
        // Handle round ended
        socket.on('round-ended', ({ word }) => {
            addSystemMessage(`Round ended! The word was: ${word}`);
        });
        // Handle game ended
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        socket.on('game-ended', ({ players: _players, winner }) => {
            addSystemMessage(`Game ended! Winner: ${winner.name} with ${winner.score} points`);
        });
        // Handle player guessed
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        socket.on('player-guessed', ({ playerId: guesserId, playerName: guesserName }) => {
            addSystemMessage(`${guesserName} guessed the word!`, false, true);
        });
        // Handle word guessed by current player
        socket.on('word-guessed', ({ word }) => {
            addSystemMessage(`You guessed the word: ${word}!`, false, true);
        });
        // Handle chat messages
        socket.on('chat-update', ({ playerId, playerName, message }) => {
            addMessage(playerId, playerName, message);
        });
        // Handle drawing updates
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        socket.on('draw-update', (drawData) => {
            // This will be handled by the Canvas component
            // The drawData is used by the Canvas component through props
        });
        // Handle canvas cleared
        socket.on('canvas-cleared', () => {
            setClearCanvas(true);
        });
        // Clean up on unmount
        return () => {
            (0, socketClient_1.disconnectSocket)();
        };
    }, [playerName, roomIdParam, playerId]);
    // Reset clearCanvas flag after it's been used
    (0, react_1.useEffect)(() => {
        if (clearCanvas) {
            setTimeout(() => setClearCanvas(false), 100);
        }
    }, [clearCanvas]);
    // Helper to add a message to the chat
    const addMessage = (playerId, playerName, content) => {
        setMessages((prev) => [
            ...prev,
            {
                id: (0, uuid_1.v4)(),
                playerId,
                playerName,
                content
            }
        ]);
    };
    // Helper to add a system message
    const addSystemMessage = (content, isSystem = true, isCorrectGuess = false) => {
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
    };
    // Handle sending chat messages
    const handleSendMessage = (message) => {
        if (!roomId || !playerId)
            return;
        const socket = (0, socketClient_1.getSocket)();
        socket.emit('chat-message', {
            roomId,
            message,
            playerId
        });
    };
    // Handle drawing
    const handleDraw = (drawData) => {
        if (!roomId || !isDrawing)
            return;
        const socket = (0, socketClient_1.getSocket)();
        socket.emit('draw', {
            roomId,
            drawData
        });
    };
    // Handle clearing canvas
    const handleClearCanvas = () => {
        if (!roomId || !isDrawing)
            return;
        const socket = (0, socketClient_1.getSocket)();
        socket.emit('clear-canvas', { roomId });
    };
    // Handle word selection
    const handleWordSelect = (word) => {
        if (!roomId || !isDrawing)
            return;
        const socket = (0, socketClient_1.getSocket)();
        socket.emit('word-selected', {
            roomId,
            word
        });
        // Clear word options
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
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Player list */}
          <div className="lg:col-span-1">
            <PlayerList_1.default players={room.players} currentPlayerId={playerId}/>
          </div>
          
          {/* Main game area */}
          <div className="lg:col-span-2">
            <Canvas_1.default isDrawing={isDrawing} onDraw={handleDraw} onClear={handleClearCanvas} clearCanvas={clearCanvas}/>
          </div>
          
          {/* Chat */}
          <div className="lg:col-span-1 h-[600px]">
            <Chat_1.default playerId={playerId} onSendMessage={handleSendMessage} messages={messages} disabled={isDrawing} placeholder={isDrawing ? "You're drawing! Can't chat now." : "Type your guess here..."}/>
          </div>
        </div>
      </div>
      
      {/* Word selector modal */}
      {wordOptions.length > 0 && (<WordSelector_1.default words={wordOptions} onSelect={handleWordSelect} timeLeft={15}/>)}
    </div>);
}
