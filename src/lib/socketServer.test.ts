import { setupSocketServer } from './socketServer';
import { Server as SocketIOServer } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import { Socket } from 'socket.io-client';

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
  let httpServer: HTTPServer;
  let io: SocketIOServer;
  let socketEvents: Record<string, Function> = {};
  
  // Helper to simulate socket connection
  const createMockSocket = (id: string): Socket => {
    const mockJoin = jest.fn();
    const mockLeave = jest.fn();
    const mockEmit = jest.fn();
    const mockOn = jest.fn((event: string, callback: Function) => {
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
      rooms: new Set<string>(),
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
    } as unknown as Socket;
    
    return socket;
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    socketEvents = {};
    
    // Create HTTP server
    httpServer = createServer();
    
    // Setup Socket.IO server
    io = setupSocketServer(httpServer);
    
    // Mock console to avoid cluttering test output
    global.console = {
      ...global.console,
      log: jest.fn(),
      error: jest.fn(),
    };
  });
  
  // Simulate a socket connection
  const connectSocket = (socketId: string): Socket => {
    // Create a mock socket
    const socket = createMockSocket(socketId);
    
    // Get the connection handler directly from the mock
    const ioMock = require('socket.io').Server.mock.results[0].value;
    const connectionHandler = ioMock.on.mock.calls.find(
      call => call[0] === 'connection'
    )?.[1];
    
    // Add the socket to the sockets map
    ioMock.sockets.sockets.set(socketId, socket);
    
    // Simulate the connection
    if (connectionHandler) {
      connectionHandler(socket);
    }
    
    return socket;
  };
  
  // Helper to simulate joining a room
  const joinRoom = (socket: Socket, roomId: string) => {
    // Add the room to the socket's rooms
    socket.rooms.add(roomId);
    
    // Add the room to the adapter's rooms
    const ioMock = require('socket.io').Server.mock.results[0].value;
    if (!ioMock.sockets.adapter.rooms.has(roomId)) {
      ioMock.sockets.adapter.rooms.set(roomId, new Set<string>());
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
    let socket: Socket;
    
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
    let socket: Socket;
    let roomId: string;
    
    beforeEach(() => {
      socket = connectSocket('socket-1');
      
      // Create a room first
      const joinRoomHandler = socketEvents['join-room'];
      if (joinRoomHandler) {
        joinRoomHandler({ playerName: 'Test Player' });
      }
      
      // Get the room ID from the emit call
      roomId = socket.emit.mock.calls.find(
        call => call[0] === 'room-joined'
      )?.[1]?.roomId;
      
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
    let socket: Socket;
    let roomId: string;
    
    beforeEach(() => {
      socket = connectSocket('socket-1');
      
      // Create a room first
      const joinRoomHandler = socketEvents['join-room'];
      if (joinRoomHandler) {
        joinRoomHandler({ playerName: 'Test Player' });
      }
      
      // Get the room ID from the emit call
      roomId = socket.emit.mock.calls.find(
        call => call[0] === 'room-joined'
      )?.[1]?.roomId;
      
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