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
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;
// Cleanup function to properly handle disconnection
function cleanupSocket() {
    if (socket) {
        console.log('Cleaning up socket:', socket.id);
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
    isConnecting = false;
}
// Helper function to get the appropriate socket URL
function getSocketUrl() {
    // In the browser, use the same host/origin
    if (typeof window !== 'undefined') {
        // Get protocol, hostname, and port from current location
        const { protocol, hostname, port } = window.location;
        // Check if we're running locally or in production
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        if (isLocalhost) {
            // For local development, always use port 3001 (where the Socket.IO server runs)
            return `${protocol}//${hostname}:3001`;
        }
        else {
            // For production with SSL/proxy, don't specify port
            return `${protocol}//${hostname}`;
        }
    }
    // Fallback for server-side or if window is not available
    return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
}
function getSocket() {
    // If we're already connecting, don't try to create another connection
    if (isConnecting) {
        console.log('Already establishing connection, returning current socket');
        return socket;
    }
    // If we already have a socket and it's connected, return it
    if (socket === null || socket === void 0 ? void 0 : socket.connected) {
        console.log('Reusing existing connected socket:', socket.id);
        return socket;
    }
    // If we have a socket but it's not connected, try to reconnect
    if (socket) {
        console.log('Socket exists but not connected. Current status:', socket.connected ? 'connected' : 'disconnected');
        if (!socket.connected && socket.disconnected) {
            console.log('Reconnecting existing socket');
            socket.connect();
            return socket;
        }
    }
    // Set flag to prevent multiple simultaneous connection attempts
    isConnecting = true;
    connectionAttempts++;
    console.log(`Creating new socket connection (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
    // Get the appropriate socket URL based on the environment
    const socketUrl = getSocketUrl();
    console.log(`Connecting to Socket.IO server at: ${socketUrl}`);
    // Create new socket - Start with polling for better compatibility
    socket = (0, socket_io_client_1.io)(socketUrl, {
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 30000,
        transports: ['polling', 'websocket'], // Use polling first, then try websocket
        autoConnect: true,
        forceNew: true,
        path: '/socket.io', // Explicitly set the socket.io path
    });
    console.log('New socket instance created, connecting...');
    // Connection event listeners
    socket.on('connect', () => {
        console.log('Socket connected successfully:', socket === null || socket === void 0 ? void 0 : socket.id);
        isConnecting = false;
        // Reset connection attempts on successful connection
        connectionAttempts = 0;
    });
    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        isConnecting = false;
    });
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        isConnecting = false;
        if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
            console.log('Max connection attempts reached, giving up');
            cleanupSocket();
        }
    });
    // Enhanced debug logging
    socket.io.on("reconnect_attempt", (attempt) => {
        console.log(`Socket.IO reconnect attempt #${attempt}`);
    });
    socket.io.on("reconnect", (attempt) => {
        console.log(`Socket.IO reconnected successfully after ${attempt} attempts`);
    });
    socket.io.on("reconnect_error", (error) => {
        console.error('Socket.IO reconnection error:', error);
    });
    socket.io.on("reconnect_failed", () => {
        console.error('Socket.IO reconnection failed after maximum attempts');
    });
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
