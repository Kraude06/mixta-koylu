import { useEffect, useState } from 'react';
import { PhaseType } from '@vampir-koylu/shared';
import { PHASE_LABEL, isNightPhase } from '../../utils/game';

interface Props {
  phase: PhaseType;
  dayNumber: number;
  phaseEndTime: number | null;
  isConnected: boolean;
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

function useCountdown(endTime: number | null) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!endTime) { setRemaining(null); return; }
    const update = () => setRemaining(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    update();
    const i = setInterval(update, 250);
    return () => clearInterval(i);
  }, [endTime]);
  return remaining;
}

function IconButton({ onClick, title, children, tone = 'default' }: {
  onClick: () => void; title: string; children: React.ReactNode; tone?: 'default' | 'on' | 'error';
}) {
  const colors = {
    default: { border: '#5c4420', color: '#d6d3d1', bg: 'rgba(0,0,0,0.35)' },
    on: { border: '#16a34a', color: '#86efac', bg: 'rgba(20,83,45,0.35)' },
    error: { border: '#b91c1c', color: '#fca5a5', bg: 'rgba(127,29,29,0.35)' },
  }[tone];
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-9 h-9 shrink-0 rounded-md flex items-center justify-center text-base active:scale-95 transition-transform"
      style={{ border: `1.5px solid ${colors.border}`, color: colors.color, background: colors.bg }}
    >
      {children}
    </button>
  );
}

export default function TopBar({
  phase, dayNumber, phaseEndTime, isConnected,
  soundEnabled, onToggleSound,
  voiceEnabled, voiceActive, isMicMuted, micError, iceError, onToggleVoice, onToggleMic,
}: Props) {
  const remaining = useCountdown(phaseEndTime);
  const night = isNightPhase(phase);
  const urgent = remaining !== null && remaining <= 5 && remaining > 0;
  const voiceError = micError || iceError;

  return (
    <div
      className="shrink-0 flex items-center gap-2 px-2 py-1.5"
      style={{
        background: 'linear-gradient(180deg, #26170d, #170e09)',
        borderBottom: '2px solid #4d321b',
        boxShadow: '0 2px 10px rgba(0,0,0,0.6)',
        paddingTop: 'max(0.375rem, env(safe-area-inset-top))',
      }}
    >
      <IconButton onClick={onToggleSound} title={soundEnabled ? 'Sesi kapat' : 'Sesi aç'}>
        {soundEnabled ? '🔊' : '🔇'}
      </IconButton>

      {/* Faz göstergesi */}
      <div className="flex-1 flex justify-center min-w-0">
        <div
          className="flex items-center gap-2 rounded-full pl-2 pr-1 py-0.5 min-w-0"
          style={{
            background: night ? 'linear-gradient(180deg,#1e2a5a,#0f1535)' : 'linear-gradient(180deg,#5c4420,#2a1a0e)',
            border: `2px solid ${night ? '#4f5fa8' : '#b88d3e'}`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <span className="text-lg leading-none">{night ? '🌙' : phase === 'game-over' ? '🏁' : '☀️'}</span>
          <div className="min-w-0 leading-none">
            <div className="font-display text-[1.2rem] tracking-wide truncate" style={{ color: night ? '#c7d2fe' : '#f7e3a8', textShadow: '0 1px 0 #000' }}>
              {phase === 'game-over' ? 'Oyun Bitti' : `${night ? 'Gece' : 'Gün'} ${dayNumber}`}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-stone-400 truncate">{PHASE_LABEL[phase]}</div>
          </div>
          {remaining !== null && phase !== 'game-over' && (
            <div
              className={`ml-1 w-10 h-8 rounded-full flex items-center justify-center font-mono font-bold text-base ${urgent ? 'animate-pulse' : ''}`}
              style={{ background: 'rgba(0,0,0,0.45)', color: urgent ? '#f87171' : '#f3f4f6' }}
            >
              {remaining}
            </div>
          )}
        </div>
      </div>

      {!isConnected && <span className="text-[10px] text-red-400 animate-pulse shrink-0">Bağlanıyor…</span>}

      {voiceActive && (
        <IconButton onClick={onToggleMic} title={isMicMuted ? 'Mikrofonu aç' : 'Mikrofonu kapat'} tone={isMicMuted ? 'error' : 'on'}>
          {isMicMuted ? '🔇' : '🎙️'}
        </IconButton>
      )}
      <IconButton
        onClick={onToggleVoice}
        title={micError ?? (iceError ? 'Ses bağlantısı kurulamadı' : voiceActive ? 'Sesli sohbeti kapat' : voiceEnabled ? 'Bağlanıyor...' : 'Sesli sohbete katıl')}
        tone={voiceError ? 'error' : voiceActive ? 'on' : 'default'}
      >
        {voiceError ? '⚠️' : '🎧'}
      </IconButton>
    </div>
  );
}
