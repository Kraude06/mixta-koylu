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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gothic-950 to-night-950">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center">
          <div className="text-5xl mb-2">🏰</div>
          <h1 className="text-3xl font-gothic font-bold text-blood-500">Bekleme Odası</h1>
        </div>

        {/* Oda kodu */}
        <div className="card">
          <p className="text-gray-400 text-sm mb-2">Oda Kodu — arkadaşlarınla paylaş</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-mono font-bold tracking-[0.3em] text-blood-400">
              {roomCode}
            </span>
            <button className="btn-ghost text-sm py-1 px-3" onClick={copyCode}>
              Kopyala
            </button>
          </div>
        </div>

        {/* Oyuncular */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-200">
              Oyuncular ({playerList.length}/16)
            </h3>
            <span className="text-xs text-gray-500">Min: 4</span>
          </div>
          <div className="space-y-2">
            {playerList.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-night-900 rounded-lg px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-blood-800 flex items-center justify-center text-sm font-bold text-blood-300">
                  {p.name[0].toUpperCase()}
                </div>
                <span className="text-gray-200 flex-1">{p.name}</span>
                {p.isHost && <span className="text-xs text-blood-400 font-semibold">👑 Lider</span>}
                {p.id === myId && <span className="text-xs text-gray-500">(sen)</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Ayarlar — sadece host */}
        {isHost && (
          <div className="card space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">⚙️ Oyun Ayarları</h3>

            {/* Vampir sayısı */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">
                Vampir Sayısı
                <span className="text-blood-400 ml-2 font-bold">{localSettings.vampireCount}</span>
              </label>
              <div className="flex gap-2">
                {Array.from({ length: maxVampires }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => set('vampireCount', n)}
                    className={`w-10 h-10 rounded-lg border font-bold transition-all
                      ${localSettings.vampireCount === n
                        ? 'bg-blood-700 border-blood-500 text-white'
                        : 'bg-night-900 border-white/10 text-gray-400 hover:border-blood-700 hover:text-blood-400'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Roller */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Özel Roller</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'includeDoctor', icon: '🩺', label: 'Doktor' },
                  { key: 'includeSeer', icon: '🔮', label: 'Kahin' },
                  { key: 'includeHunter', icon: '🏹', label: 'Avcı' },
                ] as const).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    onClick={() => set(key, !localSettings[key])}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all
                      ${localSettings[key]
                        ? 'bg-green-900/30 border-green-700 text-green-300'
                        : 'bg-night-900 border-white/10 text-gray-600 hover:border-white/20'
                      }`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-xs">{localSettings[key] ? '✓ Açık' : 'Kapalı'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Süreler */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  ☀️ Gündüz Süresi
                  <span className="text-yellow-400 ml-1 font-bold">{localSettings.dayDuration}s</span>
                </label>
                <input
                  type="range" min={30} max={300} step={15}
                  value={localSettings.dayDuration}
                  onChange={(e) => set('dayDuration', Number(e.target.value))}
                  className="w-full accent-yellow-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>30s</span><span>300s</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  🌙 Gece Süresi
                  <span className="text-indigo-400 ml-1 font-bold">{localSettings.nightDuration}s</span>
                </label>
                <input
                  type="range" min={20} max={120} step={10}
                  value={localSettings.nightDuration}
                  onChange={(e) => set('nightDuration', Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>20s</span><span>120s</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  ⚖️ Savunma Süresi
                  <span className="text-amber-400 ml-1 font-bold">{localSettings.trialDuration}s</span>
                </label>
                <input
                  type="range" min={15} max={90} step={15}
                  value={localSettings.trialDuration}
                  onChange={(e) => set('trialDuration', Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>15s</span><span>90s</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  🗳️ Karar Süresi
                  <span className="text-orange-400 ml-1 font-bold">{localSettings.verdictDuration}s</span>
                </label>
                <input
                  type="range" min={15} max={60} step={15}
                  value={localSettings.verdictDuration}
                  onChange={(e) => set('verdictDuration', Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>15s</span><span>60s</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Host olmayan için ayar özeti */}
        {!isHost && settings && (
          <div className="card text-sm text-gray-400">
            <h3 className="text-gray-300 font-semibold mb-2">Oyun Ayarları</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>Vampir:</span><span className="text-blood-400 font-bold">{settings.vampireCount}</span>
              <span>Doktor:</span><span>{settings.includeDoctor ? '✅ Var' : '❌ Yok'}</span>
              <span>Kahin:</span><span>{settings.includeSeer ? '✅ Var' : '❌ Yok'}</span>
              <span>Avcı:</span><span>{settings.includeHunter ? '✅ Var' : '❌ Yok'}</span>
              <span>Gündüz:</span><span>{settings.dayDuration}s</span>
              <span>Gece:</span><span>{settings.nightDuration}s</span>
              <span>Savunma:</span><span>{settings.trialDuration}s</span>
              <span>Karar:</span><span>{settings.verdictDuration}s</span>
            </div>
          </div>
        )}

        {isHost ? (
          <button
            className="btn-primary w-full py-4 text-lg"
            disabled={playerList.length < 4}
            onClick={handleStart}
          >
            {playerList.length < 4
              ? `Oyun için ${4 - playerList.length} oyuncu daha lazım`
              : '🎮 Oyunu Başlat'}
        </button>
        ) : (
          <div className="text-center text-gray-500 py-4">
            Oda sahibinin oyunu başlatması bekleniyor...
          </div>
        )}
      </div>
    </div>
  );
}
