import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@vampir-koylu/shared';

// Oyun sunucusu web arayüzünü de kendisi sunar, bu yüzden her zaman sayfanın kendi adresine bağlanılır.
// Geliştirmede Vite, /socket.io isteklerini yerel sunucuya (3001) yönlendirir (vite.config.ts).
const SERVER_URL = window.location.origin;

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  // Mobilde ekran kilitliyken bağlantı uzun süre kopabilir; vazgeçmeden denemeye devam et
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
