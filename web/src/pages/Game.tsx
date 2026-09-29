import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, PhaseType, ROLE_INFO } from '@vampir-koylu/shared';
import { socket } from '../socket';
import { useGameStore } from '../store/gameStore';
import TopBar from '../components/game/TopBar';
import TownSquare from '../components/game/TownSquare';
import Narrator, { ScrollView, usePhaseBanners, useRevealSequence } from '../components/game/Narrator';
import ActionBar from '../components/game/ActionBar';
import ChatLog from '../components/game/ChatLog';
import { Graveyard, PlayerAction, PlayerList, RoleList, RolePanel } from '../components/game/Panels';
import { GameOver, RoleIntro, ScrollEditor } from '../components/game/Overlays';
import { isNightPhase } from '../utils/game';
import {
  initAudio, playDay, playNight, playTrial, playVerdict,
  playGameOver, playVoteCast, playHunterRevenge,
} from '../utils/sounds';
import { useVoiceChat } from '../hooks/useVoiceChat';

type MobileTab = 'chat' | 'players' | 'grave' | 'role';
type ScrollState =
  | { kind: 'will' }
  | { kind: 'deathNote' }
  | { kind: 'read'; title: string; text: string }
  | null;

const WHISPER_PHASES: PhaseType[] = ['discussion', 'voting', 'verdict'];

function useIsDesktop() {
  const query = '(min-width: 1024px)';
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return match;
}

