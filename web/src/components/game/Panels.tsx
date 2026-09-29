import { GraveEntry, Player, ROLE_INFO, RoleType, TeamType } from '@vampir-koylu/shared';
import { ROLE_COLOR } from '../../utils/game';

export interface PlayerAction {
  label: string;
  tone: 'red' | 'gold' | 'violet' | 'green';
  active?: boolean;
  onClick: () => void;
}

const TONE: Record<PlayerAction['tone'], { bg: string; border: string; color: string }> = {
  red: { bg: 'rgba(127,29,29,0.55)', border: '#b91c1c', color: '#fecaca' },
  gold: { bg: 'rgba(92,68,32,0.6)', border: '#b88d3e', color: '#f7e3a8' },
  violet: { bg: 'rgba(76,29,149,0.45)', border: '#7c3aed', color: '#ddd6fe' },
  green: { bg: 'rgba(20,83,45,0.55)', border: '#16a34a', color: '#bbf7d0' },
};

function NumberBadge({ n, dead }: { n: number; dead?: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-full text-[11px] font-extrabold"
      style={{ background: dead ? '#44403c' : '#f0d080', color: dead ? '#a8a29e' : '#1a120c' }}
    >
      {n}
    </span>
  );
}

// ── Oyuncu listesi ───────────────────────────────────────────────────────────

interface PlayerListProps {
  players: Player[];
  myId: string | null;
  votes: Record<string, string | undefined>;
  showVotes: boolean;
  seerResults: Record<string, TeamType>;
  hiddenRoleIds: string[];
  getActions: (p: Player) => PlayerAction[];
  onReadWill: (p: Player) => void;
}

