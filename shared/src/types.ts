export type RoleType = 'villager' | 'vampire' | 'doctor' | 'seer' | 'hunter';
export type TeamType = 'village' | 'vampire';
export type PhaseType = 'lobby' | 'day' | 'trial' | 'verdict' | 'night' | 'hunter-revenge' | 'game-over';
export type ChatChannel = 'public' | 'vampire' | 'system';

export interface Player {
  id: string;
  name: string;
  isAlive: boolean;
  isHost: boolean;
  role?: RoleType;
  team?: TeamType;
  vote?: string;
  nightActionDone?: boolean;
  notes?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  channel: ChatChannel;
  timestamp: number;
}

export interface GameSettings {
  minPlayers: number;
  vampireCount: number;
  includeDoctor: boolean;
  includeSeer: boolean;
  includeHunter: boolean;
  dayDuration: number;
  nightDuration: number;
  trialDuration: number;
  verdictDuration: number;
}

export interface PublicGameState {
  roomCode: string;
  phase: PhaseType;
  dayNumber: number;
  players: Record<string, Player>;
  messages: Message[];
  winner?: TeamType;
  phaseEndTime?: number;
  eliminatedPlayerId?: string;
  hunterPlayerId?: string;
  accusedPlayerId?: string;
}

export interface PersonalGameState extends PublicGameState {
  myPlayerId: string;
  myRole: RoleType;
  myTeam: TeamType;
  seerResults: Record<string, TeamType>;
}

export interface RoleInfo {
  type: RoleType;
  team: TeamType;
  label: string;
  description: string;
  abilityLabel?: string;
  icon: string;
}

export const ROLE_INFO: Record<RoleType, RoleInfo> = {
  villager: {
    type: 'villager',
    team: 'village',
    label: 'Köylü',
    description: 'Masum bir köylüsün. Vampirleri oylamayla belirleyip köyü kurtar.',
    icon: '🧑‍🌾',
  },
  vampire: {
    type: 'vampire',
    team: 'vampire',
    label: 'Vampir',
    description: 'Her gece bir köylüyü öldür. Vampirler köylülerle eşit ya da fazla olduğunda kazanırsınız.',
    abilityLabel: 'Kurban Seç',
    icon: '🧛',
  },
  doctor: {
    type: 'doctor',
    team: 'village',
    label: 'Doktor',
    description: 'Her gece bir oyuncuyu vampir saldırısından koru. Arka arkaya aynı kişiyi koruyamazsın.',
    abilityLabel: 'Koru',
    icon: '🩺',
  },
  seer: {
    type: 'seer',
    team: 'village',
    label: 'Kahin',
    description: 'Her gece bir oyuncunun köylü mü vampir mi olduğunu öğren.',
    abilityLabel: 'Sorgula',
    icon: '🔮',
  },
  hunter: {
    type: 'hunter',
    team: 'village',
    label: 'Avcı',
    description: 'Öldürüldüğünde (oylamayla veya vampirce) bir oyuncuyu yanında götürebilirsin.',
    abilityLabel: 'Vur',
    icon: '🏹',
  },
};

export interface ServerToClientEvents {
  'room:joined': (state: PersonalGameState, settings: GameSettings) => void;
  'room:player-list': (players: Record<string, Player>) => void;
  'game:started': (state: PersonalGameState) => void;
  'game:state': (state: PublicGameState) => void;
  'game:phase': (phase: PhaseType, dayNumber: number, endTime: number) => void;
  'game:eliminated': (playerId: string, role: RoleType, reason: 'voted' | 'killed' | 'hunter') => void;
  'game:night-result': (survived: string[], killed: string[]) => void;
  'game:over': (winner: TeamType, reason: string) => void;
  'game:hunter-triggered': (hunterId: string) => void;
  'chat:message': (msg: Message) => void;
  'vote:update': (votes: Record<string, string | undefined>) => void;
  'verdict:update': (votes: Record<string, 'guilty' | 'innocent' | undefined>) => void;
  'seer:result': (targetId: string, team: TeamType) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'room:create': (playerName: string, cb: (roomCode: string, playerId: string) => void) => void;
  'room:join': (roomCode: string, playerName: string, cb: (ok: boolean, err?: string, playerId?: string) => void) => void;
  'game:start': (settings: Partial<GameSettings>) => void;
  'game:vote': (targetId: string) => void;
  'game:verdict-vote': (vote: 'guilty' | 'innocent') => void;
  'game:night-action': (targetId: string) => void;
  'game:hunter-shot': (targetId: string) => void;
  'chat:send': (content: string, channel: ChatChannel) => void;
  'notes:update': (notes: string) => void;
  'notes:read': (playerId: string, cb: (notes: string) => void) => void;
}
