"use client";

import { io, Socket } from 'socket.io-client';
import { useState, useEffect } from 'react';

// Singleton socket instance
let socket: Socket | null = null;
let connectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 15;
const SOCKET_TIMEOUT = 30000;

export const initSocket = () => {
  if (!socket) {
    try {
      // Use dynamic origin instead of hardcoded localhost URL
      const serverUrl = window.location.origin;
      
      console.log('Connecting to Socket.IO server at:', serverUrl);
      
      socket = io(serverUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: SOCKET_TIMEOUT,
        autoConnect: true
      });
      
      if (socket) {
        socket.on('connect', () => {
          console.log('Socket connected!', socket?.id);
          connectionAttempts = 0;
          
          // Dispatch an event that connection is successful
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('socket-connected'));
          }
        });
        
        socket.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          connectionAttempts++;
          
          // Notify of the connection error
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('socket-error', { 
              detail: `Connection error: ${err.message}` 
            }));
          }
          
          if (connectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
            console.error('Max reconnection attempts reached. Please refresh the page.');
            
            // Display a notification to the user
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('socket-error', { 
                detail: 'Connection lost. Please refresh the page.' 
              }));
            }
          }
        });
        
        socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          
          // If server disconnected us, try to reconnect
          if (reason === 'io server disconnect') {
            console.log('Attempting to reconnect...');
            socket?.connect();
          }
          
          // Display a notification to the user
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('socket-disconnect', { 
              detail: reason 
            }));
          }
        });
        
        // Handle explicit errors from server
        socket.on('error', (error: any) => {
          console.error('Server sent error:', error);
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('socket-error', { 
              detail: typeof error === 'string' ? error : 'Server error occurred' 
            }));
          }
        });
        
        // Set up ping/heartbeat to keep connection alive
        const pingInterval = setInterval(() => {
          if (socket?.connected) {
            socket.emit('ping');
          }
        }, 25000);
        
        // Clean up ping interval if window is closed
        if (typeof window !== 'undefined') {
          window.addEventListener('beforeunload', () => {
            clearInterval(pingInterval);
          });
        }
      }
    } catch (err) {
      console.error('Failed to initialize socket:', err);
      
      // Display a notification to the user
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('socket-error', { 
          detail: 'Failed to connect to game server.' 
        }));
      }
    }
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectionAttempts = 0;
  }
};

// React hook for using socket.io
export const useSocket = () => {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socketConn = initSocket();
    setSocketInstance(socketConn);

    // Handle reconnection
    const onReconnect = (attempt: number) => {
      console.log(`Socket reconnected after ${attempt} attempts`);
      setSocketInstance(socketConn); // Update the reference
    };
    
    if (socketConn) {
      socketConn.on('reconnect', onReconnect);
    }

    // Cleanup on unmount
    return () => {
      if (socketConn) {
        socketConn.off('connect');
        socketConn.off('connect_error');
        socketConn.off('reconnect', onReconnect);
      }
    };
  }, []);

  return socketInstance;
}; 