export function PlayerList({ players, myId, votes, showVotes, seerResults, hiddenRoleIds, getActions, onReadWill }: PlayerListProps) {
  const counts: Record<string, number> = {};
  Object.values(votes).forEach(t => { if (t) counts[t] = (counts[t] ?? 0) + 1; });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
      {players.map(p => {
        const dead = !p.isAlive;
        const roleShown = dead && p.role && !hiddenRoleIds.includes(p.id);
        const actions = getActions(p);
        const seer = seerResults[p.id];
        return (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 min-h-[40px]"
            style={{
              background: p.id === myId ? 'rgba(240,208,128,0.08)' : 'rgba(0,0,0,0.22)',
              border: '1px solid rgba(220,180,92,0.12)',
              opacity: dead ? 0.6 : 1,
            }}
          >
            <NumberBadge n={p.number} dead={dead} />
            <button
              className="flex-1 min-w-0 text-left"
              disabled={!dead}
              onClick={() => dead && onReadWill(p)}
            >
              <div className={`truncate text-[14px] font-semibold ${dead ? 'line-through text-stone-400' : p.id === myId ? 'text-brass-200' : 'text-stone-100'}`}>
                {p.name}{p.id === myId && <span className="text-stone-500 font-normal no-underline"> (sen)</span>}
              </div>
              {(roleShown || seer || (p.team === 'vampire' && !dead && p.id !== myId)) && (
                <div className="text-[11px] leading-tight">
                  {roleShown && <span style={{ color: ROLE_COLOR[p.role!] }}>{ROLE_INFO[p.role!].label} · 📜 vasiyet</span>}
                  {!dead && p.team === 'vampire' && p.id !== myId && <span className="text-red-400">🩸 Vampir dostun</span>}
                  {seer && !dead && (
                    <span className={seer === 'vampire' ? 'text-red-400' : 'text-green-400'}>
                      🔮 {seer === 'vampire' ? 'Vampir!' : 'Masum'}
                    </span>
                  )}
                </div>
              )}
            </button>
            {showVotes && counts[p.id] > 0 && (
              <span className="text-xs font-bold text-red-300 shrink-0">{counts[p.id]} oy</span>
            )}
            {actions.map(a => {
              const t = TONE[a.tone];
              return (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className="shrink-0 rounded px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide active:scale-95 transition-transform"
                  style={{
                    background: a.active ? t.border : t.bg,
                    border: `1px solid ${t.border}`,
                    color: a.active ? '#fff' : t.color,
                  }}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Mezarlık ─────────────────────────────────────────────────────────────────

const CAUSE_ICON: Record<GraveEntry['cause'], string> = { killed: '🩸', voted: '⚖️', hunter: '🏹' };

export function Graveyard({ graveyard, players, hiddenRoleIds, onReadWill }: {
  graveyard: GraveEntry[]; players: Record<string, Player>; hiddenRoleIds: string[];
  onReadWill: (p: Player) => void;
}) {
  if (graveyard.length === 0) {
    return <p className="text-center text-stone-500 text-sm py-6 italic">Henüz kimse ölmedi...</p>;
  }
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
      {graveyard.map(g => {
        const p = players[g.playerId];
        if (!p) return null;
        const hidden = hiddenRoleIds.includes(p.id);
        return (
          <button
            key={g.playerId}
            onClick={() => !hidden && onReadWill(p)}
            className="w-full flex items-center gap-2 px-2 py-1 rounded text-left text-[13px] hover:bg-white/5"
          >
            <NumberBadge n={p.number} dead />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-stone-200 truncate">{p.name}</div>
              <div className="truncate text-[11.5px]" style={{ color: hidden || !p.role ? '#78716c' : ROLE_COLOR[p.role] }}>
                {hidden || !p.role ? '?' : ROLE_INFO[p.role].label}
              </div>
            </div>
            <span className="shrink-0 text-[11px] text-stone-500">{CAUSE_ICON[g.cause]} G{g.day}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Rol listesi ──────────────────────────────────────────────────────────────

export function RoleList({ roleList }: { roleList: RoleType[] }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 py-1.5 space-y-0.5 text-[13px]">
      {roleList.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 text-center">{ROLE_INFO[r].icon}</span>
          <span className="font-semibold" style={{ color: ROLE_COLOR[r] }}>{ROLE_INFO[r].label}</span>
          <span className="ml-auto text-[11px] text-stone-500">{r === 'vampire' ? 'Vampir' : 'Köy'}</span>
        </div>
      ))}
    </div>
  );
}

// ── Rolüm kartı ──────────────────────────────────────────────────────────────

export function RolePanel({ role, seerResults, players }: {
  role: RoleType | null; seerResults: Record<string, TeamType>; players: Record<string, Player>;
}) {
  if (!role) return null;
  const info = ROLE_INFO[role];
  const results = Object.entries(seerResults);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 py-2 text-[13px] leading-snug space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-3xl"
          style={{ background: 'radial-gradient(circle at 35% 30%, #f7e3a8, #8a672c)', border: '2px solid #2a1a0e', boxShadow: `0 0 16px ${ROLE_COLOR[role]}55` }}>
          {info.icon}
        </div>
        <div>
          <div className="font-display text-2xl leading-none" style={{ color: ROLE_COLOR[role] }}>{info.label}</div>
          <div className="text-stone-400 text-xs mt-1">
            Takım: <span className={info.team === 'vampire' ? 'text-red-400' : 'text-green-400'}>{info.team === 'vampire' ? 'Vampirler' : 'Köy'}</span>
          </div>
        </div>
      </div>
      <div>
        <div className="text-brass-400 font-semibold text-xs uppercase tracking-wider">Amaç</div>
        <div className="text-stone-200">{info.goal}</div>
      </div>
      <div>
        <div className="text-brass-400 font-semibold text-xs uppercase tracking-wider">Yetenek</div>
        <div className="text-stone-300">{info.description}</div>
      </div>
      {results.length > 0 && (
        <div>
          <div className="text-brass-400 font-semibold text-xs uppercase tracking-wider">Kehanetlerin</div>
          {results.map(([id, team]) => (
            <div key={id} className="text-stone-200">
              {players[id]?.number}. {players[id]?.name ?? '?'} → {' '}
              <span className={team === 'vampire' ? 'text-red-400 font-bold' : 'text-green-400'}>{team === 'vampire' ? 'Vampir' : 'Masum'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
