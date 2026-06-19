import { v4 as uuidv4 } from 'uuid';
import {
  Player, RoleType, TeamType, PhaseType, Message, ChatChannel,
  GameSettings, PublicGameState, PersonalGameState,
} from '@vampir-koylu/shared';

const DEFAULT_SETTINGS: GameSettings = {
  minPlayers: 4,
  vampireCount: 1,
  includeDoctor: true,
  includeSeer: true,
  includeHunter: false,
  dayDuration: 120,
  nightDuration: 60,
  trialDuration: 45,
  verdictDuration: 30,
};

function assignRoles(playerIds: string[], settings: GameSettings): Record<string, RoleType> {
  const roles: RoleType[] = [];
  const count = playerIds.length;

  const vampCount = count >= 8 ? 2 : count >= 12 ? 3 : settings.vampireCount;
  for (let i = 0; i < vampCount; i++) roles.push('vampire');
  if (settings.includeSeer) roles.push('seer');
  if (settings.includeDoctor) roles.push('doctor');
  if (settings.includeHunter) roles.push('hunter');
  while (roles.length < count) roles.push('villager');

  // Fisher-Yates shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  const map: Record<string, RoleType> = {};
  playerIds.forEach((id, idx) => { map[id] = roles[idx]; });
  return map;
}

export class Room {
  readonly code: string;
  private players: Record<string, Player> = {};
  private messages: Message[] = [];
  private phase: PhaseType = 'lobby';
  private dayNumber = 0;
  private settings: GameSettings = { ...DEFAULT_SETTINGS };
  private notes: Record<string, string> = {};
  private lastDoctorTarget: string | null = null;
  private nightActions: Record<string, string> = {};
  private seerResults: Record<string, Record<string, TeamType>> = {};
  private phaseEndTime = 0;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private winner?: TeamType;
  private eliminatedPlayerId?: string;
  private hunterPending?: string;
  private accusedPlayerId?: string;
  private verdictVotes: Record<string, 'guilty' | 'innocent'> = {};

  onBroadcast?: (event: string, data: unknown) => void;
  onSendTo?: (playerId: string, event: string, data: unknown) => void;
  onPhaseEnd?: () => void;

  constructor(code: string) {
    this.code = code;
  }

  addPlayer(id: string, name: string, isHost: boolean): Player {
    const player: Player = { id, name, isAlive: true, isHost };
    this.players[id] = player;
    return player;
  }

  findPlayerByName(name: string): Player | undefined {
    return Object.values(this.players).find(p => p.name.toLowerCase() === name.toLowerCase());
  }

  getPhase(): PhaseType {
    return this.phase;
  }

  removePlayer(id: string): void {
    delete this.players[id];
    if (this.phase === 'lobby') {
      const remaining = Object.values(this.players);
      if (remaining.length > 0 && !remaining.some(p => p.isHost)) {
        remaining[0].isHost = true;
      }
    }
  }

  getPlayerCount(): number {
    return Object.keys(this.players).length;
  }

  getPublicState(): PublicGameState {
    return {
      roomCode: this.code,
      phase: this.phase,
      dayNumber: this.dayNumber,
      players: this.getPublicPlayers(),
      messages: this.messages,
      winner: this.winner,
      phaseEndTime: this.phaseEndTime,
      eliminatedPlayerId: this.eliminatedPlayerId,
      hunterPlayerId: this.hunterPending,
      accusedPlayerId: this.accusedPlayerId,
    };
  }

  getPersonalState(playerId: string): PersonalGameState {
    const p = this.players[playerId];
    return {
      ...this.getPublicState(),
      players: this.getPersonalPlayers(playerId),
      myPlayerId: playerId,
      myRole: p?.role ?? 'villager',
      myTeam: p?.team ?? 'village',
      seerResults: this.seerResults[playerId] ?? {},
    };
  }

  private getPublicPlayers(): Record<string, Player> {
    const result: Record<string, Player> = {};
    for (const [id, p] of Object.entries(this.players)) {
      result[id] = {
        ...p,
        role: p.isAlive ? undefined : p.role,
        notes: undefined,
      };
    }
    return result;
  }

