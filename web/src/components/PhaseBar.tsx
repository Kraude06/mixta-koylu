import { useEffect, useState } from 'react';
import { PhaseType } from '@vampir-koylu/shared';

interface Props {
  phase: PhaseType;
  dayNumber: number;
  phaseEndTime: number | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  voiceEnabled: boolean;
  voiceActive: boolean;
  isMicMuted: boolean;
  micError: string | null;
  iceError: boolean;
  onToggleVoice: () => void;
  onToggleMic: () => void;
}

const phaseConfig: Record<PhaseType, { label: string; icon: string; color: string }> = {
  lobby: { label: 'Lobi', icon: '🏰', color: 'text-gray-400' },
  day: { label: 'Gündüz — Oylama', icon: '☀️', color: 'text-yellow-400' },
  trial: { label: 'Savunma', icon: '⚖️', color: 'text-amber-300' },
  verdict: { label: 'Karar Oylaması', icon: '🗳️', color: 'text-orange-400' },
  night: { label: 'Gece', icon: '🌙', color: 'text-indigo-400' },
  'hunter-revenge': { label: 'Avcı İntikamı', icon: '🏹', color: 'text-orange-400' },
  'game-over': { label: 'Oyun Bitti', icon: '🎮', color: 'text-blood-400' },
};

export default function PhaseBar({
  phase, dayNumber, phaseEndTime,
  soundEnabled, onToggleSound,
  voiceEnabled, voiceActive, isMicMuted, micError, iceError, onToggleVoice, onToggleMic,
}: Props) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const config = phaseConfig[phase] ?? phaseConfig.lobby;

  useEffect(() => {
    if (!phaseEndTime) { setRemaining(null); return; }
    const update = () => {
      const r = Math.max(0, Math.round((phaseEndTime - Date.now()) / 1000));
      setRemaining(r);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [phaseEndTime]);

  const urgency = remaining !== null && remaining <= 10;

  return (
    <div className="flex items-center justify-between bg-night-800 border-b border-white/10 px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{config.icon}</span>
        <span className={`font-bold text-sm ${config.color}`}>{config.label}</span>
        {dayNumber > 0 && phase !== 'game-over' && (
          <span className="text-gray-500 text-xs">Gün {dayNumber}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {remaining !== null && (
          <div className={`font-mono font-bold text-lg ${urgency ? 'text-blood-400 animate-pulse' : 'text-gray-300'}`}>
            {Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}
          </div>
        )}
        {/* Ses efektleri */}
        <button
          onClick={onToggleSound}
          className="text-lg opacity-60 hover:opacity-100 transition-opacity"
          title={soundEnabled ? 'Sesi kapat' : 'Sesi aç'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        {/* Sesli sohbet — aç/kapat */}
        <button
          onClick={onToggleVoice}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold transition-all"
          title={
            micError ?? (iceError
              ? 'Bağlantı kurulamadı — ağ engelliyor olabilir'
              : voiceActive ? 'Sesli sohbeti kapat'
              : voiceEnabled ? 'Bağlanıyor...'
              : 'Sesli sohbet aç')
          }
          style={{
            background: micError || iceError
              ? 'rgba(239,68,68,0.2)'
              : voiceActive
                ? 'rgba(74,222,128,0.15)'
                : 'rgba(255,255,255,0.08)',
            border: micError || iceError
              ? '1px solid rgba(239,68,68,0.5)'
              : voiceActive
                ? '1px solid rgba(74,222,128,0.4)'
                : '1px solid rgba(255,255,255,0.12)',
            color: micError || iceError ? '#f87171' : voiceActive ? '#4ade80' : '#9ca3af',
          }}
        >
          <span>{micError || iceError ? '⚠️' : '🎤'}</span>
          <span>{micError ? 'Hata' : iceError ? 'Bağlanamadı' : voiceActive ? 'Ses Açık' : voiceEnabled ? '...' : 'Ses'}</span>
        </button>

        {/* Mikrofon sustur */}
        {voiceActive && (
          <button
            onClick={onToggleMic}
            className="px-2 py-1 rounded-lg text-sm font-semibold transition-all"
            title={isMicMuted ? 'Mikrofon aç' : 'Mikrofonu kapat'}
            style={{
              background: isMicMuted ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.1)',
              border: isMicMuted ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(74,222,128,0.3)',
              color: isMicMuted ? '#f87171' : '#86efac',
            }}
          >
            {isMicMuted ? '🔇 Susuk' : '🎙️ Açık'}
          </button>
        )}
      </div>
    </div>
  );
}
