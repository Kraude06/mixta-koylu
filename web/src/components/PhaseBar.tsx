import { useEffect, useState } from 'react';
import { PhaseType } from '@vampir-koylu/shared';

interface Props {
  phase: PhaseType;
  dayNumber: number;
  phaseEndTime: number | null;
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

export default function PhaseBar({ phase, dayNumber, phaseEndTime }: Props) {
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
      {remaining !== null && (
        <div className={`font-mono font-bold text-lg ${urgency ? 'text-blood-400 animate-pulse' : 'text-gray-300'}`}>
          {Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}
        </div>
      )}
    </div>
  );
}
