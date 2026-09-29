import { create } from 'zustand';
import {
  PersonalGameState, Player, Message, RoleType, TeamType,
  PhaseType, GameSettings, GraveEntry, DeathReveal, VerdictChoice,
} from '@vampir-koylu/shared';
import { socket } from '../socket';

// ── Oturum (sayfa yenilenince odaya geri dönmek için) ─────────────────────────
// sessionStorage sekmeye özeldir: yenilemede kalır, sekme kapanınca silinir.

const SESSION_KEY = 'vk:session';

interface SavedSession { roomCode: string; name: string }

export function saveSession(roomCode: string, name: string): void {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, name })); } catch { /* gizli sekme vb. */ }
}

export function clearSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* yok say */ }
}

function loadSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return s?.roomCode && s?.name ? s : null;
  } catch {
    return null;
  }
}

const savedSession = typeof window !== 'undefined' ? loadSession() : null;

interface GameStore {
  myId: string | null;
  myName: string | null;
  roomCode: string | null;
  phase: PhaseType;
  dayNumber: number;
  players: Record<string, Player>;
  messages: Message[];
  myRole: RoleType | null;
  myTeam: TeamType | null;
  seerResults: Record<string, TeamType>;
  winner: TeamType | null;
  winReason: string | null;
  phaseEndTime: number | null;
  hunterPlayerId: string | null;
  votes: Record<string, string | undefined>;
  /** Karar oylamasında oy verenlerin listesi (oylar gizli) */
  verdictVoted: string[];
  myVerdict: VerdictChoice;
  accusedPlayerId: string | null;
  roleList: RoleType[];
  graveyard: GraveEntry[];
  trialsLeft: number;
  votesNeeded: number;
  settings: GameSettings | null;
  /** Vasiyet */
  myNotes: string;
  myDeathNote: string;
  error: string | null;
  isConnected: boolean;
  /** Sayfa yenilendikten sonra odaya otomatik geri bağlanılıyor */
  restoring: boolean;
  /** Oynatılmayı bekleyen sinematik ölüm açıklamaları */
  revealQueue: DeathReveal[];
  /** Açıklaması henüz oynatılmamış ölülerin rolleri gizli tutulur */
  hiddenRoleIds: string[];
  /** Oyun başında rol tanıtım kartı */
  showRoleIntro: boolean;

  setMyId: (id: string) => void;
  setMyName: (name: string) => void;
  setMyNotes: (notes: string) => void;
  setMyDeathNote: (note: string) => void;
  setMyVerdict: (v: VerdictChoice) => void;
  clearError: () => void;
  finishReveal: () => void;
  dismissRoleIntro: () => void;
  reset: () => void;
  applyState: (state: PersonalGameState, settings?: GameSettings) => void;
}

const defaultState = {
  myId: null,
  myName: null,
  roomCode: null,
  phase: 'lobby' as PhaseType,
  dayNumber: 0,
  players: {},
  messages: [],
  myRole: null,
  myTeam: null,
  seerResults: {},
  winner: null,
  winReason: null,
  phaseEndTime: null,
  hunterPlayerId: null,
  votes: {},
  verdictVoted: [],
  myVerdict: 'abstain' as VerdictChoice,
  accusedPlayerId: null,
  roleList: [],
  graveyard: [],
  trialsLeft: 0,
  votesNeeded: 0,
  settings: null,
  myNotes: '',
  myDeathNote: '',
  error: null,
  isConnected: false,
  restoring: false,
  revealQueue: [],
  hiddenRoleIds: [],
  showRoleIntro: false,
};

/**
 * Sunucunun genel state'i rolleri gizler; vampir takım arkadaşları ve kendi rolümüz
 * sadece kişisel state'te gelir. Rol oyun boyunca değişmediği için önceki bilgiyi koru.
 */
function mergePlayers(prev: Record<string, Player>, next: Record<string, Player>): Record<string, Player> {
  const out: Record<string, Player> = {};
  for (const [id, p] of Object.entries(next)) {
    out[id] = {
      ...p,
      role: p.role ?? prev[id]?.role,
      team: p.team ?? prev[id]?.team,
    };
  }
  return out;
}

export const useGameStore = create<GameStore>((set) => ({
  ...defaultState,
  restoring: !!savedSession,

  setMyId: (id) => set({ myId: id }),
  setMyName: (name) => set({ myName: name }),
  setMyNotes: (notes) => {
    set({ myNotes: notes });
    socket.emit('notes:update', notes);
  },
  setMyDeathNote: (note) => {
    set({ myDeathNote: note });
    socket.emit('deathnote:update', note);
  },
  setMyVerdict: (v) => {
    set({ myVerdict: v });
    socket.emit('game:verdict-vote', v);
  },
  clearError: () => set({ error: null }),
  finishReveal: () => set((prev) => {
    const [done, ...rest] = prev.revealQueue;
    return {
      revealQueue: rest,
      hiddenRoleIds: done ? prev.hiddenRoleIds.filter(id => id !== done.playerId) : prev.hiddenRoleIds,
    };
  }),
  dismissRoleIntro: () => set({ showRoleIntro: false }),
  reset: () => set(defaultState),

  applyState: (state, settings) => set((prev) => ({
    myId: state.myPlayerId ?? prev.myId,
    roomCode: state.roomCode,
    phase: state.phase,
    dayNumber: state.dayNumber,
    players: state.players,
    messages: state.messages,
    myRole: state.phase === 'lobby' ? null : state.myRole,
    myTeam: state.phase === 'lobby' ? null : state.myTeam,
    seerResults: state.seerResults ?? {},
    winner: state.winner ?? null,
    phaseEndTime: state.phaseEndTime ?? null,
    hunterPlayerId: state.hunterPlayerId ?? null,
    accusedPlayerId: state.accusedPlayerId ?? null,
    roleList: state.roleList ?? [],
    graveyard: state.graveyard ?? [],
    trialsLeft: state.trialsLeft ?? 0,
    votesNeeded: state.votesNeeded ?? 0,
    ...(state.phase === 'lobby' ? { revealQueue: [], hiddenRoleIds: [], winReason: null } : {}),
    ...(settings ? { settings } : {}),
  })),
}));

