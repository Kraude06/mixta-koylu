import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@vampir-koylu/shared';

// VITE_SERVER_URL verilmişse (ör. Vercel + ayrı sunucu) onu kullan.
// Verilmemişse: geliştirmede yerel sunucu, üretimde sayfanın kendi adresi (VPS'te tek adres).
const SERVER_URL = import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  // Mobilde ekran kilitliyken bağlantı uzun süre kopabilir; vazgeçmeden denemeye devam et
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
