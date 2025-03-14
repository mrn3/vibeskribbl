"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocket = getSocket;
exports.disconnectSocket = disconnectSocket;
exports.resetSocketConnection = resetSocketConnection;
const socket_io_client_1 = require("socket.io-client");
// Track connection state globally
let socket = null;
let isConnecting = false;
let reconnectTimer = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
// Cleanup function to properly handle disconnection
function cleanupSocket() {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    isConnecting = false;
}
function getSocket() {
    // If we're already connecting, don't try to create another connection
    if (isConnecting) {
        console.log('Already establishing connection, returning current socket');
        return socket;
    }
    // If we already have a socket and it's connected, return it
    if (socket === null || socket === void 0 ? void 0 : socket.connected) {
        return socket;
    }
    // If we've exceeded max connection attempts, don't try again
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        console.log('Max connection attempts reached, not connecting');
        return null;
    }
    // Set flag to prevent multiple simultaneous connection attempts
    isConnecting = true;
    connectionAttempts++;
    console.log(`Initializing socket connection (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    // Cleanup any existing socket
    if (socket) {
        cleanupSocket();
    }
    // Create new socket
    socket = (0, socket_io_client_1.io)(socketUrl, {
        reconnectionAttempts: 2,
        reconnectionDelay: 2000,
        timeout: 10000,
        transports: ['websocket'],
        autoConnect: true,
        forceNew: false
    });
    // Connection event listeners
    socket.on('connect', () => {
        console.log('Socket connected successfully:', socket === null || socket === void 0 ? void 0 : socket.id);
        isConnecting = false;
        // Reset connection attempts on successful connection
        connectionAttempts = 0;
    });
    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        // Don't immediately try to reconnect, let Socket.IO handle reconnection
        isConnecting = false;
        // If the disconnect reason is something that won't auto-reconnect
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            socket = null;
        }
    });
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        isConnecting = false;
        // If we have a connection error, clean up and don't auto-reconnect
        if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
            console.log('Max connection attempts reached, giving up');
            cleanupSocket();
        }
    });
    // Handle browser events for cleanup
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', cleanupSocket);
    }
    return socket;
}
function disconnectSocket() {
    console.log('Manually disconnecting socket and cleaning up');
    cleanupSocket();
    connectionAttempts = 0;
}
// Add a reset function to clear attempts and try again
function resetSocketConnection() {
    console.log('Resetting socket connection');
    cleanupSocket();
    connectionAttempts = 0;
    return getSocket();
}
