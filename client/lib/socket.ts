'use client'

import { io } from 'socket.io-client';

export const socket = io('http://localhost:3001', {
  path: '/socket.io',
});


// for testing in the console
if (typeof window !== 'undefined') {
  (window as unknown as { socket: typeof socket }).socket = socket;
}
