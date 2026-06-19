import { useEffect, useRef, useState } from 'react';
import { Message, ChatChannel, PhaseType, RoleType } from '@vampir-koylu/shared';
import { socket } from '../socket';

interface Props {
  messages: Message[];
  phase: PhaseType;
  myRole: RoleType | null;
  isAlive: boolean;
  myId: string;
  accusedPlayerId?: string | null;
}

const channelLabel: Record<ChatChannel, string> = {
  public: '🏘️ Köy',
  vampire: '🩸 Vampirler',
  system: '📜 Sistem',
};

function canSendPublic(phase: PhaseType, isAlive: boolean, myId: string, accusedPlayerId?: string | null): boolean {
  if (!isAlive) return false;
  if (phase === 'trial') return myId === accusedPlayerId;
  return phase === 'day' || phase === 'verdict' || phase === 'hunter-revenge' || phase === 'game-over';
}

function canSendVampire(phase: PhaseType, myRole: RoleType | null, isAlive: boolean): boolean {
  return isAlive && myRole === 'vampire' && phase === 'night';
}

export default function Chat({ messages, phase, myRole, isAlive, myId, accusedPlayerId }: Props) {
  const [input, setInput] = useState('');
  const [activeChannel, setActiveChannel] = useState<ChatChannel>('public');
  const endRef = useRef<HTMLDivElement>(null);

  const isVampire = myRole === 'vampire';

  const visibleMessages = messages.filter((m) => {
    if (m.channel === 'system') return true;
    if (m.channel === 'public') return true;
    if (m.channel === 'vampire') return isVampire;
    return false;
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages.length]);

  useEffect(() => {
    if (phase === 'night' && isVampire) setActiveChannel('vampire');
    else setActiveChannel('public');
  }, [phase, isVampire]);

  function send() {
    const text = input.trim();
    if (!text) return;
    socket.emit('chat:send', text, activeChannel);
    setInput('');
  }

  const canSend = activeChannel === 'vampire'
    ? canSendVampire(phase, myRole, isAlive)
    : canSendPublic(phase, isAlive, myId, accusedPlayerId);

  function msgBubble(msg: Message) {
    const isOwn = msg.senderId === myId;
    const isSystem = msg.channel === 'system';
    const isVampMsg = msg.channel === 'vampire';

    if (isSystem) {
      return (
        <div key={msg.id} className="text-center">
          <span
            className="text-xs text-gray-400 px-3 py-1 bg-night-900 rounded-full"
            style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.01em' }}
          >
            {msg.content}
          </span>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
          {!isOwn && (
            <span
              className={`text-xs font-semibold px-1 ${isVampMsg ? 'text-blood-400' : 'text-gray-400'}`}
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              {isVampMsg ? '🧛 ' : ''}{msg.senderName}
            </span>
          )}
          <div
            className={`px-4 py-2.5 rounded-2xl
              ${isOwn
                ? 'bg-blood-800 text-white rounded-tr-sm'
                : isVampMsg
                  ? 'bg-gothic-900 text-red-200 rounded-tl-sm border border-blood-800'
                  : 'bg-night-800 text-gray-100 rounded-tl-sm'
              }`}
            style={{
              fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
              fontSize: '0.9rem',
              lineHeight: 1.55,
              letterSpacing: '0.01em',
              wordBreak: 'break-word',
            }}
          >
            {msg.content}
          </div>
          <span
            className="text-xs text-gray-600 px-1"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {isVampire && (
        <div className="flex border-b border-white/10 shrink-0">
          {(['public', 'vampire'] as ChatChannel[]).map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors
                ${activeChannel === ch
                  ? ch === 'vampire' ? 'text-blood-400 border-b-2 border-blood-500' : 'text-gray-200 border-b-2 border-gray-500'
                  : 'text-gray-600 hover:text-gray-400'
                }`}
            >
              {channelLabel[ch]}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {visibleMessages
          .filter((m) => m.channel === activeChannel || m.channel === 'system')
          .map((m) => msgBubble(m))}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-white/10 shrink-0">
        {!isAlive ? (
          <p className="text-center text-sm text-gray-500" style={{ fontFamily: 'system-ui, sans-serif' }}>
            💀 Öldün — artık konuşamazsın
          </p>
        ) : !canSend ? (
          <p className="text-center text-sm text-gray-500" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {phase === 'night' && !isVampire
            ? '🌙 Gece uyuyorsun...'
            : phase === 'trial'
              ? '⚖️ Savunma süresi — sadece sanık konuşabilir'
              : 'Şu an konuşamazsın'}
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              className="input-field py-2.5 flex-1"
              style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.9rem' }}
              placeholder={activeChannel === 'vampire' ? '🩸 Vampirlere yaz...' : 'Mesajını yaz...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              maxLength={500}
            />
            <button className="btn-primary px-4 py-2 text-sm" onClick={send} disabled={!input.trim()}>
              ↑
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
