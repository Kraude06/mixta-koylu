export type RoleType = 'villager' | 'vampire' | 'doctor' | 'seer' | 'hunter';
export type TeamType = 'village' | 'vampire';

/**
 * Faz akışı (Town of Salem tarzı):
 *   discussion → voting ⇄ (trial → verdict → last-words → execution) → night → morning → discussion ...
 * İlk gün sadece tartışma vardır, oylama yapılmaz.
 */
export type PhaseType =
  | 'lobby'
  | 'discussion'     // Serbest tartışma, oylama yok
  | 'voting'         // Çoğunluk oyu toplanınca anında yargılama başlar
  | 'trial'          // Sanık savunma yapar (sadece o konuşur)
  | 'verdict'        // Suçlu / suçsuz / çekimser oylaması
  | 'last-words'     // Suçlu bulunan son sözlerini söyler
  | 'execution'      // İnfaz + rol açıklaması (sinematik)
  | 'night'
  | 'morning'        // Gece ölenlerin sinematik açıklaması
  | 'hunter-revenge'
  | 'game-over';

export type ChatChannel = 'public' | 'vampire' | 'system' | 'whisper';

/** Sistem mesajlarının renk/stil türü */
export type MessageKind = 'info' | 'death' | 'vote' | 'verdict' | 'good' | 'bad' | 'whisper-notice' | 'phase';

export type DeathCause = 'killed' | 'voted' | 'hunter';
export type VerdictChoice = 'guilty' | 'innocent' | 'abstain';

export interface Player {
  id: string;
  name: string;
  /** Oyuncu numarası (1'den başlar), ToS'taki gibi her yerde gösterilir */
  number: number;
  isAlive: boolean;
  isHost: boolean;
  role?: RoleType;
  team?: TeamType;
  vote?: string;
  nightActionDone?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  channel: ChatChannel;
  timestamp: number;
  /** Sadece bu oyuncuya görünen mesaj (fısıltı, kişisel gece sonucu vb.) */
  recipientId?: string;
  kind?: MessageKind;
}

export interface GameSettings {
  minPlayers: number;
  vampireCount: number;
  includeDoctor: boolean;
  includeSeer: boolean;
  includeHunter: boolean;
  discussionDuration: number;
  votingDuration: number;
  trialDuration: number;
  verdictDuration: number;
  nightDuration: number;
}

export interface GraveEntry {
  playerId: string;
  day: number;
  cause: DeathCause;
}

/** Bir ölümün sinematik açıklaması için gereken her şey */
export interface DeathReveal {
  playerId: string;
  playerName: string;
  playerNumber: number;
  role: RoleType;
  cause: DeathCause;
  will: string;
  deathNote: string;
}

export interface PublicGameState {
  roomCode: string;
  phase: PhaseType;
  dayNumber: number;
  players: Record<string, Player>;
  messages: Message[];
  winner?: TeamType;
  phaseEndTime?: number;
  hunterPlayerId?: string;
  accusedPlayerId?: string;
  /** Oyundaki rollerin listesi (herkes görür) */
  roleList: RoleType[];
  graveyard: GraveEntry[];
  trialsLeft: number;
  votesNeeded: number;
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
  goal: string;
  abilityLabel?: string;
  icon: string;
}

export const ROLE_INFO: Record<RoleType, RoleInfo> = {
  villager: {
    type: 'villager',
    team: 'village',
    label: 'Köylü',
    description: 'Özel bir yeteneğin yok. Gündüz dikkatle dinle, oyunla vampirleri bul.',
    goal: 'Tüm vampirleri köyden temizle.',
    icon: '🧑‍🌾',
  },
  vampire: {
    type: 'vampire',
    team: 'vampire',
    label: 'Vampir',
    description: 'Her gece bir köylüyü öldür. Gece vampir kanalından takımınla konuşabilirsin. Ölüm notu bırakabilirsin.',
    goal: 'Vampir sayısı köylülere eşit ya da fazla olsun.',
    abilityLabel: 'Kurban Seç',
    icon: '🧛',
  },
  doctor: {
    type: 'doctor',
    team: 'village',
    label: 'Doktor',
    description: 'Her gece bir oyuncuyu vampir saldırısından koru. Arka arkaya aynı kişiyi koruyamazsın.',
    goal: 'Tüm vampirleri köyden temizle.',
    abilityLabel: 'Koru',
    icon: '🩺',
  },
  seer: {
    type: 'seer',
    team: 'village',
    label: 'Kahin',
    description: 'Her gece bir oyuncunun köylü mü vampir mi olduğunu öğren.',
    goal: 'Tüm vampirleri köyden temizle.',
    abilityLabel: 'Sorgula',
    icon: '🔮',
  },
  hunter: {
    type: 'hunter',
    team: 'village',
    label: 'Avcı',
    description: 'Öldürüldüğünde (oylamayla veya vampirce) bir oyuncuyu yanında götürebilirsin.',
    goal: 'Tüm vampirleri köyden temizle.',
    abilityLabel: 'Vur',
    icon: '🏹',
  },
};

