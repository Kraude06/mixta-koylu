import { create } from 'zustand';
import {
  PersonalGameState, Player, Message, RoleType, TeamType,
  PhaseType, GameSettings, ChatChannel,
} from '@vampir-koylu/shared';
import { socket } from '../socket';

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
  phaseEndTime: number | null;
  eliminatedPlayerId: string | null;
  hunterPlayerId: string | null;
  votes: Record<string, string | undefined>;
  verdictVotes: Record<string, 'guilty' | 'innocent' | undefined>;
  accusedPlayerId: string | null;
  settings: GameSettings | null;
  myNotes: string;
  error: string | null;
  isConnected: boolean;
  deathEvent: { playerId: string; playerName: string; role: RoleType; reason: 'voted' | 'killed' | 'hunter'; notes: string; isMe: boolean } | null;

  setMyId: (id: string) => void;
  setMyName: (name: string) => void;
  setMyNotes: (notes: string) => void;
  clearError: () => void;
  clearDeathEvent: () => void;
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
  phaseEndTime: null,
  eliminatedPlayerId: null,
  hunterPlayerId: null,
  votes: {},
  verdictVotes: {},
  accusedPlayerId: null,
  settings: null,
  myNotes: '',
  error: null,
  isConnected: false,
  deathEvent: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...defaultState,

  setMyId: (id) => set({ myId: id }),
  setMyName: (name) => set({ myName: name }),
  setMyNotes: (notes) => {
    set({ myNotes: notes });
    socket.emit('notes:update', notes);
  },
  clearError: () => set({ error: null }),
  clearDeathEvent: () => set({ deathEvent: null }),
  reset: () => set(defaultState),

  applyState: (state, settings) => set((prev) => ({
    myId: state.myPlayerId ?? prev.myId,
    roomCode: state.roomCode,
    phase: state.phase,
    dayNumber: state.dayNumber,
    players: state.players,
    messages: state.messages,
    myRole: state.myRole ?? prev.myRole,
    myTeam: state.myTeam ?? prev.myTeam,
    seerResults: state.seerResults ?? prev.seerResults,
    winner: state.winner ?? null,
    phaseEndTime: state.phaseEndTime ?? null,
    eliminatedPlayerId: state.eliminatedPlayerId ?? null,
    hunterPlayerId: state.hunterPlayerId ?? null,
    accusedPlayerId: state.accusedPlayerId ?? null,
    ...(settings ? { settings } : {}),
  })),
}));

// Wire socket events to store
socket.on('connect', () => useGameStore.setState({ isConnected: true }));
socket.on('disconnect', () => useGameStore.setState({ isConnected: false }));

socket.on('room:joined', (state, settings) => {
  useGameStore.getState().applyState(state, settings);
});

socket.on('room:player-list', (players) => {
  useGameStore.setState({ players });
});

socket.on('game:started', (state) => {
  useGameStore.getState().applyState(state);
});

socket.on('game:state', (state) => {
  useGameStore.setState({
    phase: state.phase,
    players: state.players,
    phaseEndTime: state.phaseEndTime ?? null,
    eliminatedPlayerId: state.eliminatedPlayerId ?? null,
    hunterPlayerId: state.hunterPlayerId ?? null,
    accusedPlayerId: state.accusedPlayerId ?? null,
    winner: state.winner ?? null,
  });
});

socket.on('game:phase', (phase, dayNumber, endTime, accusedPlayerId) => {
  useGameStore.setState({
    phase,
    dayNumber,
    phaseEndTime: endTime,
    votes: {},
    verdictVotes: {},
    eliminatedPlayerId: null,
    accusedPlayerId: accusedPlayerId ?? null,
  });
});

socket.on('verdict:update', (votes) => {
  useGameStore.setState({ verdictVotes: votes });
});

socket.on('game:eliminated', (playerId, role, reason, notes) => {
  const { myId, players } = useGameStore.getState();
  const playerName = players[playerId]?.name ?? '?';
  useGameStore.setState((prev) => ({
    players: {
      ...prev.players,
      [playerId]: prev.players[playerId]
        ? { ...prev.players[playerId], isAlive: false, role }
        : prev.players[playerId],
    },
    eliminatedPlayerId: playerId,
    deathEvent: { playerId, playerName, role, reason, notes: notes ?? '', isMe: playerId === myId },
  }));
});

socket.on('game:hunter-triggered', (hunterId) => {
  useGameStore.setState({ hunterPlayerId: hunterId });
});

socket.on('game:over', (winner) => {
  useGameStore.setState({ winner, phase: 'game-over' });
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
