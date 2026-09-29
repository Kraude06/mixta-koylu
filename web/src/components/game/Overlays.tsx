import { useEffect, useState } from 'react';
import { Player, ROLE_INFO, RoleType, TeamType } from '@vampir-koylu/shared';
import { ROLE_COLOR } from '../../utils/game';

function Medallion({ role, size = 88 }: { role: RoleType; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center mx-auto"
      style={{
        width: size, height: size, fontSize: size * 0.55,
        background: 'radial-gradient(circle at 35% 30%, #f7e3a8, #b88d3e 60%, #5c4420)',
        border: '3px solid #2a1a0e',
        boxShadow: `0 0 0 3px #dcb45c, 0 0 36px ${ROLE_COLOR[role]}88, 0 8px 20px rgba(0,0,0,.6)`,
        animation: 'medallionIn 0.6s cubic-bezier(0.34,1.5,0.64,1) both',
      }}
    >
      {ROLE_INFO[role].icon}
    </div>
  );
}

// ── Oyun başı: rolünü öğren ──────────────────────────────────────────────────

export function RoleIntro({ role, teammates, onClose }: { role: RoleType; teammates: Player[]; onClose: () => void }) {
  const info = ROLE_INFO[role];
  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-5" onClick={onClose}
      style={{ background: 'rgba(5,2,1,0.85)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s ease-out both' }}>
      <div className="w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
        <p className="narrator-text text-xl mb-4">Rolün belirlendi...</p>
        <Medallion role={role} size={104} />
        <h2 className="font-display text-5xl mt-4" style={{ color: ROLE_COLOR[role], textShadow: '0 2px 0 #000, 0 0 24px #000' }}>{info.label}</h2>
        <p className={`text-sm mt-1 ${info.team === 'vampire' ? 'text-red-400' : 'text-green-400'}`}>
          {info.team === 'vampire' ? '🩸 Vampirler takımı' : '🏡 Köy takımı'}
        </p>
        <div className="parchment rounded-md px-4 py-3 mt-4 text-left text-[14px]" style={{ animation: 'fadeUp 0.4s 0.3s ease-out both' }}>
          <p><b>Amaç:</b> {info.goal}</p>
          <p className="mt-1">{info.description}</p>
          {teammates.length > 0 && (
            <p className="mt-2 font-semibold" style={{ color: '#7f1d1d' }}>
              Vampir dostların: {teammates.map(t => `${t.number}. ${t.name}`).join(', ')}
            </p>
          )}
        </div>
        <button className="btn-brass mt-5 px-8 text-xl" onClick={onClose}>Anladım</button>
      </div>
    </div>
  );
}

// ── Oyun sonu ────────────────────────────────────────────────────────────────