// ── Sinematik zamanlama ─────────────────────────────────────────────────────
// Sunucu faz sürelerini, istemci animasyon adımlarını buradan hesaplar;
// böylece ikisi her zaman senkron kalır.

export const REVEAL_STEP_MS = {
  intro: 2600,     // "X dün gece öldü" + spot ışığı
  cause: 2400,     // Ölüm sebebi
  will: 4200,      // Vasiyet parşömeni
  noWill: 1800,    // "Vasiyet bulunamadı"
  deathNote: 3600, // Ölüm notu
  role: 3000,      // "X bir Kahin idi"
} as const;

export function revealDurationMs(r: Pick<DeathReveal, 'will' | 'deathNote'>): number {
  return REVEAL_STEP_MS.intro
    + REVEAL_STEP_MS.cause
    + (r.will.trim() ? REVEAL_STEP_MS.will : REVEAL_STEP_MS.noWill)
    + (r.deathNote.trim() ? REVEAL_STEP_MS.deathNote : 0)
    + REVEAL_STEP_MS.role;
}

export const MAX_TRIALS_PER_DAY = 3;
export const LAST_WORDS_MS = 8000;
export const HUNTER_REVENGE_MS = 25000;

export interface VoiceSDP {
  type: string;
  sdp?: string;
}

export interface VoiceICE {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface ServerToClientEvents {
  'room:joined': (state: PersonalGameState, settings: GameSettings) => void;
  'room:player-list': (players: Record<string, Player>) => void;
  'game:started': (state: PersonalGameState) => void;
  'game:state': (state: PublicGameState) => void;
  'game:phase': (phase: PhaseType, dayNumber: number, endTime: number, accusedPlayerId?: string) => void;
  /** Sırayla oynatılacak ölüm açıklamaları */
  'game:reveal': (reveals: DeathReveal[]) => void;
  'game:over': (winner: TeamType, reason: string) => void;
  'game:hunter-triggered': (hunterId: string) => void;
  'chat:message': (msg: Message) => void;
  'vote:update': (votes: Record<string, string | undefined>) => void;
  /** Karar oylamasında kimin oy verdiği (oyun içeriği gizli) */
  'verdict:update': (voted: string[]) => void;
  'seer:result': (targetId: string, team: TeamType) => void;
  'error': (message: string) => void;
  'voice:peer-ready': (peerId: string) => void;
  'voice:peer-left': (peerId: string) => void;
  'voice:offer': (from: string, sdp: VoiceSDP) => void;
  'voice:answer': (from: string, sdp: VoiceSDP) => void;
  'voice:ice': (from: string, candidate: VoiceICE) => void;
}

export interface ClientToServerEvents {
  'room:create': (playerName: string, cb: (roomCode: string, playerId: string) => void) => void;
  'room:join': (roomCode: string, playerName: string, cb: (ok: boolean, err?: string, playerId?: string) => void) => void;
  'game:start': (settings: Partial<GameSettings>) => void;
  /** targetId boş string ise oy geri çekilir */
  'game:vote': (targetId: string) => void;
  'game:verdict-vote': (vote: VerdictChoice) => void;
  'game:night-action': (targetId: string) => void;
  'game:hunter-shot': (targetId: string) => void;
  'chat:send': (content: string, channel: ChatChannel) => void;
  'chat:whisper': (targetId: string, content: string) => void;
  /** Vasiyet */
  'notes:update': (notes: string) => void;
  'notes:read': (playerId: string, cb: (notes: string) => void) => void;
  'deathnote:update': (note: string) => void;
  'voice:ready': (cb: (existingPeers: string[]) => void) => void;
  'voice:leave': () => void;
  'voice:offer': (to: string, sdp: VoiceSDP) => void;
  'voice:answer': (to: string, sdp: VoiceSDP) => void;
  'voice:ice': (to: string, candidate: VoiceICE) => void;
}
