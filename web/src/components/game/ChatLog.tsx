import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Message, PhaseType, Player, RoleType } from '@vampir-koylu/shared';
import { socket } from '../../socket';

interface Props {
  messages: Message[];
  players: Record<string, Player>;
  phase: PhaseType;
  myId: string | null;
  myRole: RoleType | null;
  isAlive: boolean;
  accusedId: string | null;
  whisperTarget: string | null;
  onClearWhisper: () => void;
  /** Mobilde klavye açılınca meydanı küçültmek için */
  onFocusChange?: (focused: boolean) => void;
}

const WHISPER_PHASES: PhaseType[] = ['discussion', 'voting', 'verdict'];

function publicBlockReason(phase: PhaseType, isAlive: boolean, isAccused: boolean): string | null {
  if (phase === 'game-over') return null;
  if (!isAlive) return '💀 Ölüler konuşamaz...';
  if (phase === 'trial' || phase === 'last-words') return isAccused ? null : '⚖️ Şu an sadece sanık konuşabilir';
  if (phase === 'night') return '🌙 Gece — köy uyuyor...';
  if (phase === 'morning' || phase === 'execution') return '🤐 Sessizlik...';
  return null;
}

const KIND_STYLE: Record<string, React.CSSProperties> = {
  death: { background: 'linear-gradient(90deg, rgba(153,27,27,0.85), rgba(127,29,29,0.55))', color: '#fff', fontWeight: 600 },
  bad: { background: 'rgba(153,27,27,0.45)', color: '#fecaca', fontWeight: 600 },
  good: { background: 'rgba(21,128,61,0.4)', color: '#bbf7d0', fontWeight: 600 },
  phase: { color: '#f0d080', fontWeight: 700 },
  vote: { color: '#86efac' },
  verdict: { color: '#fcd34d' },
  'whisper-notice': { color: '#c4b5fd', fontStyle: 'italic' },
  info: { color: '#a8a29e' },
};

export default function ChatLog({
  messages, players, phase, myId, myRole, isAlive, accusedId, whisperTarget, onClearWhisper, onFocusChange,
}: Props) {
  const [input, setInput] = useState('');
  const [vampChannel, setVampChannel] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const canVampChat = myRole === 'vampire' && isAlive && phase === 'night';

  useEffect(() => { setVampChannel(canVampChat); }, [canVampChat]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  const target = whisperTarget ? players[whisperTarget] : undefined;
  const whisperMode = !!target && WHISPER_PHASES.includes(phase) && isAlive && target.isAlive;

  const channel: 'whisper' | 'vampire' | 'public' =
    whisperMode ? 'whisper' : canVampChat && vampChannel ? 'vampire' : 'public';
  const blockReason = channel === 'public' ? publicBlockReason(phase, isAlive, accusedId === myId) : null;

  function send() {
    const text = input.trim();
    if (!text) return;
    if (channel === 'whisper') socket.emit('chat:whisper', whisperTarget!, text);
    else socket.emit('chat:send', text, channel);
    setInput('');
    stickToBottom.current = true;
  }

  function numberOf(id: string) {
    return players[id]?.number;
  }

  function renderMessage(m: Message) {
    const isPrivate = !!m.recipientId && m.channel === 'system';

    if (m.channel === 'system') {
      const style = KIND_STYLE[m.kind ?? 'info'] ?? KIND_STYLE.info;
      const banded = m.kind === 'death' || m.kind === 'good' || m.kind === 'bad';
      return (
        <div key={m.id} className={`px-2 py-[3px] text-[13px] leading-snug ${banded ? 'rounded-sm my-0.5' : ''}`} style={style}>
          {isPrivate && <span className="mr-1 opacity-80">🔒</span>}
          {m.content}
        </div>
      );
    }

    const n = numberOf(m.senderId);
    const isWhisper = m.channel === 'whisper';
    const isVamp = m.channel === 'vampire';
    const toName = isWhisper && m.recipientId ? players[m.recipientId]?.name : undefined;

    return (
      <div
        key={m.id}
        className="px-2 py-[3px] text-[13.5px] leading-snug break-words"
        style={isWhisper ? { background: 'rgba(91,33,182,0.28)', color: '#e9d5ff' } : isVamp ? { background: 'rgba(127,29,29,0.3)' } : undefined}
      >
        {n !== undefined && (
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] mr-1 rounded-full text-[10px] font-extrabold align-[1px]"
            style={{ background: '#f0d080', color: '#1a120c' }}>{n}</span>
        )}
        <span className="font-bold" style={{ color: isVamp ? '#f87171' : m.senderId === myId ? '#f7e3a8' : '#e7e5e4' }}>
          {m.senderName}
        </span>
        {isWhisper && <span className="opacity-80"> → {toName} (fısıltı)</span>}
        <span className="text-stone-400">: </span>
        <span className={isWhisper ? '' : 'text-stone-100'}>{m.content}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {canVampChat && (
        <div className="flex shrink-0 text-xs border-b border-brass-700/40">
          {[false, true].map(v => (
            <button
              key={String(v)}
              onClick={() => setVampChannel(v)}
              className={`flex-1 py-1.5 font-semibold transition-colors ${vampChannel === v
                ? v ? 'text-red-300 bg-red-950/50' : 'text-brass-300 bg-wood-700/50'
                : 'text-stone-500'}`}
            >
              {v ? '🩸 Vampirler' : '🏘️ Köy'}
            </button>
          ))}
        </div>
      )}

      <div ref={listRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin py-1"
        style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>
        {messages.map(renderMessage)}
      </div>

      <div className="shrink-0 p-1.5 border-t border-brass-700/40" style={{ background: 'rgba(0,0,0,0.3)' }}>
        {whisperMode && (
          <div className="flex items-center gap-2 mb-1 px-1 text-xs text-violet-300">
            <span>🤫 Fısıltı: <b>{target!.number}. {target!.name}</b></span>
            <button onClick={onClearWhisper} className="ml-auto text-stone-400 hover:text-white px-1">✕ İptal</button>
          </div>
        )}
        {blockReason ? (
          <p className="text-center text-xs text-stone-500 py-2">{blockReason}</p>
        ) : (
          <div className="flex gap-1.5">
            <input
              className="flex-1 min-w-0 rounded-md px-3 py-2 text-[15px] text-stone-100 placeholder-stone-500 focus:outline-none"
              style={{
                background: 'rgba(12,7,5,0.8)',
                border: `1px solid ${channel === 'whisper' ? '#7c3aed' : channel === 'vampire' ? '#991b1b' : '#5c4420'}`,
              }}
              placeholder={channel === 'whisper' ? 'Fısılda...' : channel === 'vampire' ? 'Vampirlere yaz...' : 'Mesajını yaz...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              maxLength={whisperMode ? 300 : 500}
              enterKeyHint="send"
              onFocus={() => onFocusChange?.(true)}
              onBlur={() => onFocusChange?.(false)}
            />
            <button className="btn-brass px-3 py-1 text-lg" onClick={send} disabled={!input.trim()} aria-label="Gönder">➤</button>
          </div>
        )}
      </div>
    </div>
  );
}
