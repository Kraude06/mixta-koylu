import { useState } from 'react';
import { Player, ROLE_INFO, TeamType } from '@vampir-koylu/shared';
import { socket } from '../socket';

interface Props {
  player: Player;
  myId: string;
  myTeam: TeamType | null;
  phase: string;
  votes: Record<string, string | undefined>;
  myVote: string | undefined;
  seerResult?: TeamType;
  onVote?: (targetId: string) => void;
  onNightAction?: (targetId: string) => void;
  isNightActionTarget?: boolean;
}

export default function PlayerCard({
  player, myId, myTeam, phase, votes, myVote,
  seerResult, onVote, onNightAction, isNightActionTarget,
}: Props) {
  const [showNotes, setShowNotes] = useState(false);
  const [deadNotes, setDeadNotes] = useState<string | null>(null);

  const isMe = player.id === myId;
  const roleInfo = player.role ? ROLE_INFO[player.role] : null;
  const votedBy = Object.entries(votes).filter(([, t]) => t === player.id).map(([v]) => v);
  const hasVote = myVote === player.id;

  function handleClickDead() {
    if (!player.isAlive && deadNotes === null) {
      socket.emit('notes:read', player.id, (notes) => {
        setDeadNotes(notes);
        setShowNotes(true);
      });
    } else {
      setShowNotes((v) => !v);
    }
  }

  const seerColor = seerResult === 'vampire'
    ? 'ring-blood-500'
    : seerResult === 'village'
      ? 'ring-green-500'
      : '';

  return (
    <div
      className={`relative rounded-xl border transition-all duration-200 p-3
        ${player.isAlive
          ? 'bg-night-800 border-white/10 hover:border-white/20'
          : 'bg-night-950 border-white/5 opacity-60'}
        ${isNightActionTarget ? 'ring-2 ring-blood-500' : ''}
        ${seerResult ? `ring-2 ${seerColor}` : ''}
      `}
    >
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold shrink-0
          ${player.isAlive ? 'bg-blood-800 text-blood-200' : 'bg-gray-800 text-gray-600'}`}>
          {player.isAlive ? player.name[0].toUpperCase() : '💀'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`font-semibold text-sm truncate ${player.isAlive ? 'text-gray-100' : 'text-gray-500'}`}>
              {player.name}
            </span>
            {isMe && <span className="text-xs text-gray-600">(sen)</span>}
            {player.isHost && player.isAlive && <span className="text-xs">👑</span>}
          </div>

          {roleInfo && (
            <div className="flex items-center gap-1 text-xs">
              <span>{roleInfo.icon}</span>
              <span className={roleInfo.team === 'vampire' ? 'text-blood-400' : 'text-green-400'}>
                {roleInfo.label}
              </span>
            </div>
          )}

          {seerResult && (
            <div className={`text-xs font-semibold ${seerResult === 'vampire' ? 'text-blood-400' : 'text-green-400'}`}>
              {seerResult === 'vampire' ? '🧛 Vampir!' : '✅ Masum'}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {votedBy.length > 0 && (
            <span className="text-xs text-blood-400 font-bold">{votedBy.length} oy</span>
          )}
          {hasVote && <span className="text-xs text-yellow-500">✓ oyladın</span>}
        </div>
      </div>

      {player.isAlive && onVote && !isMe && phase === 'day' && (
        <button
          onClick={() => onVote(player.id)}
          className={`mt-2 w-full text-xs py-1 rounded-lg border transition-all
            ${hasVote
              ? 'bg-blood-800 border-blood-600 text-blood-200'
              : 'bg-transparent border-white/10 text-gray-400 hover:bg-blood-900 hover:border-blood-700 hover:text-blood-300'
            }`}
        >
          {hasVote ? '🗳️ Oylandı' : '🗳️ Oyla'}
        </button>
      )}

      {player.isAlive && onNightAction && !isMe && phase === 'night' && (
        <button
          onClick={() => onNightAction(player.id)}
          className={`mt-2 w-full text-xs py-1 rounded-lg border transition-all
            ${isNightActionTarget
              ? 'bg-blood-800 border-blood-600 text-blood-200'
              : 'bg-transparent border-white/10 text-gray-400 hover:bg-blood-900 hover:border-blood-700 hover:text-blood-300'
            }`}
        >
          {isNightActionTarget ? '✓ Seçildi' : 'Seç'}
        </button>
      )}

      {!player.isAlive && (
        <button
          onClick={handleClickDead}
          className="mt-2 w-full text-xs py-1 rounded-lg border border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20 transition-all"
        >
          📖 {showNotes ? 'Notları Kapat' : 'Notlara Bak'}
        </button>
      )}

      {!player.isAlive && showNotes && (
        <div className="mt-2 bg-night-950 rounded-lg p-2 text-xs text-gray-400 border border-white/10 max-h-24 overflow-y-auto">
          {deadNotes || '(Not bırakmamış)'}
        </div>
      )}
    </div>
  );
}
