import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLE_INFO } from '@vampir-koylu/shared';
import { socket } from '../socket';
import { useGameStore } from '../store/gameStore';
import PhaseBar from '../components/PhaseBar';
import PlayerCard from '../components/PlayerCard';
import Chat from '../components/Chat';
import NotesPad from '../components/NotesPad';
import RoleCard from '../components/RoleCard';
import SkyScene from '../components/SkyScene';

type Panel = 'players' | 'chat' | 'notes';

export default function Game() {
  const navigate = useNavigate();
  const {
    phase, dayNumber, players, messages, myId, myRole, myTeam,
    seerResults, winner, phaseEndTime, votes, verdictVotes, accusedPlayerId,
    error, clearError, hunterPlayerId,
  } = useGameStore();

  const [nightTarget, setNightTarget] = useState<string | undefined>();
  const [activePanel, setActivePanel] = useState<Panel>('chat');
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);

  const me = myId ? players[myId] : undefined;
  const isAlive = me?.isAlive ?? false;
  const myVote = myId ? votes[myId] : undefined;
  const playerList = Object.values(players);
  const isHunter = me?.role === 'hunter';
  const isMyHunterRevenge = phase === 'hunter-revenge' && hunterPlayerId === myId;

  useEffect(() => {
    if (phase === 'lobby') navigate('/lobby');
  }, [phase, navigate]);

  useEffect(() => {
    if (phase !== 'game-over' || !winner) return;
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, winner]);

  useEffect(() => {
    if (phase === 'day' || phase === 'lobby') setNightTarget(undefined);
  }, [phase]);

  useEffect(() => {
    if (error) {
      setToast(error);
      const t = setTimeout(() => { clearError(); setToast(null); }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  function handleVote(targetId: string) {
    socket.emit('game:vote', targetId);
  }

  function handleNightAction(targetId: string) {
    setNightTarget(targetId);
    socket.emit('game:night-action', targetId);
  }

  function handleHunterShot(targetId: string) {
    socket.emit('game:hunter-shot', targetId);
  }

  function handleVerdictVote(vote: 'guilty' | 'innocent') {
    socket.emit('game:verdict-vote', vote);
  }

  const showNightActions = phase === 'night' && isAlive && myRole && myRole !== 'villager';
  const showVoting = phase === 'day' && isAlive;
  const showHunterRevenge = isMyHunterRevenge;
  const showVerdict = phase === 'verdict' && isAlive;
  const myVerdictVote = myId ? verdictVotes[myId] : undefined;
  const accusedPlayer = accusedPlayerId ? players[accusedPlayerId] : undefined;
  const guiltyCount = Object.values(verdictVotes).filter(v => v === 'guilty').length;
  const innocentCount = Object.values(verdictVotes).filter(v => v === 'innocent').length;

  const roleInfo = myRole ? ROLE_INFO[myRole] : null;

  return (
    <div className="h-screen flex flex-col bg-night-950 overflow-hidden">
      <SkyScene phase={phase} />
      <PhaseBar phase={phase} dayNumber={dayNumber} phaseEndTime={phaseEndTime} />

      {/* Game over overlay */}
      {phase === 'game-over' && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="text-center px-8 py-10 max-w-sm w-full mx-4 rounded-3xl bg-night-900 border border-white/10 shadow-2xl">
            <div className="text-7xl mb-3">{winner === 'vampire' ? '🧛' : '🏡'}</div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {winner === 'vampire' ? 'Vampirler Kazandı!' : 'Köy Kurtuldu!'}
            </h2>

            <div className={`mt-6 py-5 px-4 rounded-2xl ${myTeam === winner
              ? 'bg-green-900/50 border border-green-700'
              : 'bg-blood-900/50 border border-blood-800'}`}>
              {myTeam === winner ? (
                <>
                  <div className="text-5xl mb-2">🎉</div>
                  <p className="text-xl font-bold text-green-300">Kazandınız!</p>
                  <p className="text-green-500 text-sm mt-1">Tebrikler!</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-2">😢</div>
                  <p className="text-xl font-bold text-blood-300">Kaybettiniz!</p>
                  <p className="text-gray-500 text-sm mt-1">Böyle oynarsan kaybedersin tabi kolsuz</p>
                </>
              )}
            </div>

            <p className="text-gray-600 text-sm mt-6">
              {countdown > 0
                ? `${countdown} saniye sonra lobiye dönülüyor...`
                : 'Lobi yükleniyor...'}
            </p>
          </div>
        </div>
      )}

      {/* Trial / Verdict banner */}
      {(phase === 'trial' || phase === 'verdict') && accusedPlayer && (
        <div className={`border-b px-4 py-3 ${phase === 'trial' ? 'bg-amber-950/60 border-amber-700' : 'bg-orange-950/60 border-orange-700'}`}>
          <div className="text-center mb-2">
            <span className="text-2xl">⚖️</span>
            <span className={`ml-2 font-bold text-lg ${phase === 'trial' ? 'text-amber-300' : 'text-orange-300'}`}>
              {accusedPlayer.name}
            </span>
            <span className="text-gray-400 text-sm ml-2">
              {phase === 'trial' ? 'meydanda — savunmasını yapıyor' : 'hakkında karar veriliyor'}
            </span>
          </div>

          {phase === 'verdict' && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="text-red-400 font-bold">Suçlu: {guiltyCount}</span>
                <span className="text-green-400 font-bold">Suçsuz: {innocentCount}</span>
              </div>
              {showVerdict && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVerdictVote('guilty')}
                    className={`px-5 py-2 rounded-xl font-bold text-sm transition-all border
                      ${myVerdictVote === 'guilty'
                        ? 'bg-red-700 border-red-500 text-white'
                        : 'bg-transparent border-red-800 text-red-400 hover:bg-red-900/40'}`}
                  >
                    🔴 Suçlu
                  </button>
                  <button
                    onClick={() => handleVerdictVote('innocent')}
                    className={`px-5 py-2 rounded-xl font-bold text-sm transition-all border
                      ${myVerdictVote === 'innocent'
                        ? 'bg-green-700 border-green-500 text-white'
                        : 'bg-transparent border-green-800 text-green-400 hover:bg-green-900/40'}`}
                  >
                    🟢 Suçsuz
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hunter revenge prompt */}
      {showHunterRevenge && (
        <div className="bg-orange-900/60 border-b border-orange-700 px-4 py-3 text-center">
          <p className="text-orange-300 font-bold mb-2">🏹 Avcı İntikamı — Son kurbanını seç!</p>
          <p className="text-orange-400 text-xs">30 saniye içinde bir oyuncuyu seçmezsen fırsatı kaybedersin.</p>
        </div>
      )}

      {/* Role info banner (night) */}
      {showNightActions && roleInfo && (
        <div className={`px-4 py-2 border-b border-white/10 text-sm flex items-center gap-2
          ${myTeam === 'vampire' ? 'bg-blood-900/40' : 'bg-indigo-900/30'}`}>
          <span>{roleInfo.icon}</span>
          <span className="text-gray-300">{roleInfo.abilityLabel ?? 'Yeteneğini kullan'}</span>
          <span className="text-gray-600 text-xs ml-auto">
            {nightTarget ? '✓ Seçim yapıldı' : 'Bir oyuncu seç'}
          </span>
        </div>
      )}

      {/* My role card (toggle) */}
      {myRole && (
        <div className="px-3 py-2 border-b border-white/10 shrink-0">
          <button
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            onClick={() => setShowRoleInfo((v) => !v)}
          >
            <span>{ROLE_INFO[myRole].icon}</span>
            <span>Rolüm: <span className={myTeam === 'vampire' ? 'text-blood-400' : 'text-green-400'}>{ROLE_INFO[myRole].label}</span></span>
            <span className="ml-auto text-xs">{showRoleInfo ? '▲' : '▼'}</span>
          </button>
          {showRoleInfo && (
            <div className="mt-2">
              <RoleCard role={myRole} expanded />
            </div>
          )}
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar - Players (desktop) */}
        <div className="hidden md:flex flex-col w-56 border-r border-white/10 bg-night-900 overflow-y-auto shrink-0">
          <div className="p-2 border-b border-white/10 text-xs text-gray-500 font-semibold uppercase tracking-wide">
            Oyuncular ({playerList.filter(p => p.isAlive).length}/{playerList.length})
          </div>
          <div className="p-2 space-y-2 overflow-y-auto">
            {playerList.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                myId={myId!}
                myTeam={myTeam}
                phase={phase}
                votes={votes}
                myVote={myVote}
                seerResult={p.id !== myId ? seerResults[p.id] : undefined}
                onVote={showVoting ? handleVote : undefined}
                onNightAction={showNightActions ? handleNightAction : undefined}
                isNightActionTarget={nightTarget === p.id}
              />
            ))}
            {showHunterRevenge && (
              <div className="mt-2 space-y-2">
                {playerList.filter(p => p.isAlive && p.id !== myId).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleHunterShot(p.id)}
                    className="w-full text-sm py-2 px-3 bg-orange-900/50 border border-orange-700 text-orange-300 rounded-lg hover:bg-orange-800/50 transition-all"
                  >
                    🏹 {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile nav */}
          <div className="md:hidden flex border-b border-white/10 shrink-0">
            {(['players', 'chat', 'notes'] as Panel[]).map((p) => (
              <button
                key={p}
                onClick={() => setActivePanel(p)}
                className={`flex-1 py-2 text-xs font-semibold transition-colors
                  ${activePanel === p ? 'text-blood-400 border-b-2 border-blood-500' : 'text-gray-600 hover:text-gray-400'}`}
              >
                {p === 'players' ? '👥 Oyuncular' : p === 'chat' ? '💬 Sohbet' : '📝 Notlar'}
              </button>
            ))}
          </div>

          {/* Mobile: players panel */}
          <div className={`md:hidden flex-1 overflow-y-auto p-2 space-y-2 ${activePanel !== 'players' ? 'hidden' : ''}`}>
            {playerList.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                myId={myId!}
                myTeam={myTeam}
                phase={phase}
                votes={votes}
                myVote={myVote}
                seerResult={p.id !== myId ? seerResults[p.id] : undefined}
                onVote={showVoting ? handleVote : undefined}
                onNightAction={showNightActions ? handleNightAction : undefined}
                isNightActionTarget={nightTarget === p.id}
              />
            ))}
            {showHunterRevenge && playerList.filter(p => p.isAlive && p.id !== myId).map((p) => (
              <button key={p.id} onClick={() => handleHunterShot(p.id)}
                className="w-full text-sm py-2 px-3 bg-orange-900/50 border border-orange-700 text-orange-300 rounded-lg">
                🏹 {p.name}
              </button>
            ))}
          </div>

          {/* Chat */}
          <div className={`flex-1 min-h-0 ${activePanel !== 'chat' ? 'hidden md:flex' : 'flex'} flex-col`}>
            <Chat
              messages={messages}
              phase={phase}
              myRole={myRole}
              isAlive={isAlive}
              myId={myId!}
              accusedPlayerId={accusedPlayerId}
            />
          </div>
        </div>

        {/* Notes sidebar (desktop) */}
        <div className="hidden md:flex flex-col w-56 border-l border-white/10 bg-night-900">
          <NotesPad />
        </div>
      </div>

      {/* Mobile notes panel (bottom sheet when active) */}
      {activePanel === 'notes' && (
        <div className="md:hidden flex-1 bg-night-900 flex flex-col min-h-0">
          <NotesPad />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blood-800 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50 animate-pulse">
          ⚠️ {toast}
        </div>
      )}
    </div>
  );
}
