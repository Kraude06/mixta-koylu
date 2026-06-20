import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLE_INFO, PhaseType } from '@vampir-koylu/shared';
import { socket } from '../socket';
import { useGameStore } from '../store/gameStore';
import PhaseBar from '../components/PhaseBar';
import PlayerCard from '../components/PlayerCard';
import Chat from '../components/Chat';
import NotesPad from '../components/NotesPad';
import RoleCard from '../components/RoleCard';
import SkyScene from '../components/SkyScene';
import {
  initAudio, playDay, playNight, playTrial, playVerdict,
  playDeath, playGameOver, playVoteCast, playHunterRevenge,
} from '../utils/sounds';
import { useVoiceChat } from '../hooks/useVoiceChat';

type Panel = 'players' | 'chat' | 'notes';

export default function Game() {
  const navigate = useNavigate();
  const {
    phase, dayNumber, players, messages, myId, myRole, myTeam,
    seerResults, winner, phaseEndTime, votes, verdictVotes, accusedPlayerId,
    error, clearError, hunterPlayerId, deathEvent, clearDeathEvent,
  } = useGameStore();

  const [nightTarget, setNightTarget] = useState<string | undefined>();
  const [activePanel, setActivePanel] = useState<Panel>('chat');
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [deathDismissIn, setDeathDismissIn] = useState(7);
  const [announcement, setAnnouncement] = useState<PhaseType | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const prevPhaseRef = useRef<PhaseType>('lobby');

  // Faz ve role göre kimin sesini duymaya izin var
  const permittedPeers = useMemo(() => {
    const isAliveMe = myId ? (players[myId]?.isAlive ?? false) : false;
    const allIds = Object.keys(players);
    if (phase === 'lobby' || phase === 'game-over') return new Set(allIds);
    if (!isAliveMe) {
      // Ölü oyuncular diğer ölüleri duyar
      return new Set(allIds.filter(id => !players[id]?.isAlive));
    }
    if (phase === 'night' || phase === 'hunter-revenge') {
      if (myRole === 'vampire') {
        // Vampirler sadece takım arkadaşlarını duyar (roller getPersonalPlayers ile görünür)
        return new Set(allIds.filter(id => players[id]?.team === 'vampire'));
      }
      return new Set<string>(); // Köylüler gece sessize alınır
    }
    // Gündüz / yargılama: hayatta olan herkes
    return new Set(allIds.filter(id => players[id]?.isAlive));
  }, [phase, players, myId, myRole]);

  const { voiceActive, isMuted, micError, voicePeers, toggleMute, iceError } =
    useVoiceChat(voiceEnabled, permittedPeers);

  // Kimin sesli sohbette olduğu (kendimiz dahil)
  const allVoicePeers = useMemo(() => {
    const s = new Set(voicePeers);
    if (voiceActive && myId) s.add(myId);
    return s;
  }, [voicePeers, voiceActive, myId]);

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
          // Server'dan room:joined gelmese bile lobby'e yönlendir
          useGameStore.setState({ phase: 'lobby', winner: null });
          navigate('/lobby');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, winner, navigate]);

  useEffect(() => {
    if (phase === 'day' || phase === 'lobby') setNightTarget(undefined);
    // Mobilde oyuncular panelini otomatik aç
    if (phase === 'day' || phase === 'trial' || phase === 'verdict') setActivePanel('players');
    if (phase === 'night') setActivePanel('players');
  }, [phase]);

  // Faz duyurusu + ses
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (phase === 'lobby' || phase === 'game-over' || phase === prev) return;

    const announceable: PhaseType[] = ['day', 'night', 'trial', 'verdict', 'hunter-revenge'];
    if (announceable.includes(phase)) {
      setAnnouncement(phase);
      const t = setTimeout(() => setAnnouncement(null), 2400);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (!soundEnabled) return;
    switch (phase) {
      case 'day': playDay(); break;
      case 'night': playNight(); break;
      case 'trial': playTrial(); break;
      case 'verdict': playVerdict(); break;
      case 'hunter-revenge': playHunterRevenge(); break;
    }
  }, [phase, soundEnabled]);

  useEffect(() => {
    if (deathEvent && soundEnabled) playDeath();
  }, [deathEvent, soundEnabled]);

  useEffect(() => {
    if (phase === 'game-over' && winner && soundEnabled) playGameOver(winner);
  }, [phase, winner, soundEnabled]);

  useEffect(() => {
    if (!deathEvent) return;
    setDeathDismissIn(10);
    const interval = setInterval(() => {
      setDeathDismissIn((c) => {
        if (c <= 1) { clearInterval(interval); clearDeathEvent(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [deathEvent, clearDeathEvent]);

  useEffect(() => {
    if (phase === 'game-over') clearDeathEvent();
  }, [phase, clearDeathEvent]);

  useEffect(() => {
    if (error) {
      setToast(error);
      const t = setTimeout(() => { clearError(); setToast(null); }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  function handleVote(targetId: string) {
    if (soundEnabled) playVoteCast();
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
    if (soundEnabled) playVoteCast();
    socket.emit('game:verdict-vote', vote);
  }

  const showNightActions = phase === 'night' && isAlive && myRole && myRole !== 'villager';
  const showVoting = phase === 'day' && isAlive;
  const showHunterRevenge = isMyHunterRevenge;
  const showVerdict = phase === 'verdict' && isAlive && myId !== accusedPlayerId;
  const myVerdictVote = myId ? verdictVotes[myId] : undefined;
  const accusedPlayer = accusedPlayerId ? players[accusedPlayerId] : undefined;
  const guiltyCount = Object.values(verdictVotes).filter(v => v === 'guilty').length;
  const innocentCount = Object.values(verdictVotes).filter(v => v === 'innocent').length;

  const roleInfo = myRole ? ROLE_INFO[myRole] : null;

  const deathReasonText = !deathEvent ? '' :
    deathEvent.reason === 'voted'
      ? (deathEvent.isMe ? 'Köy seni suçlu buldu ve idam etti.' : 'Köy kararını verdi — idam edildi.')
      : deathEvent.reason === 'killed'
        ? (deathEvent.isMe ? 'Vampirler bu gece seni kurban seçti.' : 'Bu gece vampirlerin kurbanı oldu.')
        : (deathEvent.isMe ? 'Avcı son nefesinde seni yanına götürdü.' : 'Avcı son nefesinde yanına götürdü.');

  const NIGHT_STARS_ANIM = [
    { x: 8,  y: 10, size: 3,   delay: 0.08 },
    { x: 20, y: 7,  size: 2,   delay: 0.14 },
    { x: 35, y: 13, size: 2.5, delay: 0.20 },
    { x: 50, y: 5,  size: 3,   delay: 0.07 },
    { x: 65, y: 10, size: 2,   delay: 0.25 },
    { x: 78, y: 6,  size: 3,   delay: 0.11 },
    { x: 90, y: 16, size: 2,   delay: 0.17 },
    { x: 13, y: 26, size: 2,   delay: 0.30 },
    { x: 42, y: 20, size: 2.5, delay: 0.22 },
    { x: 58, y: 23, size: 2,   delay: 0.33 },
    { x: 4,  y: 38, size: 1.5, delay: 0.38 },
    { x: 93, y: 33, size: 2,   delay: 0.27 },
    { x: 72, y: 30, size: 1.5, delay: 0.43 },
    { x: 28, y: 35, size: 2,   delay: 0.36 },
    { x: 84, y: 42, size: 1.5, delay: 0.48 },
    { x: 48, y: 40, size: 2,   delay: 0.42 },
  ];

  const DRIPS = [
    { left: 6, h: 55, d: 0 }, { left: 14, h: 38, d: 0.07 }, { left: 24, h: 68, d: 0.05 },
    { left: 34, h: 44, d: 0.12 }, { left: 46, h: 72, d: 0.03 }, { left: 57, h: 40, d: 0.09 },
    { left: 68, h: 62, d: 0.06 }, { left: 78, h: 48, d: 0.11 }, { left: 88, h: 58, d: 0.04 },
    { left: 95, h: 35, d: 0.08 },
  ];

  const ANNOUNCEMENT_CONFIG: Partial<Record<PhaseType, { icon: string; label: string; bg: string; text: string }>> = {
    day:              { icon: '☀️', label: 'Gündüz Başladı',      bg: 'from-yellow-900/80 to-orange-900/60', text: 'text-yellow-300' },
    night:            { icon: '🌙', label: 'Gece Çöktü',           bg: 'from-indigo-950/90 to-violet-950/80', text: 'text-indigo-300' },
    trial:            { icon: '⚖️', label: 'Savunma Başladı',      bg: 'from-amber-950/90 to-yellow-950/80',  text: 'text-amber-300' },
    verdict:          { icon: '🗳️', label: 'Karar Zamanı',          bg: 'from-orange-950/90 to-red-950/80',    text: 'text-orange-300' },
    'hunter-revenge': { icon: '🏹', label: 'Avcı İntikamı',        bg: 'from-red-950/90 to-orange-950/80',    text: 'text-red-300' },
  };

  return (
    <div
      className="h-screen flex flex-col bg-night-950 overflow-hidden"
      onClick={initAudio}
    >
      <PhaseBar
        phase={phase}
        dayNumber={dayNumber}
        phaseEndTime={phaseEndTime}
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

      {/* Gece özel duyurusu */}
      {announcement === 'night' && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none overflow-hidden"
          style={{ animation: 'phaseAnnounce 2.4s ease-in-out forwards', background: 'linear-gradient(to bottom, #000208 0%, #020617 55%, #1e1b4b 100%)' }}
        >
          {/* Yıldızlar */}
          {NIGHT_STARS_ANIM.map((s, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
              width: s.size, height: s.size,
              borderRadius: '50%', background: 'white', opacity: 0,
              animation: `nightStarIn 0.4s ${s.delay}s ease-out forwards, nightStarTwinkle 1.8s ${s.delay + 0.5}s infinite`,
            }} />
          ))}

          {/* Ay */}
          <div style={{
            position: 'absolute', right: '16%', top: '12%',
            width: 68, height: 68, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #f5efd8, #c8c0a0)',
            boxShadow: '0 0 28px rgba(230,218,170,0.35), 0 0 60px rgba(200,190,150,0.12)',
            animation: 'nightMoonIn 0.75s 0.12s cubic-bezier(0.34,1.4,0.64,1) both',
          }} />

          {/* Yarım ay gölgesi (gerçekçilik) */}
          <div style={{
            position: 'absolute', right: 'calc(16% - 10px)', top: 'calc(12% - 8px)',
            width: 62, height: 62, borderRadius: '50%',
            background: '#020a1a',
            animation: 'nightMoonIn 0.75s 0.12s cubic-bezier(0.34,1.4,0.64,1) both',
          }} />

          {/* Metin */}
          <div className="text-center relative z-10" style={{ animation: 'nightTextIn 0.65s 0.38s ease-out both' }}>
            <div style={{ fontSize: 92, lineHeight: 1 }}>🌙</div>
            <h2 className="text-4xl font-black mt-3 tracking-wide text-indigo-300"
              style={{ textShadow: '0 0 40px #818cf8, 0 0 80px #4338ca60' }}>
              Gece Çöktü
            </h2>
          </div>

          <style>{`
            @keyframes phaseAnnounce {
              0%   { opacity: 0; }
              12%  { opacity: 1; }
              70%  { opacity: 1; }
              100% { opacity: 0; }
            }
            @keyframes nightStarIn { to { opacity: 0.9; } }
            @keyframes nightStarTwinkle { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.2; } }
            @keyframes nightMoonIn { from { opacity: 0; transform: translateY(-22px) scale(0.72); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes nightTextIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
        </div>
      )}

      {/* Faz duyurusu (gece hariç) */}
      {announcement && announcement !== 'night' && ANNOUNCEMENT_CONFIG[announcement] && (
        <div
          className={`fixed inset-0 z-30 flex items-center justify-center pointer-events-none bg-gradient-to-b ${ANNOUNCEMENT_CONFIG[announcement]!.bg}`}
          style={{ animation: 'phaseAnnounce 2.4s ease-in-out forwards' }}
        >
          <div className="text-center" style={{ animation: 'phaseScale 2.4s ease-in-out forwards' }}>
            <div style={{ fontSize: 88, lineHeight: 1 }}>{ANNOUNCEMENT_CONFIG[announcement]!.icon}</div>
            <h2 className={`text-4xl font-black mt-3 tracking-wide ${ANNOUNCEMENT_CONFIG[announcement]!.text}`}
              style={{ textShadow: '0 0 40px currentColor' }}>
              {ANNOUNCEMENT_CONFIG[announcement]!.label}
            </h2>
            {announcement === 'day' && dayNumber > 0 && (
              <p className="text-yellow-500/70 text-lg mt-1">Gün {dayNumber}</p>
            )}
          </div>
          <style>{`
            @keyframes phaseAnnounce {
              0%   { opacity: 0; }
              12%  { opacity: 1; }
              70%  { opacity: 1; }
              100% { opacity: 0; }
            }
            @keyframes phaseScale {
              0%   { transform: scale(0.85); }
              12%  { transform: scale(1.03); }
              20%  { transform: scale(1); }
              70%  { transform: scale(1); }
              100% { transform: scale(1.04); }
            }
          `}</style>
        </div>
      )}

      {/* Death overlay — tüm oyunculara gösterilir */}
      {deathEvent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ animation: 'deathIn 0.35s ease-out forwards' }}>
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" />

          {/* Kan damlaları — sadece kendi ölümünde */}
          {deathEvent.isMe && (
            <div className="absolute top-0 left-0 right-0 pointer-events-none">
              {DRIPS.map((d, i) => (
                <div
                  key={i}
                  className="absolute top-0 rounded-b-full"
                  style={{
                    left: `${d.left}%`,
                    width: 10,
                    height: d.h,
                    background: 'linear-gradient(to bottom, #7f1d1d, #991b1b)',
                    animation: `dripDown 0.6s ${d.d}s cubic-bezier(0.4,0,0.2,1) both`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="relative z-10 text-center px-5 max-w-xs w-full overflow-y-auto max-h-screen py-4">
            {/* İkon */}
            <div style={{ animation: 'skullIn 0.5s 0.15s cubic-bezier(0.34,1.56,0.64,1) both', fontSize: deathEvent.isMe ? 88 : 72, lineHeight: 1 }}>
              {deathEvent.isMe ? '💀' : (ROLE_INFO[deathEvent.role]?.icon ?? '☠️')}
            </div>

            {/* Başlık */}
            <h1
              className={`font-black mt-2 mb-1 tracking-tight ${deathEvent.isMe ? 'text-4xl text-blood-400' : 'text-3xl text-white'}`}
              style={{ animation: 'fadeUp 0.4s 0.4s ease-out both', textShadow: deathEvent.isMe ? '0 0 30px #991b1b' : '0 0 20px rgba(255,255,255,0.2)' }}
            >
              {deathEvent.isMe ? 'Sen Öldün!' : `${deathEvent.playerName} Öldü!`}
            </h1>

            {/* Sebep */}
            <p
              className="text-gray-400 text-sm mb-4"
              style={{ animation: 'fadeUp 0.4s 0.55s ease-out both' }}
            >
              {deathReasonText}
            </p>

            {/* Rol kartı */}
            <div
              className="mb-3 bg-night-900/80 border border-white/10 rounded-2xl p-3"
              style={{ animation: 'fadeUp 0.4s 0.65s ease-out both' }}
            >
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">
                {deathEvent.isMe ? 'Rolün' : `${deathEvent.playerName}'in Rolü`}
              </p>
              <RoleCard role={deathEvent.role} expanded />
            </div>

            {/* Notlar — varsa göster */}
            {deathEvent.notes.trim() && (
              <div
                className="mb-3 bg-night-900/80 border border-white/10 rounded-2xl p-3 text-left"
                style={{ animation: 'fadeUp 0.4s 0.78s ease-out both' }}
              >
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-widest">
                  📝 {deathEvent.isMe ? 'Notların' : `${deathEvent.playerName}'in Notları`}
                </p>
                <p className="text-gray-300 text-sm whitespace-pre-wrap line-clamp-5 leading-relaxed">
                  {deathEvent.notes}
                </p>
              </div>
            )}

            {/* Buton */}
            <button
              onClick={clearDeathEvent}
              className="btn-primary w-full py-3 text-base"
              style={{ animation: 'fadeUp 0.4s 0.88s ease-out both' }}
            >
              Anladım ({deathDismissIn}s)
            </button>
          </div>

          <style>{`
            @keyframes deathIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes dripDown { from { transform: scaleY(0); transform-origin: top; opacity: 0; } to { transform: scaleY(1); transform-origin: top; opacity: 1; } }
            @keyframes skullIn { from { opacity: 0; transform: scale(0.3) translateY(-30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
        </div>
      )}

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
      <div className="flex-1 flex min-h-0 relative overflow-hidden">

        {/* Arka plan sahne */}
        <SkyScene phase={phase} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, rgba(2,0,12,0.78) 0%, rgba(2,0,12,0.42) 25%, rgba(2,0,12,0.38) 72%, rgba(2,0,12,0.82) 100%)',
        }} />

        {/* Sidebar - Players (desktop) */}
        <div className="hidden md:flex flex-col w-56 border-r border-white/10 overflow-y-auto shrink-0 relative z-10"
          style={{ background: 'rgba(4,0,18,0.55)', backdropFilter: 'blur(12px)' }}>
          <div className="p-2 border-b border-white/10 text-xs text-gray-500 font-semibold uppercase tracking-wide">
            Oyuncular ({playerList.filter(p => p.isAlive).length}/{playerList.length})
          </div>
          <div className="p-2 space-y-2 overflow-y-auto">
            {playerList.map((p) => (
              <div key={p.id} className="relative">
                <PlayerCard
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
                {allVoicePeers.has(p.id) && (
                  <span
                    className="absolute top-1 right-1 text-xs"
                    title="Sesli sohbette"
                    style={{ color: '#4ade80', fontSize: 11 }}
                  >🎤</span>
                )}
              </div>
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
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
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
              <div key={p.id} className="relative">
                <PlayerCard
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
                {allVoicePeers.has(p.id) && (
                  <span
                    className="absolute top-1 right-1 text-xs"
                    title="Sesli sohbette"
                    style={{ color: '#4ade80', fontSize: 11 }}
                  >🎤</span>
                )}
              </div>
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
        <div className="hidden md:flex flex-col w-56 border-l border-white/10 relative z-10"
          style={{ background: 'rgba(4,0,18,0.55)', backdropFilter: 'blur(12px)' }}>
          <NotesPad />
        </div>
      </div>

      {/* Mobile notes panel (bottom sheet when active) */}
      {activePanel === 'notes' && (
        <div className="md:hidden flex-1 flex flex-col min-h-0" style={{ background: 'rgba(4,0,18,0.85)' }}>
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