  private getPersonalPlayers(viewerId: string): Record<string, Player> {
    const viewer = this.players[viewerId];
    const result: Record<string, Player> = {};
    for (const [id, p] of Object.entries(this.players)) {
      const isTeammate = viewer?.team === 'vampire' && p.team === 'vampire';
      result[id] = {
        ...p,
        role: (id === viewerId || !p.isAlive || isTeammate) ? p.role : undefined,
        notes: undefined,
      };
    }
    return result;
  }

  startGame(hostId: string, partialSettings: Partial<GameSettings>): string | null {
    if (!this.players[hostId]?.isHost) return 'Sadece oda sahibi oyunu başlatabilir.';
    if (this.phase !== 'lobby') return 'Oyun zaten başladı.';
    const count = this.getPlayerCount();
    if (count < 4) return 'En az 4 oyuncu gerekli.';

    this.settings = { ...DEFAULT_SETTINGS, ...partialSettings };
    const ids = Object.keys(this.players);
    const roleMap = assignRoles(ids, this.settings);
    ids.forEach(id => {
      this.players[id].role = roleMap[id];
      this.players[id].team = roleMap[id] === 'vampire' ? 'vampire' : 'village';
      this.players[id].isAlive = true;
      this.players[id].vote = undefined;
      this.players[id].nightActionDone = false;
      this.seerResults[id] = {};
    });

    this.addSystemMessage('Oyun başladı! Roller dağıtıldı...');
    this.startDay();
    return null;
  }

  private startDay(): void {
    this.phase = 'day';
    this.dayNumber++;
    this.eliminatedPlayerId = undefined;
    this.accusedPlayerId = undefined;
    const alivePlayers = Object.values(this.players).filter(p => p.isAlive);
    alivePlayers.forEach(p => { p.vote = undefined; });
    this.phaseEndTime = Date.now() + this.settings.dayDuration * 1000;
    this.addSystemMessage(`☀️ Gündüz ${this.dayNumber} — Köy meydanında toplanın ve vampirleri bulun!`);
    this.broadcast('game:phase', this.phase, this.dayNumber, this.phaseEndTime);
    this.schedulePhaseEnd(this.settings.dayDuration * 1000, () => this.resolveVote());
  }

  private startNight(): void {
    this.phase = 'night';
    this.nightActions = {};
    const alivePlayers = Object.values(this.players).filter(p => p.isAlive);
    alivePlayers.forEach(p => { p.nightActionDone = false; });
    this.phaseEndTime = Date.now() + this.settings.nightDuration * 1000;
    this.addSystemMessage('🌙 Gece çöktü — Köylüler uyuyor, vampirler uyanıyor...');
    this.broadcast('game:phase', this.phase, this.dayNumber, this.phaseEndTime);
    this.schedulePhaseEnd(this.settings.nightDuration * 1000, () => this.resolveNight());
  }

  castVote(voterId: string, targetId: string): string | null {
    if (this.phase !== 'day') return 'Şu an oylama zamanı değil.';
    if (!this.players[voterId]?.isAlive) return 'Ölü oyuncular oy kullanamaz.';
    if (!this.players[targetId]?.isAlive) return 'Ölü oyuncuya oy verilemez.';
    if (voterId === targetId) return 'Kendine oy veremezsin.';

    this.players[voterId].vote = targetId;
    const votes: Record<string, string | undefined> = {};
    Object.values(this.players).forEach(p => { votes[p.id] = p.vote; });
    this.broadcast('vote:update', votes);

    const alive = Object.values(this.players).filter(p => p.isAlive);
    const voted = alive.filter(p => p.vote).length;
    console.log(`[castVote] ${voted}/${alive.length} oy kullandı — timer devam ediyor`);
    return null;
  }

