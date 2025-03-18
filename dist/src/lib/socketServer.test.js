"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socketServer_1 = require("./socketServer");
const http_1 = require("http");
// Mock socket.io
jest.mock('socket.io', () => {
    const mockOn = jest.fn();
    const mockToRoom = jest.fn().mockReturnThis();
    const mockEmit = jest.fn();
    return {
        Server: jest.fn().mockImplementation(() => ({
            on: mockOn,
            to: mockToRoom,
            emit: mockEmit,
            sockets: {
                adapter: {
                    rooms: new Map()
                },
                sockets: new Map()
            },
            engine: {
                on: jest.fn()
            }
        }))
    };
});
describe('socketServer', () => {
    let httpServer;
    let io;
    let socketEvents = {};
    // Helper to simulate socket connection
    const createMockSocket = (id) => {
        const mockJoin = jest.fn();
        const mockLeave = jest.fn();
        const mockEmit = jest.fn();
        const mockOn = jest.fn((event, callback) => {
            socketEvents[event] = callback;
        });
        // Create a mock for to() that properly tracks the room ID
        const mockEmitToRoom = jest.fn();
        const mockTo = jest.fn((roomId) => {
            return { emit: mockEmitToRoom, roomId };
        });
        const mockBroadcast = {
            to: mockTo
        };
        const mockRemoveAllListeners = jest.fn();
        const mockDisconnect = jest.fn();
        const socket = {
            id,
            on: mockOn,
            join: mockJoin,
            leave: mockLeave,
            emit: mockEmit,
            broadcast: mockBroadcast,
            to: mockTo,
            removeAllListeners: mockRemoveAllListeners,
            disconnect: mockDisconnect,
            rooms: new Set(),
            connected: true,
            disconnected: false,
            io: {
                on: jest.fn()
            },
            handshake: {
                headers: {
                    'user-agent': 'jest-test-agent'
                },
                query: {},
                time: new Date().toISOString()
            }
        };
        return socket;
    };
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        socketEvents = {};
        // Create HTTP server
        httpServer = (0, http_1.createServer)();
        // Setup Socket.IO server
        io = (0, socketServer_1.setupSocketServer)(httpServer);
        // Mock console to avoid cluttering test output
        global.console = Object.assign(Object.assign({}, global.console), { log: jest.fn(), error: jest.fn() });
    });
    // Simulate a socket connection
    const connectSocket = (socketId) => {
        var _a;
        // Create a mock socket
        const socket = createMockSocket(socketId);
        // Get the connection handler directly from the mock
        const ioMock = require('socket.io').Server.mock.results[0].value;
        const connectionHandler = (_a = ioMock.on.mock.calls.find(call => call[0] === 'connection')) === null || _a === void 0 ? void 0 : _a[1];
        // Add the socket to the sockets map
        ioMock.sockets.sockets.set(socketId, socket);
        // Simulate the connection
        if (connectionHandler) {
            connectionHandler(socket);
        }
        return socket;
    };
    // Helper to simulate joining a room
    const joinRoom = (socket, roomId) => {
        // Add the room to the socket's rooms
        socket.rooms.add(roomId);
        // Add the room to the adapter's rooms
        const ioMock = require('socket.io').Server.mock.results[0].value;
        if (!ioMock.sockets.adapter.rooms.has(roomId)) {
            ioMock.sockets.adapter.rooms.set(roomId, new Set());
        }
        ioMock.sockets.adapter.rooms.get(roomId).add(socket.id);
        // Trigger the join-room event handler
        const joinRoomHandler = socketEvents['join-room'];
        if (joinRoomHandler) {
            joinRoomHandler({ roomId, playerName: 'Test Player' });
        }
    };
    describe('Connection handling', () => {
        test('should set up connection handler', () => {
            // Get the Server mock directly
            const serverMock = require('socket.io').Server.mock.results[0].value;
            expect(serverMock.on).toHaveBeenCalledWith('connection', expect.any(Function));
        });
        test('should set up event handlers on new connection', () => {
            const socket = connectSocket('socket-1');
            // Check that event handlers were registered
            expect(socket.on).toHaveBeenCalledWith('join-room', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('start-game', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('draw', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('clear-canvas', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('word-selected', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('chat-message', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        });
    });
    describe('Room management', () => {
        let socket;
        beforeEach(() => {
            socket = connectSocket('socket-1');
        });
        test('should create a new room when roomId is not provided', () => {
            // Trigger join-room event without roomId
            const joinRoomHandler = socketEvents['join-room'];
            joinRoomHandler({ playerName: 'Test Player' });
            // Should join a room
            expect(socket.join).toHaveBeenCalled();
            // Should emit room-joined event
            expect(socket.emit).toHaveBeenCalledWith('room-joined', expect.objectContaining({
                playerId: 'socket-1'
            }));
        });
        test('should join an existing room when roomId is provided', () => {
            // First create a room
            const joinRoomHandler = socketEvents['join-room'];
            joinRoomHandler({ playerName: 'Player 1' });
            // Get the created roomId from the call to socket.join
            const roomId = socket.join.mock.calls[0][0];
            // Create another socket
            const socket2 = connectSocket('socket-2');
            // Join the existing room
            const joinRoomHandler2 = socketEvents['join-room'];
            joinRoomHandler2({ roomId, playerName: 'Player 2' });
            // Should join the same room
            expect(socket2.join).toHaveBeenCalledWith(roomId);
            // Should emit room-joined event
            expect(socket2.emit).toHaveBeenCalledWith('room-joined', expect.objectContaining({
                roomId,
                playerId: 'socket-2'
            }));
        });
    });
    describe('Game flow', () => {
        let socket;
        let roomId;
        beforeEach(() => {
            var _a, _b;
            socket = connectSocket('socket-1');
            // Create a room first
            const joinRoomHandler = socketEvents['join-room'];
            if (joinRoomHandler) {
                joinRoomHandler({ playerName: 'Test Player' });
            }
            // Get the room ID from the emit call
            roomId = (_b = (_a = socket.emit.mock.calls.find(call => call[0] === 'room-joined')) === null || _a === void 0 ? void 0 : _a[1]) === null || _b === void 0 ? void 0 : _b.roomId;
            // Add the socket to the room
            joinRoom(socket, roomId);
            // Add another player to meet the minimum player requirement
            const socket2 = connectSocket('socket-2');
            joinRoom(socket2, roomId);
            // Clear the mock calls
            socket.emit.mockClear();
            socket.to.mockClear();
            socket.broadcast.to.mockClear();
        });
        test('should register event handlers', () => {
            // Check that event handlers were registered
            expect(socket.on).toHaveBeenCalledWith('join-room', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('start-game', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('draw', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('clear-canvas', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('word-selected', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('chat-message', expect.any(Function));
            expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        });
    });
    describe('Chat functionality', () => {
        let socket;
        let roomId;
        beforeEach(() => {
            var _a, _b;
            socket = connectSocket('socket-1');
            // Create a room first
            const joinRoomHandler = socketEvents['join-room'];
            if (joinRoomHandler) {
                joinRoomHandler({ playerName: 'Test Player' });
            }
            // Get the room ID from the emit call
            roomId = (_b = (_a = socket.emit.mock.calls.find(call => call[0] === 'room-joined')) === null || _a === void 0 ? void 0 : _a[1]) === null || _b === void 0 ? void 0 : _b.roomId;
            // Add the socket to the room
            joinRoom(socket, roomId);
            // Add another player to meet the minimum player requirement
            const socket2 = connectSocket('socket-2');
            joinRoom(socket2, roomId);
            // Clear the mock calls
            socket.emit.mockClear();
            socket.to.mockClear();
            socket.broadcast.to.mockClear();
        });
        test('should have chat-message event handler', () => {
            // Check that chat-message event handler is registered
            expect(socket.on).toHaveBeenCalledWith('chat-message', expect.any(Function));
        });
    });
});