export default function Game() {
  const navigate = useNavigate();
  const s = useGameStore();
  const {
    phase, dayNumber, players, messages, myId, myRole, myTeam,
    seerResults, winner, winReason, phaseEndTime, votes, verdictVoted, myVerdict, accusedPlayerId,
    error, clearError, hunterPlayerId, revealQueue, finishReveal, hiddenRoleIds,
    graveyard, roleList, trialsLeft, votesNeeded, myNotes, myDeathNote, isConnected,
    showRoleIntro, dismissRoleIntro,
  } = s;

  const isDesktop = useIsDesktop();
  const [nightTarget, setNightTarget] = useState<string | undefined>();
  const [whisperTarget, setWhisperTarget] = useState<string | null>(null);
  const [tab, setTab] = useState<MobileTab>('chat');
  const [scroll, setScroll] = useState<ScrollState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [seenMessages, setSeenMessages] = useState(messages.length);

  const playerList = useMemo(() => Object.values(players).sort((a, b) => a.number - b.number), [players]);
  const me = myId ? players[myId] : undefined;
  const isAlive = me?.isAlive ?? false;
  const myVote = myId ? votes[myId] : undefined;
  const accused = accusedPlayerId ? players[accusedPlayerId] : undefined;
  const hasNightAbility = myRole === 'vampire' || myRole === 'doctor' || myRole === 'seer';

  const { current: reveal, step: revealStep } = useRevealSequence(revealQueue, finishReveal, soundEnabled);
  const banner = usePhaseBanners(phase, dayNumber, accused, myId, votesNeeded, hunterPlayerId);
  const spotlightId = reveal && revealStep && revealStep !== 'pre' ? reveal.playerId : null;

  // ── Sesli sohbet: faza ve role göre kimi duyabiliriz ──
  const permittedPeers = useMemo(() => {
    const allIds = Object.keys(players);
    if (phase === 'lobby' || phase === 'game-over') return new Set(allIds);
    if (!isAlive) return new Set(allIds.filter(id => !players[id]?.isAlive));
    if (isNightPhase(phase)) {
      if (myRole === 'vampire') return new Set(allIds.filter(id => players[id]?.team === 'vampire'));
      return new Set<string>();
    }
    return new Set(allIds.filter(id => players[id]?.isAlive));
  }, [phase, players, isAlive, myRole]);
  const { voiceActive, isMuted, micError, toggleMute, iceError } = useVoiceChat(voiceEnabled, permittedPeers);

  // ── Faz geçişleri ──
  useEffect(() => { if (phase === 'lobby') navigate('/lobby'); }, [phase, navigate]);

  useEffect(() => {
    if (phase === 'night') setNightTarget(undefined);
    if (!WHISPER_PHASES.includes(phase)) setWhisperTarget(null);
  }, [phase]);

  // Sunucu lobiye döndürmezse (bağlantı sorunu) kendimiz dönelim
  useEffect(() => {
    if (phase !== 'game-over' || !phaseEndTime) return;
    const t = setTimeout(() => {
      useGameStore.setState({ phase: 'lobby', winner: null });
    }, Math.max(0, phaseEndTime - Date.now()) + 5000);
    return () => clearTimeout(t);
  }, [phase, phaseEndTime]);

  const prevPhase = useRef<PhaseType>(phase);
  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;
    if (!soundEnabled || prev === phase) return;
    switch (phase) {
      case 'discussion': playDay(); break;
      case 'night': playNight(); break;
      case 'trial': playTrial(); break;
      case 'verdict': playVerdict(); break;
      case 'hunter-revenge': playHunterRevenge(); break;
    }
  }, [phase, soundEnabled]);

  useEffect(() => {
    if (phase === 'game-over' && winner && soundEnabled) playGameOver(winner);
  }, [phase, winner, soundEnabled]);

  useEffect(() => {
    if (!error) return;
    setToast(error);
    const t = setTimeout(() => { clearError(); setToast(null); }, 3000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  // Sohbet sekmesi açıkken okunmuş say
  useEffect(() => {
    if (isDesktop || tab === 'chat') setSeenMessages(messages.length);
  }, [messages.length, tab, isDesktop]);
  const unread = Math.max(0, messages.length - seenMessages);

  // ── Aksiyonlar ──
  const readWill = useCallback((p: Player) => {
    if (p.isAlive || hiddenRoleIds.includes(p.id)) return;
    socket.emit('notes:read', p.id, (text) => {
      setScroll({ kind: 'read', title: `Vasiyet — ${p.name}`, text: text || 'Vasiyet bırakmamış.' });
    });
  }, [hiddenRoleIds]);

  const canNightTarget = useCallback((p: Player) => {
    if (phase !== 'night' || !isAlive || !hasNightAbility || !p.isAlive) return false;
    if (myRole === 'vampire') return p.team !== 'vampire';
    if (myRole === 'seer') return p.id !== myId;
    return true; // doktor kendini de koruyabilir
  }, [phase, isAlive, hasNightAbility, myRole, myId]);

  const isMyHunterTurn = phase === 'hunter-revenge' && hunterPlayerId === myId;

  function vote(id: string) {
    if (soundEnabled) playVoteCast();
    socket.emit('game:vote', id);
  }
  function nightAction(id: string) {
    setNightTarget(id);
    socket.emit('game:night-action', id);
  }
  function shoot(id: string) {
    socket.emit('game:hunter-shot', id);
  }
  function startWhisper(id: string) {
    setWhisperTarget(id);
    setTab('chat');
  }

  const canTarget = useCallback((id: string) => {
    const p = players[id];
    if (!p) return false;
    if (!p.isAlive) return false;
    if (isMyHunterTurn) return id !== myId;
    if (!isAlive || id === myId) return phase === 'night' && canNightTarget(p);
    if (phase === 'voting') return true;
    if (phase === 'night') return canNightTarget(p);
    return WHISPER_PHASES.includes(phase);
  }, [players, isMyHunterTurn, isAlive, myId, phase, canNightTarget]);

  function onPlayerClick(id: string) {
    const p = players[id];
    if (!p) return;
    if (!p.isAlive) { readWill(p); return; }
    if (!canTarget(id)) return;
    if (isMyHunterTurn) shoot(id);
    else if (phase === 'voting') vote(id);
    else if (phase === 'night') nightAction(id);
    else if (WHISPER_PHASES.includes(phase)) startWhisper(id);
  }

  function getActions(p: Player): PlayerAction[] {
    if (!p.isAlive) return [];
    if (isMyHunterTurn) return p.id === myId ? [] : [{ label: 'Vur', tone: 'red', onClick: () => shoot(p.id) }];
    const actions: PlayerAction[] = [];
    if (phase === 'voting' && isAlive && p.id !== myId) {
      actions.push({ label: myVote === p.id ? 'Geri al' : 'Oy ver', tone: 'red', active: myVote === p.id, onClick: () => vote(p.id) });
    }
    if (canNightTarget(p) && myRole) {
      actions.push({ label: ROLE_INFO[myRole].abilityLabel ?? 'Seç', tone: 'gold', active: nightTarget === p.id, onClick: () => nightAction(p.id) });
    }
    if (WHISPER_PHASES.includes(phase) && isAlive && p.id !== myId) {
      actions.push({ label: '🤫', tone: 'violet', active: whisperTarget === p.id, onClick: () => startWhisper(p.id) });
    }
    return actions;
  }

  const verdictEligible = playerList.filter(p => p.isAlive && p.id !== accusedPlayerId).length;
  const teammates = playerList.filter(p => p.team === 'vampire' && p.id !== myId);

  // ── Ortak parçalar ──
  const square = (
    <>
      <TownSquare
        players={playerList}
        myId={myId}
        phase={phase}
        votes={votes}
        myVote={myVote}
        nightTarget={nightTarget}
        accusedId={accusedPlayerId}
        spotlightId={spotlightId}
        seerResults={seerResults}
        hiddenRoleIds={hiddenRoleIds}
        canTarget={canTarget}
        onPlayerClick={onPlayerClick}
      />
      <Narrator banner={banner} reveal={reveal} step={revealStep} myId={myId} />
    </>
  );

  const actionBar = (
    <ActionBar
      phase={phase}
      me={me}
      myRole={myRole}
      accused={accused}
      hunterId={hunterPlayerId}
      votesNeeded={votesNeeded}
      trialsLeft={trialsLeft}
      myVoteTarget={myVote ? players[myVote] : undefined}
      nightTarget={nightTarget ? players[nightTarget] : undefined}
      verdictVotedCount={verdictVoted.length}
      verdictEligible={verdictEligible}
      myVerdict={myVerdict}
      onVerdict={(v) => { if (soundEnabled) playVoteCast(); s.setMyVerdict(v); }}
    />
  );

  const chat = (
    <ChatLog
      messages={messages}
      players={players}
      phase={phase}
      myId={myId}
      myRole={myRole}
      isAlive={isAlive}
      accusedId={accusedPlayerId}
      whisperTarget={whisperTarget}
      onClearWhisper={() => setWhisperTarget(null)}
      onFocusChange={setInputFocused}
    />
  );

  const playerListEl = (
    <PlayerList
      players={playerList}
      myId={myId}
      votes={votes}
      showVotes={phase === 'voting'}
      seerResults={seerResults}
      hiddenRoleIds={hiddenRoleIds}
      getActions={getActions}
      onReadWill={readWill}
    />
  );
  const graveEl = <Graveyard graveyard={graveyard} players={players} hiddenRoleIds={hiddenRoleIds} onReadWill={readWill} />;
  const roleEl = <RolePanel role={myRole} seerResults={seerResults} players={players} />;

  const toolButtons = (compact: boolean) => (
    <>
      <button
        className={`btn-brass ${compact ? 'px-2.5 py-1 text-base' : 'px-4 py-1.5 text-lg'}`}
        onClick={() => setScroll({ kind: 'will' })}
        disabled={!isAlive}
        title="Vasiyet"
      >
        📜{!compact && ' Vasiyet'}
      </button>
      {myRole === 'vampire' && (
        <button
          className={`btn-brass ${compact ? 'px-2.5 py-1 text-base' : 'px-4 py-1.5 text-lg'}`}
          onClick={() => setScroll({ kind: 'deathNote' })}
          disabled={!isAlive}
          title="Ölüm Notu"
        >
          🩸{!compact && ' Ölüm Notu'}
        </button>
      )}
    </>
  );

  const night = isNightPhase(phase);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-wood-950" onClick={initAudio}>
      {/* Atmosfer arka planı */}
      <img
        src={night ? '/bg-night.jpg' : '/bg-day.jpg'}
        alt="" aria-hidden
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.18, filter: 'blur(6px) saturate(0.7)', transition: 'opacity 1s' }}
      />

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <TopBar
          phase={phase}
          dayNumber={dayNumber}
          phaseEndTime={phaseEndTime}
          isConnected={isConnected}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(v => !v)}
          voiceEnabled={voiceEnabled}
          voiceActive={voiceActive}
          isMicMuted={isMuted}
          micError={micError}
          iceError={iceError}
          onToggleVoice={() => setVoiceEnabled(v => !v)}
          onToggleMic={toggleMute}
        />

        {isDesktop ? (
          <div className="flex-1 min-h-0 grid gap-2 p-2" style={{ gridTemplateColumns: 'minmax(260px, 330px) 1fr minmax(260px, 330px)' }}>
            {/* Sol: mezarlık + rol listesi + sohbet */}
            <div className="flex flex-col gap-2 min-h-0">
              <div className="grid grid-cols-2 gap-2 h-[34%] min-h-0">
                <div className="panel"><div className="panel-title">Mezarlık</div>{graveEl}</div>
                <div className="panel"><div className="panel-title">Rol Listesi</div><RoleList roleList={roleList} /></div>
              </div>
              <div className="panel flex-1"><div className="panel-title">Sohbet</div>{chat}</div>
            </div>

            {/* Orta: meydan */}
            <div className="flex flex-col gap-2 min-h-0">
              <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden" style={{ border: '2px solid #4d321b', boxShadow: '0 6px 18px rgba(0,0,0,0.55)' }}>
                {square}
              </div>
              <div className="rounded-lg overflow-hidden">{actionBar}</div>
              <div className="flex justify-center gap-3">{toolButtons(false)}</div>
            </div>

            {/* Sağ: rolüm + oyuncular */}
            <div className="flex flex-col gap-2 min-h-0">
              <div className="panel max-h-[42%]"><div className="panel-title">Rolüm</div>{roleEl}</div>
              <div className="panel flex-1">
                <div className="panel-title">Oyuncular <span className="text-sm text-stone-400">({playerList.filter(p => p.isAlive).length}/{playerList.length})</span></div>
                {playerListEl}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Mobil: meydan üstte */}
            <div
              className="relative shrink-0 overflow-hidden transition-[height] duration-300"
              style={{ height: inputFocused ? '24vh' : '40vh', minHeight: inputFocused ? 140 : 230, maxHeight: 380 }}
            >
              {square}
            </div>
            {actionBar}

            {/* Sekmeler */}
            <div className="shrink-0 flex items-stretch gap-1 px-1 pt-1" style={{ background: '#170e09' }}>
              {([
                ['chat', '💬', 'Sohbet'],
                ['players', '👥', 'Oyuncular'],
                ['grave', '🪦', 'Mezarlık'],
                ['role', '🎭', 'Rolüm'],
              ] as const).map(([key, icon, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="relative flex-1 flex flex-col items-center py-1 rounded-t-md text-[11px] font-semibold transition-colors"
                  style={tab === key
                    ? { background: '#26170d', color: '#f7e3a8', border: '1px solid #5c4420', borderBottom: 'none' }
                    : { color: '#78716c' }}
                >
                  <span className="text-base leading-none">{icon}</span>
                  {label}
                  {key === 'chat' && unread > 0 && tab !== 'chat' && (
                    <span className="absolute top-0.5 right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              ))}
              <div className="flex items-center gap-1 pl-1">{toolButtons(true)}</div>
            </div>

            <div className="panel flex-1 rounded-none border-x-0 border-b-0 pb-safe">
              {tab === 'chat' && chat}
              {tab === 'players' && playerListEl}
              {tab === 'grave' && (
                <>
                  {graveEl}
                  <div className="panel-title text-base">Rol Listesi</div>
                  <div className="max-h-[30%] flex flex-col min-h-0"><RoleList roleList={roleList} /></div>
                </>
              )}
              {tab === 'role' && roleEl}
            </div>
          </>
        )}
      </div>

      {/* ── Katmanlar ── */}
      {scroll?.kind === 'will' && (
        <ScrollEditor
          title="Vasiyetin"
          hint="Öldüğünde herkes okuyacak. Rolünü ve gece bulduklarını yaz."
          value={myNotes}
          maxLength={2000}
          onChange={s.setMyNotes}
          onClose={() => setScroll(null)}
        />
      )}
      {scroll?.kind === 'deathNote' && (
        <ScrollEditor
          title="Ölüm Notu"
          hint="Öldürdüğün kişinin yanına bırakılır. Köyü korkut ya da yanılt."
          value={myDeathNote}
          maxLength={500}
          variant="deathNote"
          onChange={s.setMyDeathNote}
          onClose={() => setScroll(null)}
        />
      )}
      {scroll?.kind === 'read' && (
        <ScrollView title={scroll.title} text={scroll.text} onClose={() => setScroll(null)} />
      )}

      {showRoleIntro && myRole && phase !== 'game-over' && (
        <RoleIntro role={myRole} teammates={myRole === 'vampire' ? teammates : []} onClose={dismissRoleIntro} />
      )}

      {phase === 'game-over' && winner && (
        <GameOver winner={winner} reason={winReason} myTeam={myTeam} players={playerList} phaseEndTime={phaseEndTime} />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 rounded-full text-sm shadow-lg max-w-[90vw] text-center"
          style={{ background: '#7f1d1d', color: '#fee2e2', border: '1px solid #b91c1c', animation: 'fadeUp 0.2s ease-out both' }}>
          ⚠️ {toast}
        </div>
      )}
    </div>
  );
}
