import { v4 as uuidv4 } from 'uuid';
import {
  Player, RoleType, TeamType, PhaseType, Message, ChatChannel, MessageKind,
  GameSettings, PublicGameState, PersonalGameState, GraveEntry, DeathReveal,
  DeathCause, VerdictChoice, ROLE_INFO,
  revealDurationMs, MAX_TRIALS_PER_DAY, LAST_WORDS_MS, HUNTER_REVENGE_MS,
} from '@vampir-koylu/shared';

const DEFAULT_SETTINGS: GameSettings = {
  minPlayers: 4,
  vampireCount: 1,
  includeDoctor: true,
  includeSeer: true,
  includeHunter: false,
  discussionDuration: 45,
  votingDuration: 60,
  trialDuration: 25,
  verdictDuration: 20,
  nightDuration: 40,
};

const ROLE_ORDER: RoleType[] = ['vampire', 'seer', 'doctor', 'hunter', 'villager'];

function buildRoleList(count: number, settings: GameSettings): RoleType[] {
  const maxVampires = Math.max(1, Math.floor(count / 3));
  const vampCount = Math.min(Math.max(1, settings.vampireCount), maxVampires);
  const roles: RoleType[] = [];
  for (let i = 0; i < vampCount; i++) roles.push('vampire');
  if (settings.includeSeer) roles.push('seer');
  if (settings.includeDoctor) roles.push('doctor');
  if (settings.includeHunter) roles.push('hunter');
  while (roles.length < count) roles.push('villager');
  return roles.slice(0, count);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Room {
  readonly code: string;
  private players: Record<string, Player> = {};
  private messages: Message[] = [];
  private phase: PhaseType = 'lobby';
  private dayNumber = 0;
  private settings: GameSettings = { ...DEFAULT_SETTINGS };
  private wills: Record<string, string> = {};
  private deathNotes: Record<string, string> = {};
  private lastDoctorTarget: string | null = null;
  private nightActions: Record<string, string> = {};
  private seerResults: Record<string, Record<string, TeamType>> = {};
  private phaseEndTime = 0;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private winner?: TeamType;
  private hunterPending?: string;
  private hunterNext: 'night' | 'discussion' = 'night';
  private accusedPlayerId?: string;
  private verdictVotes: Record<string, 'guilty' | 'innocent'> = {};
  private roleList: RoleType[] = [];
  private graveyard: GraveEntry[] = [];
  private trialsLeft = MAX_TRIALS_PER_DAY;
  private votingRemainingMs = 0;
  /** Son açıklanan ölümler — faz bitince rolleri sohbete yazılır */
  private pendingReveals: DeathReveal[] = [];
  private disconnected = new Set<string>();

  onBroadcast?: (event: string, data: unknown) => void;
  onSendTo?: (playerId: string, event: string, data: unknown) => void;

  constructor(code: string) {
    this.code = code;
  }

  // ── Oyuncu yönetimi ───────────────────────────────────────────────────────

  addPlayer(id: string, name: string, isHost: boolean): Player {
    const player: Player = {
      id, name, isAlive: true, isHost,
      number: Object.keys(this.players).length + 1,
    };
    this.players[id] = player;
    return player;
  }

  findPlayerByName(name: string): Player | undefined {
    return Object.values(this.players).find(p => p.name.toLowerCase() === name.toLowerCase());
  }

  getPhase(): PhaseType {
    return this.phase;
  }

  /** Lobide oyuncuyu siler; oyun sırasında sadece "bağlantısı koptu" olarak işaretler. */
  removePlayer(id: string): void {
    if (this.phase !== 'lobby') {
      this.disconnected.add(id);
      return;
    }
    delete this.players[id];
    this.renumber();
    const remaining = Object.values(this.players);
    if (remaining.length > 0 && !remaining.some(p => p.isHost)) {
      remaining[0].isHost = true;
    }
  }

  markConnected(id: string): void {
    this.disconnected.delete(id);
  }

  isDisconnected(id: string): boolean {
    return this.disconnected.has(id);
  }

  getConnectedCount(): number {
    return Object.keys(this.players).filter(id => !this.disconnected.has(id)).length;
  }

  getPlayerCount(): number {
    return Object.keys(this.players).length;
  }

  private renumber(): void {
    Object.values(this.players).forEach((p, i) => { p.number = i + 1; });
  }

  private alivePlayers(): Player[] {
    return Object.values(this.players).filter(p => p.isAlive);
  }

  private votesNeeded(): number {
    return Math.floor(this.alivePlayers().length / 2) + 1;
  }

  // ── State ─────────────────────────────────────────────────────────────────

  getPublicState(): PublicGameState {
    return {
      roomCode: this.code,
      phase: this.phase,
      dayNumber: this.dayNumber,
      players: this.getPublicPlayers(),
      messages: [],
      winner: this.winner,
      phaseEndTime: this.phaseEndTime,
      hunterPlayerId: this.hunterPending,
      accusedPlayerId: this.accusedPlayerId,
      roleList: this.roleList,
      graveyard: this.graveyard,
      trialsLeft: this.trialsLeft,
      votesNeeded: this.votesNeeded(),
    };
  }

  getPersonalState(playerId: string): PersonalGameState {
    const p = this.players[playerId];
    return {
      ...this.getPublicState(),
      players: this.getPersonalPlayers(playerId),
      messages: this.messages.filter(m => this.canSee(m, playerId)),
      myPlayerId: playerId,
      myRole: p?.role ?? 'villager',
      myTeam: p?.team ?? 'village',
      seerResults: this.seerResults[playerId] ?? {},
    };
  }

  private canSee(m: Message, viewerId: string): boolean {
    if (m.recipientId) return m.recipientId === viewerId || m.senderId === viewerId;
    if (m.channel === 'vampire') return this.players[viewerId]?.role === 'vampire';
    return true;
  }

  private roleVisible(p: Player): boolean {
    return !p.isAlive || this.phase === 'game-over';
  }

  private getPublicPlayers(): Record<string, Player> {
    const result: Record<string, Player> = {};
    for (const [id, p] of Object.entries(this.players)) {
      const visible = this.roleVisible(p);
      result[id] = {
        ...p,
        role: visible ? p.role : undefined,
        team: visible ? p.team : undefined,
        nightActionDone: undefined,
      };
    }
    return result;
  }

  private getPersonalPlayers(viewerId: string): Record<string, Player> {
    const viewer = this.players[viewerId];
    const result: Record<string, Player> = {};
    for (const [id, p] of Object.entries(this.players)) {
      const isTeammate = viewer?.team === 'vampire' && p.team === 'vampire';
      const visible = id === viewerId || isTeammate || this.roleVisible(p);
      result[id] = {
        ...p,
        role: visible ? p.role : undefined,
        team: visible ? p.team : undefined,
        nightActionDone: undefined,
      };
    }
    return result;
  }

  // ── Oyun başlangıcı ───────────────────────────────────────────────────────

  startGame(hostId: string, partialSettings: Partial<GameSettings>): string | null {
    const hostPlayer = this.players[hostId];
    if (!hostPlayer?.isHost) return 'Sadece oda sahibi oyunu başlatabilir.';
    if (this.phase !== 'lobby') return 'Oyun zaten başladı.';
    const count = this.getPlayerCount();
    if (count < 4) return 'En az 4 oyuncu gerekli.';

    this.settings = { ...DEFAULT_SETTINGS, ...partialSettings };
    this.renumber();
    const ids = Object.keys(this.players);
    const roles = buildRoleList(count, this.settings);
    this.roleList = [...roles].sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));
    const shuffled = shuffle(roles);
    ids.forEach((id, idx) => {
      const p = this.players[id];
      p.role = shuffled[idx];
      p.team = shuffled[idx] === 'vampire' ? 'vampire' : 'village';
      p.isAlive = true;
      p.vote = undefined;
      this.seerResults[id] = {};
    });
    this.graveyard = [];
    this.wills = {};
    this.deathNotes = {};
    this.messages = [];
    this.dayNumber = 0;
    this.lastDoctorTarget = null;

    this.addSystemMessage('Oyun başladı! Roller dağıtıldı...', 'phase');
    this.startDiscussion();
    return null;
  }

  // ── Gündüz: tartışma → oylama → yargılama ─────────────────────────────────

  private startDiscussion(): void {
    this.phase = 'discussion';
    this.dayNumber++;
    this.trialsLeft = MAX_TRIALS_PER_DAY;
    this.accusedPlayerId = undefined;
    this.alivePlayers().forEach(p => { p.vote = undefined; });
    const ms = this.settings.discussionDuration * 1000;
    this.phaseEndTime = Date.now() + ms;
    this.addSystemMessage(
      this.dayNumber === 1
        ? `☀️ Gün 1 — Köylüler tanışıyor. İlk gün oylama yapılmaz.`
        : `☀️ Gün ${this.dayNumber} — Tartışma başladı.`,
      'phase',
    );
    this.broadcastPhase();
    this.schedulePhaseEnd(ms, () => {
      if (this.dayNumber === 1) this.startNight();
      else this.startVoting(this.settings.votingDuration * 1000);
    });
  }

  private startVoting(ms: number): void {
    this.phase = 'voting';
    this.accusedPlayerId = undefined;
    this.alivePlayers().forEach(p => { p.vote = undefined; });
    this.phaseEndTime = Date.now() + ms;
    this.addSystemMessage(
      `🗳️ Oylama: yargılama için ${this.votesNeeded()} oy gerekli. (${this.trialsLeft} yargılama hakkı kaldı)`,
      'phase',
    );
    this.broadcast('vote:update', {});
    this.broadcastPhase();
    this.schedulePhaseEnd(ms, () => {
      this.addSystemMessage('⌛ Oylama için çok geç — gece yaklaşıyor.', 'info');
      this.startNight();
    });
  }

  castVote(voterId: string, targetId: string): string | null {
    if (this.phase !== 'voting') return 'Şu an oylama zamanı değil.';
    const voter = this.players[voterId];
    if (!voter?.isAlive) return 'Ölü oyuncular oy kullanamaz.';
    if (targetId && !this.players[targetId]?.isAlive) return 'Ölü oyuncuya oy verilemez.';
    if (voterId === targetId) return 'Kendine oy veremezsin.';

    const prev = voter.vote;
    const next = !targetId || prev === targetId ? undefined : targetId;
    voter.vote = next;

    if (!next) {
      this.addSystemMessage(`${voter.name} oyunu geri çekti.`, 'vote');
    } else if (prev) {
      this.addSystemMessage(`${voter.name} oyunu ${this.players[next].name} aleyhine değiştirdi.`, 'vote');
    } else {
      this.addSystemMessage(`${voter.name}, ${this.players[next].name} aleyhine oy verdi.`, 'vote');
    }
    this.broadcast('vote:update', this.currentVotes());

    if (next) {
      const count = this.alivePlayers().filter(p => p.vote === next).length;
      if (count >= this.votesNeeded()) {
        this.votingRemainingMs = Math.max(0, this.phaseEndTime - Date.now());
        this.startTrial(next);
      }
    }
    return null;
  }

  private currentVotes(): Record<string, string | undefined> {
    const votes: Record<string, string | undefined> = {};
    this.alivePlayers().forEach(p => { if (p.vote) votes[p.id] = p.vote; });
    return votes;
  }

  private startTrial(accusedId: string): void {
    this.trialsLeft--;
    this.accusedPlayerId = accusedId;
    this.verdictVotes = {};
    this.phase = 'trial';
    const ms = this.settings.trialDuration * 1000;
    this.phaseEndTime = Date.now() + ms;
    this.addSystemMessage(`⚖️ Köy, ${this.players[accusedId]?.name} adlı oyuncuyu yargılamaya karar verdi.`, 'phase');
    this.broadcastPhase();
    this.schedulePhaseEnd(ms, () => this.startVerdict());
  }

  private startVerdict(): void {
    this.phase = 'verdict';
    this.verdictVotes = {};
    const ms = this.settings.verdictDuration * 1000;
    this.phaseEndTime = Date.now() + ms;
    this.addSystemMessage(`🗳️ Köy, ${this.players[this.accusedPlayerId!]?.name} adlı oyuncunun kaderini oyluyor.`, 'phase');
    this.broadcast('verdict:update', []);
    this.broadcastPhase();
    this.schedulePhaseEnd(ms, () => this.resolveVerdict());
  }

  castVerdictVote(voterId: string, vote: VerdictChoice): string | null {
    if (this.phase !== 'verdict') return 'Şu an karar zamanı değil.';
    if (!this.players[voterId]?.isAlive) return 'Ölü oyuncular oy kullanamaz.';
    if (voterId === this.accusedPlayerId) return 'Sanık kendi kaderini oylayamaz.';

    if (vote === 'abstain') delete this.verdictVotes[voterId];
    else this.verdictVotes[voterId] = vote;
    this.broadcast('verdict:update', Object.keys(this.verdictVotes));
    return null;
  }

  private resolveVerdict(): void {
    if (this.phase !== 'verdict') return;
    const accusedId = this.accusedPlayerId!;
    const accused = this.players[accusedId];

    // Herkesin oyunu tek tek açıkla (ToS'taki gibi)
    let guilty = 0;
    let innocent = 0;
    for (const p of this.alivePlayers()) {
      if (p.id === accusedId) continue;
      const v = this.verdictVotes[p.id];
      if (v === 'guilty') guilty++;
      if (v === 'innocent') innocent++;
      const text = v === 'guilty' ? 'SUÇLU' : v === 'innocent' ? 'SUÇSUZ' : 'çekimser';
      this.addSystemMessage(`${p.name}: ${text}`, 'verdict');
    }
    this.verdictVotes = {};

    if (accused && guilty > innocent) {
      this.addSystemMessage(`⚖️ Köy, ${accused.name} adlı oyuncuyu ${guilty}'e karşı ${innocent} oyla asmaya karar verdi.`, 'bad');
      this.startLastWords();
      return;
    }

    this.addSystemMessage(`⚖️ ${accused?.name ?? 'Sanık'} ${innocent}'e karşı ${guilty} oyla serbest bırakıldı.`, 'good');
    this.accusedPlayerId = undefined;
    if (this.trialsLeft > 0 && this.votingRemainingMs > 3000) {
      this.startVoting(this.votingRemainingMs);
    } else {
      this.addSystemMessage('⌛ Bugün için yargılama hakkı kalmadı — gece yaklaşıyor.', 'info');
      this.startNight();
    }
  }

  private startLastWords(): void {
    this.phase = 'last-words';
    this.phaseEndTime = Date.now() + LAST_WORDS_MS;
    this.broadcastPhase();
    this.schedulePhaseEnd(LAST_WORDS_MS, () => this.startExecution());
  }

  private startExecution(): void {
    const accusedId = this.accusedPlayerId!;
    const reveal = this.killPlayer(accusedId, 'voted');
    this.phase = 'execution';
    const ms = reveal ? revealDurationMs(reveal) + 800 : 1000;
    this.phaseEndTime = Date.now() + ms;
    this.pendingReveals = reveal ? [reveal] : [];
    this.broadcastPhase();
    if (reveal) this.broadcast('game:reveal', [reveal]);
    this.schedulePhaseEnd(ms, () => {
      this.accusedPlayerId = undefined;
      this.afterDeaths('night');
    });
  }

  // ── Gece ──────────────────────────────────────────────────────────────────

  private startNight(): void {
    this.phase = 'night';
    this.accusedPlayerId = undefined;
    this.nightActions = {};
    this.alivePlayers().forEach(p => { p.nightActionDone = false; p.vote = undefined; });
    const ms = this.settings.nightDuration * 1000;
    this.phaseEndTime = Date.now() + ms;
    this.addSystemMessage(`🌙 Gece ${this.dayNumber} — Köylüler uyuyor, vampirler uyanıyor...`, 'phase');
    this.broadcastPhase();
    this.schedulePhaseEnd(ms, () => this.resolveNight());
  }

  submitNightAction(playerId: string, targetId: string): string | null {
    if (this.phase !== 'night') return 'Şu an gece yeteneği zamanı değil.';
    const player = this.players[playerId];
    const target = this.players[targetId];
    if (!player?.isAlive) return 'Ölü oyuncular yetenek kullanamaz.';
    if (!target?.isAlive) return 'Hedef oyuncu hayatta değil.';
    if (player.role === 'villager' || player.role === 'hunter') return 'Senin gece yeteneğin yok.';
    if (player.role === 'vampire' && target.role === 'vampire') return 'Takım arkadaşını hedef alamazsın.';
    if (player.role === 'seer' && targetId === playerId) return 'Kendini sorgulayamazsın.';
    if (player.role === 'doctor' && targetId === this.lastDoctorTarget) {
      return 'Aynı kişiyi arka arkaya koruyamazsın.';
    }

    this.nightActions[playerId] = targetId;
    player.nightActionDone = true;

    if (player.role === 'vampire') {
      const msg = this.createMessage('system', 'Sistem', `🩸 ${player.name} kurban olarak ${target.name} adlı oyuncuyu seçti.`, 'vampire', 'info');
      this.messages.push(msg);
      Object.values(this.players)
        .filter(p => p.role === 'vampire')
        .forEach(p => this.sendTo(p.id, 'chat:message', msg));
    }
    return null;
  }

  private resolveNight(): void {
    if (this.phase !== 'night') return;

    const vampireTarget = this.pickVampireTarget();
    const doctor = this.alivePlayers().find(p => p.role === 'doctor');
    const protectedId = doctor ? this.nightActions[doctor.id] : undefined;
    this.lastDoctorTarget = protectedId ?? null;

    const seer = this.alivePlayers().find(p => p.role === 'seer');
    const seerTargetId = seer ? this.nightActions[seer.id] : undefined;
    if (seer && seerTargetId) {
      const t = this.players[seerTargetId];
      if (t) {
        this.seerResults[seer.id] = { ...this.seerResults[seer.id], [seerTargetId]: t.team! };
        this.sendTo(seer.id, 'seer:result', seerTargetId, t.team!);
        this.addPrivateMessage(seer.id,
          t.team === 'vampire'
            ? `🔮 Kehanetin: ${t.name} bir VAMPİR!`
            : `🔮 Kehanetin: ${t.name} masum bir köylü.`,
          t.team === 'vampire' ? 'bad' : 'good');
      }
    }

    // Yeteneğini kullanmayanlara hatırlatma
    for (const p of this.alivePlayers()) {
      if ((p.role === 'vampire' || p.role === 'doctor' || p.role === 'seer') && !this.nightActions[p.id]) {
        this.addPrivateMessage(p.id, 'Bu gece yeteneğini kullanmadın.', 'info');
      }
    }

    const reveals: DeathReveal[] = [];
    if (vampireTarget) {
      if (vampireTarget === protectedId) {
        this.addPrivateMessage(vampireTarget, '🩸 Bir vampir sana saldırdı ama biri seni kurtardı!', 'good');
        if (doctor) this.addPrivateMessage(doctor.id, '🩺 Koruduğun kişi saldırıya uğradı — onu kurtardın!', 'good');
      } else {
        this.addPrivateMessage(vampireTarget, '🩸 Bir vampir tarafından saldırıya uğradın. Öldün!', 'bad');
        const r = this.killPlayer(vampireTarget, 'killed');
        if (r) reveals.push(r);
      }
    }

    this.startMorning(reveals);
  }

  private pickVampireTarget(): string | undefined {
    const vampires = this.alivePlayers().filter(p => p.role === 'vampire');
    const targets = vampires.map(v => this.nightActions[v.id]).filter((t): t is string => !!t && !!this.players[t]?.isAlive);
    if (targets.length === 0) return undefined;
    const tally: Record<string, number> = {};
    targets.forEach(t => { tally[t] = (tally[t] ?? 0) + 1; });
    const max = Math.max(...Object.values(tally));
    const top = Object.keys(tally).filter(t => tally[t] === max);
    return top[Math.floor(Math.random() * top.length)];
  }

  private startMorning(reveals: DeathReveal[]): void {
    this.phase = 'morning';
    const ms = reveals.length === 0
      ? 3500
      : 1200 + reveals.reduce((sum, r) => sum + revealDurationMs(r), 0);
    this.phaseEndTime = Date.now() + ms;
    this.pendingReveals = reveals;
    if (reveals.length === 0) {
      this.addSystemMessage('🌅 Gece sakin geçti, kimse ölmedi.', 'good');
    } else {
      reveals.forEach(r => this.addSystemMessage(`🩸 ${r.playerName} dün gece öldü.`, 'death'));
    }
    this.broadcastPhase();
    if (reveals.length > 0) this.broadcast('game:reveal', reveals);
    this.schedulePhaseEnd(ms, () => this.afterDeaths('discussion'));
  }

  // ── Ölüm & avcı ───────────────────────────────────────────────────────────

  private killPlayer(playerId: string, cause: DeathCause): DeathReveal | undefined {
    const player = this.players[playerId];
    if (!player || !player.isAlive) return undefined;
    player.isAlive = false;
    player.vote = undefined;
    this.graveyard.push({ playerId, day: this.dayNumber, cause });

    let deathNote = '';
    if (cause === 'killed') {
      const killers = Object.values(this.players)
        .filter(p => p.role === 'vampire' && this.nightActions[p.id] === playerId);
      deathNote = killers.map(k => this.deathNotes[k.id] ?? '').find(n => n.trim()) ?? '';
    }

    if (player.role === 'hunter' && cause !== 'hunter') {
      this.hunterPending = playerId;
    }

    return {
      playerId,
      playerName: player.name,
      playerNumber: player.number,
      role: player.role!,
      cause,
      will: this.wills[playerId] ?? '',
      deathNote,
    };
  }

  /** Ölüm açıklamaları bittikten sonra: avcı intikamı → kazanma kontrolü → sonraki faz */
  private afterDeaths(next: 'night' | 'discussion'): void {
    this.pendingReveals.forEach(r => {
      this.addSystemMessage(`📜 ${r.playerName} bir ${ROLE_INFO[r.role].label} idi.`, 'death');
    });
    this.pendingReveals = [];

    if (this.hunterPending && this.players[this.hunterPending]) {
      this.startHunterRevenge(next);
      return;
    }
    this.hunterPending = undefined;
    if (this.checkWin()) return;
    if (next === 'night') this.startNight();
    else this.startDiscussion();
  }

  private startHunterRevenge(next: 'night' | 'discussion'): void {
    this.phase = 'hunter-revenge';
    this.hunterNext = next;
    this.phaseEndTime = Date.now() + HUNTER_REVENGE_MS;
    const hunter = this.players[this.hunterPending!];
    this.addSystemMessage(`🏹 Avcı ${hunter?.name} son nefesinde yayını geriyor...`, 'phase');
    this.broadcast('game:hunter-triggered', this.hunterPending);
    this.broadcastPhase();
    this.schedulePhaseEnd(HUNTER_REVENGE_MS, () => {
      this.addSystemMessage('🏹 Avcı ok atamadan can verdi.', 'info');
      this.hunterPending = undefined;
      this.afterDeaths(this.hunterNext);
    });
  }

  hunterShot(hunterId: string, targetId: string): string | null {
    if (this.phase !== 'hunter-revenge') return 'Şu an avcı intikamı zamanı değil.';
    if (this.hunterPending !== hunterId) return 'Sen avcı değilsin.';
    if (!this.players[targetId]?.isAlive) return 'Hedef zaten ölü.';

    this.clearPhaseTimer();
    this.hunterPending = undefined;
    const reveal = this.killPlayer(targetId, 'hunter');
    if (!reveal) return null;
    const ms = revealDurationMs(reveal) + 800;
    this.phaseEndTime = Date.now() + ms;
    this.pendingReveals = [reveal];
    this.addSystemMessage(`🏹 Avcı, ${reveal.playerName} adlı oyuncuyu vurdu!`, 'death');
    this.broadcast('game:reveal', [reveal]);
    this.broadcast('game:state', this.getPublicState());
    this.schedulePhaseEnd(ms, () => this.afterDeaths(this.hunterNext));
    return null;
  }

  private checkWin(): boolean {
    const alive = this.alivePlayers();
    const vampires = alive.filter(p => p.team === 'vampire');
    const villagers = alive.filter(p => p.team === 'village');

    if (vampires.length === 0) {
      this.endGame('village', 'Tüm vampirler yok edildi! Köy kurtuldu!');
      return true;
    }
    if (vampires.length >= villagers.length) {
      this.endGame('vampire', 'Vampirler köyü ele geçirdi!');
      return true;
    }
    return false;
  }

  private endGame(winner: TeamType, reason: string): void {
    this.phase = 'game-over';
    this.winner = winner;
    this.accusedPlayerId = undefined;
    this.clearPhaseTimer();
    this.phaseEndTime = Date.now() + 16000;
    this.addSystemMessage(`🎮 Oyun bitti! ${reason}`, 'phase');
    this.broadcast('game:over', winner, reason);
    this.broadcast('game:state', this.getPublicState());
    this.schedulePhaseEnd(16000, () => this.resetToLobby());
  }

  resetToLobby(): void {
    this.clearPhaseTimer();
    this.phase = 'lobby';
    this.dayNumber = 0;
    this.winner = undefined;
    this.hunterPending = undefined;
    this.accusedPlayerId = undefined;
    this.verdictVotes = {};
    this.nightActions = {};
    this.seerResults = {};
    this.lastDoctorTarget = null;
    this.phaseEndTime = 0;
    this.messages = [];
    this.roleList = [];
    this.graveyard = [];
    this.wills = {};
    this.deathNotes = {};
    this.pendingReveals = [];
    this.trialsLeft = MAX_TRIALS_PER_DAY;

    // Oyun sırasında bağlantısı kopup geri dönmeyenleri odadan çıkar
    this.disconnected.forEach(id => { delete this.players[id]; });
    this.disconnected.clear();

    Object.values(this.players).forEach(p => {
      p.isAlive = true;
      p.role = undefined;
      p.team = undefined;
      p.vote = undefined;
      p.nightActionDone = false;
    });
    this.renumber();

    const remaining = Object.values(this.players);
    if (remaining.length > 0 && !remaining.some(p => p.isHost)) {
      remaining[0].isHost = true;
    }
    console.log(`[resetToLobby] ${remaining.length} oyuncu, host=${remaining.find(p => p.isHost)?.name ?? 'YOK'}`);

    this.messages.push(this.createMessage('system', 'Sistem', '🔄 Yeni oyun hazır! Oda sahibi ayarları yapıp başlatabilir.', 'system', 'info'));

    Object.keys(this.players).forEach(pid => {
      this.sendTo(pid, 'room:joined', this.getPersonalState(pid), this.settings);
    });
  }

  // ── Sohbet ────────────────────────────────────────────────────────────────

  sendMessage(playerId: string, content: string, channel: ChatChannel): string | null {
    const player = this.players[playerId];
    if (!player) return 'Oyuncu bulunamadı.';
    const isAccused = playerId === this.accusedPlayerId;

    if (channel === 'vampire') {
      if (player.role !== 'vampire' || !player.isAlive) return 'Vampir kanalına erişimin yok.';
      if (this.phase !== 'night') return 'Vampirler sadece gece gizlice konuşabilir.';
    } else if (channel === 'public') {
      if (this.phase === 'game-over' || this.phase === 'lobby') {
        // Herkes konuşabilir
      } else if (!player.isAlive) {
        return 'Ölüler konuşamaz.';
      } else if (this.phase === 'trial' || this.phase === 'last-words') {
        if (!isAccused) return 'Şu an sadece sanık konuşabilir.';
      } else if (!['discussion', 'voting', 'verdict', 'hunter-revenge'].includes(this.phase)) {
        return 'Şu an konuşamazsın.';
      }
    } else {
      return 'Geçersiz kanal.';
    }

    const msg = this.createMessage(playerId, player.name, content, channel);
    this.messages.push(msg);

    if (channel === 'vampire') {
      Object.values(this.players)
        .filter(p => p.role === 'vampire')
        .forEach(p => this.sendTo(p.id, 'chat:message', msg));
    } else {
      this.broadcast('chat:message', msg);
    }
    return null;
  }

  whisper(senderId: string, targetId: string, content: string): string | null {
    const sender = this.players[senderId];
    const target = this.players[targetId];
    if (!sender || !target) return 'Oyuncu bulunamadı.';
    if (!['discussion', 'voting', 'verdict'].includes(this.phase)) return 'Şu an fısıldayamazsın.';
    if (!sender.isAlive) return 'Ölüler fısıldayamaz.';
    if (!target.isAlive) return 'Ölülere fısıldanmaz.';
    if (senderId === targetId) return 'Kendine fısıldayamazsın.';

    const msg = this.createMessage(senderId, sender.name, content, 'whisper');
    msg.recipientId = targetId;
    this.messages.push(msg);
    this.sendTo(senderId, 'chat:message', msg);
    this.sendTo(targetId, 'chat:message', msg);
    this.addSystemMessage(`🤫 ${sender.name}, ${target.name} adlı oyuncuya fısıldıyor.`, 'whisper-notice');
    return null;
  }

  // ── Vasiyet & ölüm notu ───────────────────────────────────────────────────

  updateNotes(playerId: string, notes: string): void {
    if (this.players[playerId]?.isAlive) this.wills[playerId] = notes;
  }

  /** Vasiyet sadece sahibi öldükten sonra okunabilir */
  getNotes(playerId: string): string {
    const p = this.players[playerId];
    if (!p || (p.isAlive && this.phase !== 'game-over')) return '';
    return this.wills[playerId] ?? '';
  }

  updateDeathNote(playerId: string, note: string): void {
    const p = this.players[playerId];
    if (p?.role === 'vampire' && p.isAlive) this.deathNotes[playerId] = note;
  }

  updateSettings(hostId: string, settings: Partial<GameSettings>): void {
    if (this.players[hostId]?.isHost && this.phase === 'lobby') {
      this.settings = { ...this.settings, ...settings };
    }
  }

  getSettings(): GameSettings {
    return this.settings;
  }

  // ── Yardımcılar ───────────────────────────────────────────────────────────

  private createMessage(senderId: string, senderName: string, content: string, channel: ChatChannel, kind?: MessageKind): Message {
    return { id: uuidv4(), senderId, senderName, content, channel, timestamp: Date.now(), kind };
  }

  private addSystemMessage(content: string, kind: MessageKind = 'info'): void {
    const msg = this.createMessage('system', 'Sistem', content, 'system', kind);
    this.messages.push(msg);
    this.broadcast('chat:message', msg);
  }

  private addPrivateMessage(playerId: string, content: string, kind: MessageKind): void {
    const msg = this.createMessage('system', 'Sistem', content, 'system', kind);
    msg.recipientId = playerId;
    this.messages.push(msg);
    this.sendTo(playerId, 'chat:message', msg);
  }

  private broadcastPhase(): void {
    this.broadcast('game:phase', this.phase, this.dayNumber, this.phaseEndTime, this.accusedPlayerId);
    this.broadcast('game:state', this.getPublicState());
  }

  private schedulePhaseEnd(ms: number, fn: () => void): void {
    this.clearPhaseTimer();
    this.phaseTimer = setTimeout(fn, ms);
  }

  private clearPhaseTimer(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  /** Oda silinirken bekleyen zamanlayıcıları temizle */
  dispose(): void {
    this.clearPhaseTimer();
  }

  private broadcast(event: string, ...args: unknown[]): void {
    this.onBroadcast?.(event, args);
  }

  private sendTo(playerId: string, event: string, ...args: unknown[]): void {
    this.onSendTo?.(playerId, event, args);
  }
}