// ── Yeniden bağlanma ──────────────────────────────────────────────────────────
// Telefon kilitlenince/sekme arka plana alınınca soket düşer. Geri gelince
// aynı isimle odaya tekrar katılıp kaldığımız yerden devam ederiz.

let hadSession = false;

// Sayfa yenilendiyse kayıtlı odaya aynı isimle geri katıl
if (savedSession) {
  useGameStore.setState({ myName: savedSession.name });
  socket.once('connect', () => {
    socket.emit('room:join', savedSession.roomCode, savedSession.name, (ok, _err, playerId) => {
      if (ok && playerId) {
        useGameStore.setState({ myId: playerId });
        // restoring, room:joined gelince kapanır (roomCode o zaman dolar)
      } else {
        clearSession();
        useGameStore.setState({ restoring: false, myName: null });
      }
    });
  });
  socket.connect();
}

/** Yeniden bağlanma ekranındaki "Vazgeç" */
export function abandonRestore(): void {
  clearSession();
  socket.disconnect();
  useGameStore.setState({ ...defaultState, restoring: false });
}

socket.on('connect', () => {
  useGameStore.setState({ isConnected: true });
  const { roomCode, myName } = useGameStore.getState();
  if (hadSession && roomCode && myName) {
    socket.emit('room:join', roomCode, myName, (ok) => {
      if (!ok) useGameStore.setState({ error: 'Odaya yeniden bağlanılamadı.' });
    });
  }
});
socket.on('disconnect', () => {
  hadSession = !!useGameStore.getState().roomCode;
  useGameStore.setState({ isConnected: false });
});

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !socket.connected && useGameStore.getState().roomCode) {
      socket.connect();
    }
  });
}

// ── Sunucu olayları ───────────────────────────────────────────────────────────

socket.on('room:joined', (state, settings) => {
  useGameStore.getState().applyState(state, settings);
  const { myName, restoring } = useGameStore.getState();
  if (myName) saveSession(state.roomCode, myName);
  if (restoring) useGameStore.setState({ restoring: false });
});

socket.on('room:player-list', (players) => {
  useGameStore.setState((prev) => ({ players: mergePlayers(prev.players, players) }));
});

socket.on('game:started', (state) => {
  useGameStore.getState().applyState(state);
  useGameStore.setState({
    myNotes: '',
    myDeathNote: '',
    showRoleIntro: true,
    votes: {},
    verdictVoted: [],
    myVerdict: 'abstain',
    winner: null,
    winReason: null,
  });
});

socket.on('game:state', (state) => {
  useGameStore.setState((prev) => ({
    phase: state.phase,
    players: mergePlayers(prev.players, state.players),
    phaseEndTime: state.phaseEndTime ?? null,
    hunterPlayerId: state.hunterPlayerId ?? null,
    accusedPlayerId: state.accusedPlayerId ?? null,
    winner: state.winner ?? null,
    roleList: state.roleList,
    graveyard: state.graveyard,
    trialsLeft: state.trialsLeft,
    votesNeeded: state.votesNeeded,
  }));
});

socket.on('game:phase', (phase, dayNumber, endTime, accusedPlayerId) => {
  useGameStore.setState((prev) => ({
    phase,
    dayNumber,
    phaseEndTime: endTime,
    accusedPlayerId: accusedPlayerId ?? null,
    ...(phase === 'voting' || phase === 'night' ? { votes: {} } : {}),
    ...(phase === 'verdict' ? { verdictVoted: [], myVerdict: 'abstain' as VerdictChoice } : {}),
    ...(phase !== prev.phase && phase === 'night' ? { verdictVoted: [] } : {}),
  }));
});

socket.on('game:reveal', (reveals) => {
  useGameStore.setState((prev) => ({
    revealQueue: [...prev.revealQueue, ...reveals],
    hiddenRoleIds: [...prev.hiddenRoleIds, ...reveals.map(r => r.playerId)],
    players: reveals.reduce((acc, r) => ({
      ...acc,
      [r.playerId]: acc[r.playerId] ? { ...acc[r.playerId], isAlive: false, role: r.role } : acc[r.playerId],
    }), prev.players),
  }));
});

socket.on('verdict:update', (voted) => {
  useGameStore.setState({ verdictVoted: voted });
});

socket.on('game:hunter-triggered', (hunterId) => {
  useGameStore.setState({ hunterPlayerId: hunterId });
});

socket.on('game:over', (winner, reason) => {
  useGameStore.setState({ winner, winReason: reason, phase: 'game-over', revealQueue: [], hiddenRoleIds: [] });
});

socket.on('chat:message', (msg) => {
  useGameStore.setState((prev) => ({
    messages: [...prev.messages, msg],
  }));
});

socket.on('vote:update', (votes) => {
  useGameStore.setState({ votes });
});

socket.on('seer:result', (targetId, team) => {
  useGameStore.setState((prev) => ({
    seerResults: { ...prev.seerResults, [targetId]: team },
  }));
});

socket.on('error', (message) => {
  useGameStore.setState({ error: message });
});