export function GameOver({ winner, reason, myTeam, players, phaseEndTime }: {
  winner: TeamType; reason: string | null; myTeam: TeamType | null; players: Player[]; phaseEndTime: number | null;
}) {
  const [left, setLeft] = useState(15);
  useEffect(() => {
    const tick = () => setLeft(phaseEndTime ? Math.max(0, Math.ceil((phaseEndTime - Date.now()) / 1000)) : 0);
    tick();
    const i = setInterval(tick, 500);
    return () => clearInterval(i);
  }, [phaseEndTime]);

  const won = myTeam === winner;
  const sorted = [...players].sort((a, b) => a.number - b.number);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(5,2,1,0.88)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.4s ease-out both' }}>
      <div className="w-full max-w-sm text-center my-auto">
        <div className="text-7xl" style={{ animation: 'medallionIn 0.6s cubic-bezier(0.34,1.5,0.64,1) both' }}>
          {winner === 'vampire' ? '🧛' : '🏡'}
        </div>
        <h2 className="font-display text-5xl mt-2" style={{ color: winner === 'vampire' ? '#f87171' : '#86efac', textShadow: '0 2px 0 #000, 0 0 30px #000' }}>
          {winner === 'vampire' ? 'Vampirler Kazandı!' : 'Köy Kurtuldu!'}
        </h2>
        {reason && <p className="text-stone-300 text-sm mt-1">{reason}</p>}
        <p className={`font-display text-3xl mt-3 ${won ? 'text-brass-300' : 'text-stone-500'}`}>
          {won ? '🎉 Kazandın!' : '💀 Kaybettin'}
        </p>

        <div className="panel mt-4 text-left">
          <div className="panel-title">Roller</div>
          <div className="p-2 grid grid-cols-1 gap-0.5 max-h-[38vh] overflow-y-auto scrollbar-thin">
            {sorted.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-[13.5px] px-1 py-0.5">
                <span className="w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0"
                  style={{ background: '#f0d080', color: '#1a120c' }}>{p.number}</span>
                <span className={`truncate ${p.team === winner ? 'text-stone-100 font-semibold' : 'text-stone-500'}`}>{p.name}</span>
                {p.role && (
                  <span className="ml-auto shrink-0" style={{ color: ROLE_COLOR[p.role] }}>
                    {ROLE_INFO[p.role].icon} {ROLE_INFO[p.role].label}
                  </span>
                )}
                {!p.isAlive && <span className="shrink-0 text-xs">🪦</span>}
              </div>
            ))}
          </div>
        </div>

        <p className="text-stone-500 text-sm mt-4">{left > 0 ? `${left} saniye sonra lobiye dönülüyor...` : 'Lobi yükleniyor...'}</p>
      </div>
    </div>
  );
}

// ── Vasiyet / ölüm notu düzenleyici ──────────────────────────────────────────

export function ScrollEditor({ title, hint, value, maxLength, variant = 'will', readOnly, onChange, onClose }: {
  title: string; hint: string; value: string; maxLength: number; variant?: 'will' | 'deathNote';
  readOnly?: boolean; onChange: (v: string) => void; onClose: () => void;
}) {
  const isNote = variant === 'deathNote';
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-5" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.6)', animation: 'fadeIn 0.2s ease-out both' }}>
      <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}
        style={{ animation: 'scrollOpen 0.4s cubic-bezier(0.34,1.3,0.64,1) both', transformOrigin: 'top' }}>
        <div className="h-4 rounded-full mx-[-10px]" style={{ background: 'linear-gradient(#b88d3e,#6b4726)', boxShadow: '0 3px 6px rgba(0,0,0,.5)' }} />
        <div className="parchment px-4 py-3" style={isNote ? { filter: 'sepia(0.4) hue-rotate(-25deg) saturate(1.6)' } : undefined}>
          <div className="flex items-center">
            <h3 className="font-display text-2xl flex-1" style={{ color: isNote ? '#7f1d1d' : '#3a2a15' }}>{title}</h3>
            <button onClick={onClose} className="text-2xl leading-none px-2" style={{ color: '#5a4222' }} aria-label="Kapat">✕</button>
          </div>
          <p className="text-[12px] mb-2" style={{ color: '#5a4222' }}>{hint}</p>
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            readOnly={readOnly}
            maxLength={maxLength}
            rows={9}
            className="w-full bg-transparent resize-none focus:outline-none font-hand text-[16px] leading-relaxed"
            style={{
              color: isNote ? '#5c0d0d' : '#2a1d0e',
              backgroundImage: 'repeating-linear-gradient(transparent 0 27px, rgba(90,66,34,0.25) 27px 28px)',
              lineHeight: '28px',
            }}
            placeholder={isNote ? 'Kurbanın yanına bırakılacak not...' : 'G1: ...\nG2: ...'}
          />
          <div className="text-right text-[11px]" style={{ color: '#5a4222' }}>{value.length}/{maxLength}</div>
        </div>
        <div className="h-4 rounded-full mx-[-10px]" style={{ background: 'linear-gradient(#b88d3e,#6b4726)', boxShadow: '0 3px 6px rgba(0,0,0,.5)' }} />
      </div>
    </div>
  );
}