  private resolveVote(): void {
    if (this.phase !== 'day') return;
    const tally: Record<string, number> = {};
    Object.values(this.players)
      .filter(p => p.isAlive && p.vote)
      .forEach(p => {
        const t = p.vote!;
        tally[t] = (tally[t] ?? 0) + 1;
      });

    console.log(`[vote] tally:`, JSON.stringify(tally));
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0 || (sorted.length > 1 && sorted[0][1] === sorted[1][1])) {
      console.log(`[vote] beraberlik veya oy yok → gece başlıyor`);
      this.addSystemMessage('🤝 Oylar eşit — kimse yargılanmıyor, gece başlıyor.');
      this.startNight();
      return;
    }

    console.log(`[vote] kazanan: ${sorted[0][0]} (${sorted[0][1]} oy) → trial`);
    this.startTrial(sorted[0][0]);
  }

  private startTrial(accusedId: string): void {
    this.accusedPlayerId = accusedId;
    this.verdictVotes = {};
    this.phase = 'trial';
    this.phaseEndTime = Date.now() + this.settings.trialDuration * 1000;
    const accused = this.players[accusedId];
    console.log(`[trial] ${accused?.name ?? accusedId} yargılanıyor (${this.settings.trialDuration}s)`);
    this.addSystemMessage(`⚖️ ${accused?.name} meydana çıktı — savunma süresi başladı!`);
    this.broadcast('game:phase', 'trial', this.dayNumber, this.phaseEndTime, accusedId);
    this.schedulePhaseEnd(this.settings.trialDuration * 1000, () => this.startVerdict());
  }

  private startVerdict(): void {
    this.phase = 'verdict';
    this.verdictVotes = {};
    this.phaseEndTime = Date.now() + this.settings.verdictDuration * 1000;
    const accused = this.players[this.accusedPlayerId!];
    console.log(`[verdict] ${accused?.name ?? this.accusedPlayerId} için karar oylaması (${this.settings.verdictDuration}s)`);
    this.addSystemMessage(`🗳️ ${accused?.name} suçlu mu? Oyunuzu kullanın!`);
    this.broadcast('game:phase', 'verdict', this.dayNumber, this.phaseEndTime, this.accusedPlayerId);
    this.schedulePhaseEnd(this.settings.verdictDuration * 1000, () => this.resolveVerdict());
  }

  castVerdictVote(voterId: string, vote: 'guilty' | 'innocent'): string | null {
    if (this.phase !== 'verdict') return 'Şu an karar zamanı değil.';
    const voter = this.players[voterId];
    if (!voter?.isAlive) return 'Ölü oyuncular oy kullanamaz.';

    this.verdictVotes[voterId] = vote;
    this.broadcast('verdict:update', { ...this.verdictVotes });
    return null;
  }

  private resolveVerdict(): void {
    if (this.phase !== 'verdict') return;

    const guiltyCount = Object.values(this.verdictVotes).filter(v => v === 'guilty').length;
    const innocentCount = Object.values(this.verdictVotes).filter(v => v === 'innocent').length;
    console.log(`[verdict] suçlu:${guiltyCount} suçsuz:${innocentCount}`);
    const accusedId = this.accusedPlayerId!;
    const accusedName = this.players[accusedId]?.name ?? '?';
    this.accusedPlayerId = undefined;
    this.verdictVotes = {};

    if (guiltyCount > innocentCount) {
      this.addSystemMessage(`⚖️ ${accusedName} suçlu bulundu ve idam edildi! (${guiltyCount}e karşı ${innocentCount})`);
      this.eliminatePlayer(accusedId, 'voted');
      if (!this.hunterPending) {
        this.checkWin() || this.startNight();
      }
    } else {
      this.addSystemMessage(`⚖️ ${accusedName} suçsuz bulundu ve serbest bırakıldı. (${innocentCount}e karşı ${guiltyCount})`);
      this.startNight();
    }
  }

  submitNightAction(playerId: string, targetId: string): string | null {
    if (this.phase !== 'night') return 'Şu an gece yeteneği zamanı değil.';
    const player = this.players[playerId];
    if (!player?.isAlive) return 'Ölü oyuncular yetenek kullanamaz.';
    if (!this.players[targetId]?.isAlive) return 'Hedef oyuncu hayatta değil.';
    if (player.role === 'villager') return 'Köylünün gece yeteneği yok.';

    if (player.role === 'doctor' && targetId === this.lastDoctorTarget) {
      return 'Aynı kişiyi arka arkaya koruyamazsın.';
    }

    this.nightActions[playerId] = targetId;
    this.players[playerId].nightActionDone = true;
    this.broadcast('game:state', this.getPublicState());
    return null;
  }

  private resolveNight(): void {
    if (this.phase !== 'night') return;

    const vampireKillTarget = this.pickVampireTarget();
    const doctorProtectTarget = this.nightActions[
      Object.keys(this.players).find(id => this.players[id].role === 'doctor' && this.players[id].isAlive) ?? ''
    ];
    const seerTarget = (() => {
      const seerId = Object.keys(this.players).find(id => this.players[id].role === 'seer' && this.players[id].isAlive);
      return seerId ? { seerId, targetId: this.nightActions[seerId] } : null;
    })();

    if (doctorProtectTarget) this.lastDoctorTarget = doctorProtectTarget;

    if (seerTarget?.targetId) {
      const target = this.players[seerTarget.targetId];
      if (target && !this.seerResults[seerTarget.seerId]) this.seerResults[seerTarget.seerId] = {};
      if (target) {
        this.seerResults[seerTarget.seerId][seerTarget.targetId] = target.team!;
        this.sendTo(seerTarget.seerId, 'seer:result', seerTarget.targetId, target.team!);
      }
    }

    const killed: string[] = [];
    const survived: string[] = [];

    if (vampireKillTarget) {
      if (vampireKillTarget === doctorProtectTarget) {
        survived.push(vampireKillTarget);
        this.addSystemMessage(`🩸 Bu gece vampirler bir kurban seçti ama doktor onu kurtardı!`);
      } else {
        killed.push(vampireKillTarget);
        this.eliminatePlayer(vampireKillTarget, 'killed');
      }
    } else {
      this.addSystemMessage('🌅 Gece sakin geçti, kimse ölmedi.');
    }

    this.broadcast('game:night-result', survived, killed);

    if (!this.checkWin()) {
      if (!this.hunterPending) {
        this.startDay();
      }
    }
  }

  private pickVampireTarget(): string | undefined {
    const vampires = Object.values(this.players).filter(p => p.isAlive && p.role === 'vampire');
    const targets = vampires.map(v => this.nightActions[v.id]).filter(Boolean);
    if (targets.length === 0) return undefined;
    const tally: Record<string, number> = {};
    targets.forEach(t => { tally[t] = (tally[t] ?? 0) + 1; });
    return Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
  }

  private eliminatePlayer(playerId: string, reason: 'voted' | 'killed' | 'hunter'): void {
    const player = this.players[playerId];
    if (!player) return;
    player.isAlive = false;
    player.vote = undefined;
    this.eliminatedPlayerId = playerId;
    const msg = reason === 'voted'
      ? `🗳️ ${player.name} oylamayla idam edildi. Rolü: ${player.role}`
      : reason === 'killed'
        ? `🩸 ${player.name} bu gece vampirlerin kurbanı oldu. Rolü: ${player.role}`
        : `🏹 ${player.name} avcı tarafından vuruldu. Rolü: ${player.role}`;
    this.addSystemMessage(msg);
    this.broadcast('game:eliminated', playerId, player.role!, reason);

    if (player.role === 'hunter' && reason !== 'hunter') {
      this.hunterPending = playerId;
      this.phase = 'hunter-revenge';
      this.phaseEndTime = Date.now() + 30000;
      this.broadcast('game:hunter-triggered', playerId);
      this.broadcast('game:phase', this.phase, this.dayNumber, this.phaseEndTime);
      this.schedulePhaseEnd(30000, () => {
        this.hunterPending = undefined;
        if (!this.checkWin()) {
          if (reason === 'voted') this.startNight();
          else this.startDay();
        }
      });
    }
  }

  hunterShot(hunterId: string, targetId: string): string | null {
    if (this.phase !== 'hunter-revenge') return 'Şu an avcı intikamı zamanı değil.';
    if (this.hunterPending !== hunterId) return 'Sen avcı değilsin.';
    if (!this.players[targetId]?.isAlive) return 'Hedef zaten ölü.';

    this.clearPhaseTimer();
    const wasVotedOut = this.eliminatedPlayerId === hunterId;
    this.eliminatePlayer(targetId, 'hunter');
    this.hunterPending = undefined;

    if (!this.checkWin()) {
      if (wasVotedOut) this.startNight();
      else this.startDay();
    }
    return null;
  }

  private checkWin(): boolean {
    const alive = Object.values(this.players).filter(p => p.isAlive);
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
    this.clearPhaseTimer();
    Object.values(this.players).forEach(p => {
      this.broadcast('game:eliminated', p.id, p.role!, 'voted');
    });
    this.addSystemMessage(`🎮 Oyun bitti! ${reason}`);
    this.broadcast('game:over', winner, reason);
    this.broadcast('game:state', this.getPublicState());
    this.schedulePhaseEnd(11000, () => this.resetToLobby());
  }

  resetToLobby(): void {
    this.clearPhaseTimer();
    this.phase = 'lobby';
    this.dayNumber = 0;
    this.winner = undefined;
    this.eliminatedPlayerId = undefined;
    this.hunterPending = undefined;
    this.accusedPlayerId = undefined;
    this.verdictVotes = {};
    this.nightActions = {};
    this.seerResults = {};
    this.lastDoctorTarget = null;
    this.phaseEndTime = 0;
    this.messages = [];

    Object.values(this.players).forEach(p => {
      p.isAlive = true;
      p.role = undefined;
      p.team = undefined;
      p.vote = undefined;
      p.nightActionDone = false;
    });

    const msg: Message = {
      id: uuidv4(),
      senderId: 'system',
      senderName: 'Sistem',
      content: '🔄 Yeni oyun hazır! Oda sahibi ayarları yapıp başlatabilir.',
      channel: 'system',
      timestamp: Date.now(),
    };
    this.messages.push(msg);

    Object.keys(this.players).forEach(pid => {
      this.sendTo(pid, 'room:joined', this.getPersonalState(pid), this.settings);
    });
  }

  sendMessage(playerId: string, content: string, channel: ChatChannel): string | null {
    const player = this.players[playerId];
    if (!player) return 'Oyuncu bulunamadı.';

    if (channel === 'vampire') {
      if (player.role !== 'vampire') return 'Vampir kanalına erişimin yok.';
    }
    if (channel === 'public' && this.phase === 'night' && player.isAlive) {
      return 'Gece vakti herkese konuşamazsın.';
    }
    if (channel === 'public' && this.phase === 'trial' && playerId !== this.accusedPlayerId) {
      return 'Savunma sırasında sadece sanık konuşabilir.';
    }

    const msg: Message = {
      id: uuidv4(),
      senderId: playerId,
      senderName: player.name,
      content,
      channel,
      timestamp: Date.now(),
    };
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

  updateNotes(playerId: string, notes: string): void {
    this.notes[playerId] = notes;
  }

  getNotes(playerId: string): string {
    return this.notes[playerId] ?? '';
  }

  updateSettings(hostId: string, settings: Partial<GameSettings>): void {
    if (this.players[hostId]?.isHost && this.phase === 'lobby') {
      this.settings = { ...this.settings, ...settings };
    }
  }

  getSettings(): GameSettings {
    return this.settings;
  }

  private addSystemMessage(content: string): void {
    const msg: Message = {
      id: uuidv4(),
      senderId: 'system',
      senderName: 'Sistem',
      content,
      channel: 'system',
      timestamp: Date.now(),
    };
    this.messages.push(msg);
    this.broadcast('chat:message', msg);
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

  private broadcast(event: string, ...args: unknown[]): void {
    this.onBroadcast?.(event, args);
  }

  private sendTo(playerId: string, event: string, ...args: unknown[]): void {
    this.onSendTo?.(playerId, event, args);
  }
}
