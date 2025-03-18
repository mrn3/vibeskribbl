"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock socket.io-client
jest.mock('socket.io-client', () => {
    const mockSocketOn = jest.fn().mockReturnThis();
    const mockSocketIoOn = jest.fn().mockReturnThis();
    const mockConnect = jest.fn();
    const mockDisconnect = jest.fn();
    const mockRemoveAllListeners = jest.fn();
    const mockSocket = {
        on: mockSocketOn,
        connect: mockConnect,
        disconnect: mockDisconnect,
        removeAllListeners: mockRemoveAllListeners,
        connected: false,
        disconnected: true,
        id: 'mock-socket-id',
        io: {
            on: mockSocketIoOn,
            engine: {
                on: jest.fn()
            }
        }
    };
    return {
        io: jest.fn(() => mockSocket)
    };
});
// Mock window for testing URL generation
const mockWindow = {
    location: {
        protocol: 'http:',
        hostname: 'localhost',
        port: '3001'
    }
};
// Mock console methods to avoid cluttering test output
global.console = Object.assign(Object.assign({}, global.console), { log: jest.fn(), error: jest.fn() });
describe('socketClient', () => {
    let mockSocket;
    let mockIo;
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        // Reset modules to clear any cached state
        jest.resetModules();
        // Mock window
        global.window = mockWindow;
        // Get references to the mocks
        mockIo = require('socket.io-client').io;
        mockSocket = mockIo();
    });
    afterEach(() => {
        // Clean up
        delete global.window;
    });
    describe('getSocket', () => {
        test('should create a new socket when none exists', () => {
            // Import the module fresh to get the latest version
            const { getSocket } = require('./socketClient');
            // Reset the mock call count
            mockIo.mockClear();
            const socket = getSocket();
            expect(mockIo).toHaveBeenCalledTimes(1);
            expect(socket).toBeDefined();
        });
        test('should reuse existing socket if already connected', () => {
            // Import the module fresh to get the latest version
            const { getSocket } = require('./socketClient');
            // Create a socket first
            const firstSocket = getSocket();
            // Mock that the socket is connected
            firstSocket.connected = true;
            // Reset the mock call count
            mockIo.mockClear();
            // Attempt to get the socket again
            const secondSocket = getSocket();
            expect(mockIo).not.toHaveBeenCalled();
            expect(secondSocket).toBe(firstSocket);
        });
    });
    describe('disconnectSocket', () => {
        test('should clean up socket when disconnected', () => {
            // Import the module fresh to get the latest version
            const { getSocket, disconnectSocket } = require('./socketClient');
            // Create a socket first
            const socket = getSocket();
            // Reset the mock call counts
            socket.removeAllListeners.mockClear();
            socket.disconnect.mockClear();
            // Disconnect the socket
            disconnectSocket();
            // Check that cleanup occurred
            expect(socket.removeAllListeners).toHaveBeenCalled();
            expect(socket.disconnect).toHaveBeenCalled();
        });
    });
    describe('resetSocketConnection', () => {
        test('should clean up and create a new socket', () => {
            // Import the module fresh to get the latest version
            const { getSocket, resetSocketConnection } = require('./socketClient');
            // Create a socket first
            const socket = getSocket();
            // Reset the mock call counts
            socket.removeAllListeners.mockClear();
            socket.disconnect.mockClear();
            mockIo.mockClear();
            // Reset the connection
            resetSocketConnection();
            // Check that cleanup occurred
            expect(socket.removeAllListeners).toHaveBeenCalled();
            expect(socket.disconnect).toHaveBeenCalled();
            // And that a new socket was created
            expect(mockIo).toHaveBeenCalledTimes(1);
        });
    });
});
