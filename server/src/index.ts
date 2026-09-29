import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { ServerToClientEvents, ClientToServerEvents } from '../../shared/src';
import { Room } from './game/Room';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

/** Lobide kopan oyuncu bu süre içinde dönmezse odadan çıkarılır */
const LOBBY_GRACE_MS = 30_000;
/** Herkesin bağlantısı koparsa oda bu süre sonunda silinir */
const EMPTY_ROOM_GRACE_MS = 120_000;

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();
const socketToPlayer = new Map<string, string>();
const voiceSockets = new Set<string>();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateCode() : code;
}

function getRoom(socketId: string): Room | undefined {
  const code = socketToRoom.get(socketId);
  return code ? rooms.get(code) : undefined;
}

function broadcastToRoom(room: Room, event: string, args: unknown[]): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (io.to(room.code) as any).emit(event, ...args);
}

function sendToPlayer(room: Room, playerId: string, event: string, args: unknown[]): void {
  for (const [sid, pid] of socketToPlayer.entries()) {
    if (pid === playerId && socketToRoom.get(sid) === room.code) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (io.to(sid) as any).emit(event, ...args);
      break;
    }
  }
}

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log(`[+] ${socket.id} bağlandı`);

  socket.on('room:create', (playerName, cb) => {
    // Aynı socket'ten tekrar istek → mevcut odayı döndür
    if (socketToRoom.has(socket.id)) {
      const existingCode = socketToRoom.get(socket.id)!;
      const existingRoom = rooms.get(existingCode);
      const existingPlayerId = socketToPlayer.get(socket.id)!;
      if (existingRoom && existingPlayerId) {
        cb(existingCode, existingPlayerId);
        socket.emit('room:joined', existingRoom.getPersonalState(existingPlayerId), existingRoom.getSettings());
        console.log(`[=] Tekrar istek (oda var): ${existingCode}`);
        return;
      }
    }

    const code = generateCode();
    const room = new Room(code);
    const playerId = uuidv4();
    room.addPlayer(playerId, playerName.trim().substring(0, 20), true);

    room.onBroadcast = (event, args) => broadcastToRoom(room, event, args as unknown[]);
    room.onSendTo = (pid, event, args) => sendToPlayer(room, pid, event, args as unknown[]);

    rooms.set(code, room);
    socketToRoom.set(socket.id, code);
    socketToPlayer.set(socket.id, playerId);
    socket.join(code);

    cb(code, playerId);
    socket.emit('room:joined', room.getPersonalState(playerId), room.getSettings());
    console.log(`[+] Oda oluşturuldu: ${code} — ${playerName}`);
  });

  socket.on('room:join', (roomCode, playerName, cb) => {
    const normalCode = roomCode.toUpperCase();
    const room = rooms.get(normalCode);
    if (!room) return cb(false, 'Oda bulunamadı.');

    // 1. Aynı socket zaten bu odada → idempotent yanıt
    if (socketToPlayer.has(socket.id) && socketToRoom.get(socket.id) === normalCode) {
      const existingPlayerId = socketToPlayer.get(socket.id)!;
      cb(true, undefined, existingPlayerId);
      socket.emit('room:joined', room.getPersonalState(existingPlayerId), room.getSettings());
      console.log(`[=] Tekrar istek (socket zaten odada): ${normalCode}`);
      return;
    }

    const trimmedName = playerName.trim().substring(0, 20);

    // 2. Aynı isimde oyuncu varsa → yeniden bağlanma (lobide ve oyun sırasında).
    //    Telefon kilitlenince soket düşer; oyuncu aynı isimle kaldığı yerden devam eder.
    //    Sunucu kopmayı henüz fark etmemiş olabilir, bu yüzden eski soket eşlemesi burada temizlenir.
    const existing = room.findPlayerByName(trimmedName);
    if (existing) {
      for (const [sid, pid] of socketToPlayer.entries()) {
        if (pid === existing.id && socketToRoom.get(sid) === normalCode) {
          socketToRoom.delete(sid);
          socketToPlayer.delete(sid);
          voiceSockets.delete(sid);
          break;
        }
      }
      socketToRoom.set(socket.id, normalCode);
      socketToPlayer.set(socket.id, existing.id);
      socket.join(normalCode);
      room.markConnected(existing.id);
      cb(true, undefined, existing.id);
      socket.emit('room:joined', room.getPersonalState(existing.id), room.getSettings());
      if (room.getPhase() === 'lobby') {
        io.to(normalCode).emit('room:player-list', room.getPublicState().players);
      }
      console.log(`[↺] Yeniden bağlandı: ${normalCode} — ${trimmedName}`);
      return;
    }

    // 3. Yeni oyuncu
    if (room.getPhase() !== 'lobby') {
      return cb(false, 'Oyun devam ediyor — bitince katılabilirsin.');
    }
    if (room.getPlayerCount() >= 16) return cb(false, 'Oda dolu (max 16 oyuncu).');

    const playerId = uuidv4();
    room.addPlayer(playerId, trimmedName, false);
    socketToRoom.set(socket.id, normalCode);
    socketToPlayer.set(socket.id, playerId);
    socket.join(normalCode);

    cb(true, undefined, playerId);
    socket.emit('room:joined', room.getPersonalState(playerId), room.getSettings());
    io.to(normalCode).emit('room:player-list', room.getPublicState().players);
    console.log(`[+] Odaya katıldı: ${normalCode} — ${trimmedName}`);
  });

  socket.on('room:leave', (cb) => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (room && playerId) {
      if (voiceSockets.delete(socket.id)) io.to(room.code).emit('voice:peer-left', playerId);
      if (room.leave(playerId)) {
        socket.leave(room.code);
        socketToRoom.delete(socket.id);
        socketToPlayer.delete(socket.id);
        if (room.getPlayerCount() === 0) {
          room.dispose();
          rooms.delete(room.code);
          console.log(`[-] Oda silindi (son kişi ayrıldı): ${room.code}`);
        } else {
          io.to(room.code).emit('room:player-list', room.getPublicState().players);
        }
        console.log(`[-] Odadan ayrıldı: ${room.code}`);
      }
    }
    cb();
  });

  socket.on('room:transfer-host', (targetId) => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!room || !playerId) return;
    const err = room.transferHost(playerId, targetId);
    if (err) { socket.emit('error', err); return; }
    io.to(room.code).emit('room:player-list', room.getPublicState().players);
  });

  socket.on('game:start', (settings) => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!room || !playerId) return;

    const err = room.startGame(playerId, settings);
    if (err) {
      socket.emit('error', err);
      return;
    }

    for (const [sid, pid] of socketToPlayer.entries()) {
      if (socketToRoom.get(sid) === room.code) {
        io.to(sid).emit('game:started', room.getPersonalState(pid));
      }
    }
  });

  socket.on('game:vote', (targetId) => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!room || !playerId) return;
    const err = room.castVote(playerId, targetId);
    if (err) socket.emit('error', err);
  });

  socket.on('game:night-action', (targetId) => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!room || !playerId) return;
    const err = room.submitNightAction(playerId, targetId);
    if (err) socket.emit('error', err);
  });

  socket.on('game:verdict-vote', (vote) => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!room || !playerId) return;
    const err = room.castVerdictVote(playerId, vote);
    if (err) socket.emit('error', err);
  });

  socket.on('game:hunter-shot', (targetId) => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!room || !playerId) return;
    const err = room.hunterShot(playerId, targetId);
    if (err) socket.emit('error', err);
  });

  socket.on('chat:send', (content, channel) => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!room || !playerId) return;
    const trimmed = content.trim().substring(0, 500);
    if (!trimmed) return;
    const err = room.sendMessage(playerId, trimmed, channel);
    if (err) socket.emit('error', err);
  });

  socket.on('notes:update', (notes) => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!room || !playerId) return;
    room.updateNotes(playerId, notes.substring(0, 2000));
  });

  socket.on('notes:read', (targetPlayerId, cb) => {
    const room = getRoom(socket.id);
    if (!room) return cb('');
    cb(room.getNotes(targetPlayerId));
  });

  socket.on('deathnote:update', (note) => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!room || !playerId) return;
    room.updateDeathNote(playerId, note.substring(0, 500));
  });

  socket.on('chat:whisper', (targetId, content) => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (!room || !playerId) return;
    const trimmed = content.trim().substring(0, 300);
    if (!trimmed) return;
    const err = room.whisper(playerId, targetId, trimmed);
    if (err) socket.emit('error', err);
  });

  // ── Voice signaling ──────────────────────────────────────────────────────────

  socket.on('voice:ready', (cb) => {
    voiceSockets.add(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    const roomCode = socketToRoom.get(socket.id);
    if (!playerId || !roomCode) { cb([]); return; }

    const existingPeers: string[] = [];
    for (const [sid, pid] of socketToPlayer.entries()) {
      if (sid !== socket.id && socketToRoom.get(sid) === roomCode && voiceSockets.has(sid)) {
        existingPeers.push(pid);
        io.to(sid).emit('voice:peer-ready', playerId);
      }
    }
    cb(existingPeers);
  });

  socket.on('voice:leave', () => {
    if (!voiceSockets.has(socket.id)) return;
    voiceSockets.delete(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    const roomCode = socketToRoom.get(socket.id);
    if (playerId && roomCode) io.to(roomCode).emit('voice:peer-left', playerId);
  });

  socket.on('voice:offer', (to, sdp) => {
    const from = socketToPlayer.get(socket.id);
    const roomCode = socketToRoom.get(socket.id);
    if (!from || !roomCode) return;
    for (const [sid, pid] of socketToPlayer.entries()) {
      if (pid === to && socketToRoom.get(sid) === roomCode) {
        io.to(sid).emit('voice:offer', from, sdp);
        break;
      }
    }
  });

  socket.on('voice:answer', (to, sdp) => {
    const from = socketToPlayer.get(socket.id);
    const roomCode = socketToRoom.get(socket.id);
    if (!from || !roomCode) return;
    for (const [sid, pid] of socketToPlayer.entries()) {
      if (pid === to && socketToRoom.get(sid) === roomCode) {
        io.to(sid).emit('voice:answer', from, sdp);
        break;
      }
    }
  });

  socket.on('voice:ice', (to, candidate) => {
    const from = socketToPlayer.get(socket.id);
    const roomCode = socketToRoom.get(socket.id);
    if (!from || !roomCode) return;
    for (const [sid, pid] of socketToPlayer.entries()) {
      if (pid === to && socketToRoom.get(sid) === roomCode) {
        io.to(sid).emit('voice:ice', from, candidate);
        break;
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    const room = getRoom(socket.id);
    const playerId = socketToPlayer.get(socket.id);
    if (voiceSockets.has(socket.id)) {
      voiceSockets.delete(socket.id);
      if (playerId && room) io.to(room.code).emit('voice:peer-left', playerId);
    }
    if (room && playerId) {
      // Oyuncu hemen silinmez: sayfa yenileme / telefon kilidi sonrası aynı isimle döner.
      room.markDisconnected(playerId);
      const code = room.code;
      setTimeout(() => {
        if (rooms.get(code) !== room) return;
        if (room.purgeIfDisconnected(playerId)) {
          io.to(code).emit('room:player-list', room.getPublicState().players);
          console.log(`[-] Lobiden çıkarıldı (dönmedi): ${code}`);
        }
      }, LOBBY_GRACE_MS);
      if (room.getConnectedCount() === 0) {
        setTimeout(() => {
          if (rooms.get(code) === room && room.getConnectedCount() === 0) {
            room.dispose();
            rooms.delete(code);
            console.log(`[-] Oda silindi (boş kaldı): ${code}`);
          }
        }, EMPTY_ROOM_GRACE_MS);
      }
    }
    socketToRoom.delete(socket.id);
    socketToPlayer.delete(socket.id);
    console.log(`[-] ${socket.id} ayrıldı`);
  });
});

app.get('/health', (_, res) => res.json({ ok: true, rooms: rooms.size }));

// Web arayüzü derlenmişse (web/dist) aynı sunucudan sun — tek adres yeterli olur.
// Geliştirmede (npm run dev) arayüzü Vite sunar, bu blok devreye girmez.
const webDist = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(path.join(webDist, 'index.html'))) {
  app.use(express.static(webDist, { index: false, maxAge: '1h' }));
  // SPA: /lobby, /game gibi yolları da index.html'e yönlendir
  app.get('*', (_, res) => res.sendFile(path.join(webDist, 'index.html')));
  console.log(`🌐 Web arayüzü sunuluyor: ${webDist}`);
}

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`🧛 Vampir Köylü sunucusu çalışıyor: http://localhost:${PORT} [build: ${new Date().toISOString()}]`);
});
