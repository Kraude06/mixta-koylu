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
    seerResults, winner, phaseEndTime, votes, error, clearError,
    hunterPlayerId,
  } = useGameStore();

  const [nightTarget, setNightTarget] = useState<string | undefined>();
  const [activePanel, setActivePanel] = useState<Panel>('chat');
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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

  const showNightActions = phase === 'night' && isAlive && myRole && myRole !== 'villager';
  const showVoting = phase === 'day' && isAlive;
  const showHunterRevenge = isMyHunterRevenge;

  const roleInfo = myRole ? ROLE_INFO[myRole] : null;

  return (
    <div className="h-screen flex flex-col bg-night-950 overflow-hidden">
      <SkyScene phase={phase} />
      <PhaseBar phase={phase} dayNumber={dayNumber} phaseEndTime={phaseEndTime} />

      {/* Game over banner */}
      {phase === 'game-over' && winner && (
        <div className={`text-center py-3 font-bold text-lg border-b border-white/10
          ${winner === 'vampire' ? 'bg-blood-900/60 text-blood-300' : 'bg-green-900/40 text-green-300'}`}>
          {winner === 'vampire' ? '🧛 Vampirler Kazandı!' : '🏡 Köy Kurtuldu!'}
          {' — '}
          <button className="underline text-sm" onClick={() => navigate('/')}>Ana Menüye Dön</button>
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
