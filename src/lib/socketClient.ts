'use client';

import { io, Socket } from 'socket.io-client';

// Track connection state globally
let socket: Socket | null = null;
let isConnecting = false;
let reconnectTimer: NodeJS.Timeout | null = null;
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

export function getSocket(): Socket | null {
  // If we're already connecting, don't try to create another connection
  if (isConnecting) {
    console.log('Already establishing connection, returning current socket');
    return socket;
  }
  
  // If we already have a socket and it's connected, return it
  if (socket?.connected) {
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
  socket = io(socketUrl, {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    transports: ['websocket', 'polling'],  // Fall back to polling if WebSocket fails
    autoConnect: true,
    forceNew: true,  // Create a fresh connection
    closeOnBeforeunload: true
  });
  
  // Connection event listeners
  socket.on('connect', () => {
    console.log('Socket connected successfully:', socket?.id);
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
    console.error('Socket connection error:', error.message);
    isConnecting = false;
    
    // Simplify the fallback logic to avoid type errors
    if (socket) {
      console.log('Attempting to fallback to polling transport');
      // Try to reconnect after a short delay using polling
      setTimeout(() => {
        try {
          // Create a new socket with polling only
          cleanupSocket();
          socket = io(socketUrl, {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000,
            transports: ['polling'],
            autoConnect: true,
            forceNew: true
          });
          
          // Add essential listeners
          socket.on('connect', () => {
            console.log('Socket connected successfully via polling:', socket?.id);
            isConnecting = false;
            connectionAttempts = 0;
          });
          
          socket.on('connect_error', (err) => {
            console.error('Polling transport also failed:', err.message);
            isConnecting = false;
            if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
              cleanupSocket();
            }
          });
          
        } catch (err) {
          console.error('Error during transport fallback:', err);
        }
      }, 1000);
    } else if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      console.log('Max connection attempts reached, giving up');
      cleanupSocket();
    }
  });

  // Socket.IO manager event listeners for reconnection monitoring
  socket.io.on("reconnect_attempt", () => {
    console.log(`Socket.IO reconnect attempt`);
  });

  socket.io.on("reconnect", () => {
    console.log(`Socket.IO reconnected successfully`);
  });

  socket.io.on("reconnect_error", (error) => {
    console.error('Socket.IO reconnection error:', error);
  });

  socket.io.on("reconnect_failed", () => {
    console.error('Socket.IO reconnection failed after maximum attempts');
    cleanupSocket();
  });
  
  // Handle browser events for cleanup
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanupSocket);
  }
  
  return socket;
}

export function disconnectSocket(): void {
  console.log('Manually disconnecting socket and cleaning up');
  cleanupSocket();
  connectionAttempts = 0;
}

// Add a reset function to clear attempts and try again
export function resetSocketConnection(): Socket | null {
  console.log('Resetting socket connection');
  cleanupSocket();
  connectionAttempts = 0;
  return getSocket();
} 