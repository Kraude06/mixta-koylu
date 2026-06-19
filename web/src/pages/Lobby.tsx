import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameSettings } from '@vampir-koylu/shared';
import { socket } from '../socket';
import { useGameStore } from '../store/gameStore';

export default function Lobby() {
  const navigate = useNavigate();
  const { roomCode, players, myId, settings, phase } = useGameStore();

  const [localSettings, setLocalSettings] = useState<Partial<GameSettings>>({
    vampireCount: 1,
    includeDoctor: true,
    includeSeer: true,
    includeHunter: false,
    dayDuration: 120,
    nightDuration: 60,
    trialDuration: 45,
    verdictDuration: 30,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        vampireCount: settings.vampireCount,
        includeDoctor: settings.includeDoctor,
        includeSeer: settings.includeSeer,
        includeHunter: settings.includeHunter,
        dayDuration: settings.dayDuration,
        nightDuration: settings.nightDuration,
        trialDuration: settings.trialDuration,
        verdictDuration: settings.verdictDuration,
      });
    }
  }, [settings]);

  useEffect(() => {
    const activePhases = ['day', 'trial', 'verdict', 'night', 'hunter-revenge'];
    if (activePhases.includes(phase)) navigate('/game');
  }, [phase, navigate]);

  const playerList = Object.values(players);
  const me = myId ? players[myId] : undefined;
  const isHost = me?.isHost ?? false;

  function set<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleStart() {
    socket.emit('game:start', localSettings);
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode ?? '');
  }

  const maxVampires = Math.max(1, Math.floor(playerList.length / 3));

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(to bottom, #06020f 0%, #0e0620 50%, #150830 100%)' }}
    >
      <div className="w-full max-w-lg space-y-4">

        {/* Başlık */}
        <div className="text-center pb-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blood-800 to-blood-600"/>
            <span className="text-blood-500 text-xl">🦇</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-blood-800 to-blood-600"/>
          </div>
          <h1
            className="font-gothic font-black text-blood-500 tracking-widest"
            style={{ fontSize: '1.9rem', textShadow: '0 0 30px rgba(153,27,27,0.6)' }}
          >
            Bekleme Odası
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blood-900 to-transparent"/>
          </div>
        </div>

        {/* Oda kodu */}
        <div
          className="rounded-2xl border border-blood-900/60 p-4"
          style={{ background: 'rgba(60,0,0,0.25)', backdropFilter: 'blur(8px)' }}
        >
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Oda Kodu — arkadaşlarınla paylaş</p>
          <div className="flex items-center justify-between">
            <span
              className="text-4xl font-mono font-black tracking-[0.35em] text-blood-400"
              style={{ textShadow: '0 0 20px rgba(153,27,27,0.5)' }}
            >
              {roomCode}
            </span>
            <button
              className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 text-sm
                hover:border-blood-700 hover:text-blood-400 transition-all"
              onClick={copyCode}
            >
              📋 Kopyala
            </button>
          </div>
        </div>

        {/* Oyuncular */}
        <div className="rounded-2xl border border-white/8 p-4" style={{ background: 'rgba(8,3,20,0.7)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-200 flex items-center gap-2">
              <span>👥</span> Oyuncular
              <span className="text-gray-600 font-normal text-sm">({playerList.length}/16)</span>
            </h3>
            <span className="text-xs text-gray-600 border border-white/8 rounded-full px-2 py-0.5">Min: 4</span>
          </div>
          <div className="space-y-1.5">
            {playerList.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    background: p.isHost ? 'rgba(153,27,27,0.4)' : 'rgba(255,255,255,0.08)',
                    color: p.isHost ? '#fca5a5' : '#9ca3af',
                    border: p.isHost ? '1px solid rgba(153,27,27,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {p.name[0].toUpperCase()}
                </div>
                <span className="text-gray-200 flex-1 text-sm">{p.name}</span>
                {p.isHost && <span className="text-xs text-blood-400 font-semibold">👑 Lider</span>}
                {p.id === myId && <span className="text-xs text-gray-600">(sen)</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Ayarlar — sadece host */}
        {isHost && (
          <div
            className="rounded-2xl border border-white/8 p-4 space-y-5"
            style={{ background: 'rgba(8,3,20,0.7)' }}
          >
            {/* Başlık */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blood-900 to-transparent"/>
              <h3 className="text-sm font-bold text-gray-300 tracking-widest uppercase">⚙️ Oyun Ayarları</h3>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-blood-900 to-transparent"/>
            </div>

            {/* Vampir sayısı */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                🩸 Vampir Sayısı
                <span className="text-blood-400 ml-2 font-bold normal-case tracking-normal">{localSettings.vampireCount}</span>
              </p>
              <div className="flex gap-2">
                {Array.from({ length: maxVampires }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => set('vampireCount', n)}
                    className="w-10 h-10 rounded-lg border font-bold text-sm transition-all"
                    style={localSettings.vampireCount === n
                      ? { background: 'rgba(153,27,27,0.5)', borderColor: 'rgba(153,27,27,0.8)', color: '#fca5a5' }
                      : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#6b7280' }
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Özel Roller */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Özel Roller</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'includeDoctor', icon: '🩺', label: 'Doktor' },
                  { key: 'includeSeer',   icon: '🔮', label: 'Kahin'  },
                  { key: 'includeHunter', icon: '🏹', label: 'Avcı'   },
                ] as const).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    onClick={() => set(key, !localSettings[key])}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl border transition-all"
                    style={localSettings[key]
                      ? { background: 'rgba(21,128,61,0.15)', borderColor: 'rgba(34,197,94,0.35)', color: '#86efac' }
                      : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#4b5563' }
                    }
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-xs opacity-70">{localSettings[key] ? '✓ Açık' : 'Kapalı'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Süreler */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Süreler</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {([
                  { key: 'dayDuration',     icon: '☀️', label: 'Gündüz',  color: '#facc15', accent: 'accent-yellow-400',  min: 30,  max: 300, step: 15 },
                  { key: 'nightDuration',   icon: '🌙', label: 'Gece',    color: '#818cf8', accent: 'accent-indigo-400',  min: 20,  max: 120, step: 10 },
                  { key: 'trialDuration',   icon: '⚖️', label: 'Savunma', color: '#fbbf24', accent: 'accent-amber-400',   min: 15,  max: 90,  step: 15 },
                  { key: 'verdictDuration', icon: '🗳️', label: 'Karar',   color: '#fb923c', accent: 'accent-orange-400',  min: 15,  max: 60,  step: 15 },
                ] as const).map(({ key, icon, label, color, accent, min, max, step }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{icon} {label}</span>
                      <span className="text-xs font-bold" style={{ color }}>{localSettings[key]}s</span>
                    </div>
                    <input
                      type="range" min={min} max={max} step={step}
                      value={localSettings[key]}
                      onChange={(e) => set(key, Number(e.target.value))}
                      className={`w-full ${accent}`}
                      style={{ height: 4 }}
                    />
                    <div className="flex justify-between text-xs text-gray-700 mt-0.5">
                      <span>{min}s</span><span>{max}s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Host olmayan için ayar özeti */}
        {!isHost && settings && (
          <div
            className="rounded-2xl border border-white/8 p-4"
            style={{ background: 'rgba(8,3,20,0.7)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blood-900 to-transparent"/>
              <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase">Oyun Ayarları</h3>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-blood-900 to-transparent"/>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <span className="text-gray-600">🩸 Vampir</span>
              <span className="text-blood-400 font-bold">{settings.vampireCount}</span>
              <span className="text-gray-600">🩺 Doktor</span>
              <span className={settings.includeDoctor ? 'text-green-400' : 'text-gray-600'}>{settings.includeDoctor ? '✓ Var' : '— Yok'}</span>
              <span className="text-gray-600">🔮 Kahin</span>
              <span className={settings.includeSeer ? 'text-green-400' : 'text-gray-600'}>{settings.includeSeer ? '✓ Var' : '— Yok'}</span>
              <span className="text-gray-600">🏹 Avcı</span>
              <span className={settings.includeHunter ? 'text-green-400' : 'text-gray-600'}>{settings.includeHunter ? '✓ Var' : '— Yok'}</span>
              <span className="text-gray-600">☀️ Gündüz</span>
              <span className="text-yellow-500">{settings.dayDuration}s</span>
              <span className="text-gray-600">🌙 Gece</span>
              <span className="text-indigo-400">{settings.nightDuration}s</span>
              <span className="text-gray-600">⚖️ Savunma</span>
              <span className="text-amber-400">{settings.trialDuration}s</span>
              <span className="text-gray-600">🗳️ Karar</span>
              <span className="text-orange-400">{settings.verdictDuration}s</span>
            </div>
          </div>
        )}

        {isHost ? (
          <button
            className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all duration-200 border"
            disabled={playerList.length < 4}
            onClick={handleStart}
            style={playerList.length < 4
              ? { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#6b7280', cursor: 'not-allowed' }
              : {
                  background: 'rgba(153,27,27,0.55)',
                  borderColor: 'rgba(153,27,27,0.7)',
                  color: '#fecaca',
                  boxShadow: '0 0 20px rgba(153,27,27,0.3)',
                }
            }
          >
            {playerList.length < 4
              ? `Oyun için ${4 - playerList.length} oyuncu daha lazım`
              : '🎮 Oyunu Başlat'}
          </button>
        ) : (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-blood-900"/>
              <span className="text-gray-600 text-sm tracking-wide">Lider başlatmayı bekliyor</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-blood-900"/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
