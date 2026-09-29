import { memo, useEffect, useRef, useState } from 'react';
import { Player, PhaseType, TeamType, ROLE_INFO } from '@vampir-koylu/shared';
import { cloakColor, shortName, isNightPhase, COURT_PHASES, ROLE_COLOR } from '../../utils/game';

// Sahne koordinatları (viewBox). Mobilde tam genişliğe ölçeklenir.
const W = 360;
const H = 320;
const CX = W / 2;
const CY = H / 2;
const PLAZA_R = 80;

/** Kalabalık odalarda isimler üst üste binmesin diye halka oyuncu sayısıyla büyür */
function ringRadius(count: number): number {
  return 114 + Math.max(0, count - 10) * 6;
}

/** Sahnenin her yöne taşan arka planı (geniş/uzun ekranlarda görünür) */
const BG = { x: -700, y: -700, width: W + 1400, height: H + 1400 };

/**
 * Her zaman görünmesi gereken alan: oyuncu halkası + isim etiketleri.
 * Kutunun en-boy oranı ne olursa olsun bu alan tamamen sığar; artan yer manzarayla dolar.
 */
function useViewBox(ref: React.RefObject<HTMLDivElement>, ringR: number) {
  const safeW = (ringR + 51) * 2;
  const safeH = (ringR + 54) * 2;
  const safeCY = CY + 5; // isimler jetonların altında olduğu için alan biraz aşağı kayık
  const [aspect, setAspect] = useState(safeW / safeH);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setAspect(width / height);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  let vw = safeW;
  let vh = safeH;
  if (aspect > safeW / safeH) vw = safeH * aspect;
  else vh = safeW / aspect;
  return `${CX - vw / 2} ${safeCY - vh / 2} ${vw} ${vh}`;
}

interface Props {
  players: Player[];
  myId: string | null;
  phase: PhaseType;
  votes: Record<string, string | undefined>;
  myVote?: string;
  nightTarget?: string;
  accusedId: string | null;
  /** Sinematik sırasında spot ışığı altındaki oyuncu */
  spotlightId: string | null;
  seerResults: Record<string, TeamType>;
  hiddenRoleIds: string[];
  canTarget: (playerId: string) => boolean;
  onPlayerClick: (playerId: string) => void;
}

function ringPos(index: number, total: number, r: number) {
  // İlk oyuncu en üstte, saat yönünde dizilir
  const a = (-Math.PI / 2) + (index / Math.max(total, 1)) * Math.PI * 2;
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
}

const HOUSES = Array.from({ length: 12 }, (_, i) => {
  const deg = i * 30 + 15;
  const a = (deg * Math.PI) / 180;
  const r = 168 + (i % 3) * 8;
  return {
    x: CX + Math.cos(a) * r,
    y: CY + Math.sin(a) * r,
    rot: deg + 90,
    w: 46 + (i % 2) * 10,
    h: 30 + (i % 3) * 4,
    roof: ['#4a3228', '#3b3f4a', '#5e3a22', '#35302a'][i % 4],
    windows: i % 2 === 0,
  };
});

// Dış halka: geniş ekranlarda görünen ikinci sıra evler
const OUTER_HOUSES = Array.from({ length: 18 }, (_, i) => {
  const deg = i * 20 + 5;
  const a = (deg * Math.PI) / 180;
  const r = 262 + (i % 4) * 14;
  return {
    x: CX + Math.cos(a) * r,
    y: CY + Math.sin(a) * r,
    rot: deg + 90,
    w: 44 + (i % 3) * 8,
    h: 28 + (i % 2) * 6,
    roof: ['#3b3f4a', '#4a3228', '#35302a', '#5e3a22'][i % 4],
    windows: i % 3 !== 0,
  };
});

const TREES = [
  { x: 22, y: 30, r: 16 }, { x: 340, y: 26, r: 14 }, { x: 18, y: 292, r: 15 },
  { x: 344, y: 296, r: 17 }, { x: 60, y: 8, r: 11 }, { x: 300, y: 312, r: 12 },
  // Dış bölge
  { x: -60, y: 90, r: 18 }, { x: -40, y: 230, r: 15 }, { x: 420, y: 100, r: 17 },
  { x: 410, y: 250, r: 19 }, { x: -110, y: 170, r: 14 }, { x: 470, y: 175, r: 15 },
  { x: 120, y: -70, r: 16 }, { x: 250, y: 395, r: 17 }, { x: 60, y: 380, r: 14 }, { x: 300, y: -60, r: 13 },
];

function Scenery({ night }: { night: boolean }) {
  return (
    <>
      <defs>
        <radialGradient id="ts-grass" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={420}>
          <stop offset="0%" stopColor="#4a5e34" />
          <stop offset="100%" stopColor="#253219" />
        </radialGradient>
        <pattern id="ts-cobble" width="12" height="10" patternUnits="userSpaceOnUse">
          <rect width="12" height="10" fill="#6b6259" />
          <path d="M0 5h12M6 0v5M0 10M3 5v5M9 5v5" stroke="#4d463f" strokeWidth="1" />
        </pattern>
      </defs>

      <rect {...BG} fill="url(#ts-grass)" />

      {/* Meydandan çıkan patikalar */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={CX} y1={CY}
            x2={CX + Math.cos(a) * 800} y2={CY + Math.sin(a) * 800}
            stroke="#5a5048" strokeWidth={i % 3 === 0 ? 16 : 10} strokeLinecap="round" opacity={0.85}
          />
        );
      })}

      {/* Evler — yukarıdan görünüm: çatı sırtı ortada */}
      {[...OUTER_HOUSES, ...HOUSES].map((h, i) => (
        <g key={i} transform={`translate(${h.x} ${h.y}) rotate(${h.rot})`}>
          <rect x={-h.w / 2 + 3} y={-h.h / 2 + 4} width={h.w} height={h.h} fill="#000" opacity={0.35} rx={2} />
          <rect x={-h.w / 2} y={-h.h / 2} width={h.w} height={h.h} fill={h.roof} stroke="#1a120c" strokeWidth={1.5} rx={2} />
          <line x1={-h.w / 2} y1={0} x2={h.w / 2} y2={0} stroke="#1a120c" strokeWidth={1.5} />
          <rect x={-h.w / 2} y={-h.h / 2} width={h.w} height={h.h / 2} fill="#fff" opacity={0.06} />
          {/* Baca */}
          <rect x={h.w / 2 - 12} y={-h.h / 2 + 3} width={6} height={6} fill="#2a2320" />
          {night && h.windows && (
            <>
              <rect x={-h.w / 2 + 6} y={h.h / 2 - 3} width={5} height={3} fill="#ffcf6b" />
              <rect x={h.w / 2 - 11} y={h.h / 2 - 3} width={5} height={3} fill="#ffcf6b" />
            </>
          )}
        </g>
      ))}

      {TREES.map((t, i) => (
        <g key={i}>
          <circle cx={t.x + 3} cy={t.y + 4} r={t.r} fill="#000" opacity={0.3} />
          <circle cx={t.x} cy={t.y} r={t.r} fill="#1f3318" />
          <circle cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.3} r={t.r * 0.55} fill="#2d4722" />
        </g>
      ))}

      {/* Meydan */}
      <circle cx={CX} cy={CY} r={PLAZA_R + 26} fill="#4d463f" opacity={0.9} />
      <circle cx={CX} cy={CY} r={PLAZA_R + 22} fill="url(#ts-cobble)" />
      <circle cx={CX} cy={CY} r={PLAZA_R + 22} fill="none" stroke="#2e2924" strokeWidth={3} />
      <circle cx={CX} cy={CY} r={PLAZA_R - 30} fill="none" stroke="#4d463f" strokeWidth={2} strokeDasharray="4 3" />
    </>
  );
}

/** Ortadaki ahşap kürsü; infaz fazlarında darağacı belirir */
function Platform({ gallows }: { gallows: boolean }) {
  return (
    <g>
      <rect x={CX - 30} y={CY - 22} width={60} height={44} fill="#000" opacity={0.35} transform="translate(3 4)" />
      <rect x={CX - 30} y={CY - 22} width={60} height={44} fill="#5c3d22" stroke="#2a1a0e" strokeWidth={2} />
      {[-15, 0, 15].map(dy => (
        <line key={dy} x1={CX - 30} y1={CY + dy} x2={CX + 30} y2={CY + dy} stroke="#3e2815" strokeWidth={1} />
      ))}
      {gallows && (
        <g>
          <rect x={CX + 22} y={CY - 40} width={6} height={62} fill="#3a2414" stroke="#1a0f08" />
          <rect x={CX - 14} y={CY - 42} width={42} height={6} fill="#3a2414" stroke="#1a0f08" />
          <g style={{ transformOrigin: `${CX - 6}px ${CY - 36}px`, animation: 'swing 2.6s ease-in-out infinite' }}>
            <line x1={CX - 6} y1={CY - 36} x2={CX - 6} y2={CY - 22} stroke="#c9a66b" strokeWidth={1.5} />
            <circle cx={CX - 6} cy={CY - 19} r={3.5} fill="none" stroke="#c9a66b" strokeWidth={1.5} />
          </g>
        </g>
      )}
    </g>
  );
}

interface TokenProps {
  player: Player;
  isMe: boolean;
  voteCount: number;
  selected: boolean;
  clickable: boolean;
  roleHidden: boolean;
  seer?: TeamType;
  showTeammate: boolean;
  onClick: () => void;
}

function Token({ player, isMe, voteCount, selected, clickable, roleHidden, seer, showTeammate, onClick }: TokenProps) {
  const cloak = cloakColor(player.name);
  const dead = !player.isAlive;
  const roleShown = dead && player.role && !roleHidden;

  return (
    <g
      onClick={onClick}
      style={{ cursor: clickable || dead ? 'pointer' : 'default' }}
      role={clickable ? 'button' : undefined}
      aria-label={`${player.number}. ${player.name}`}
    >
      {/* Geniş dokunma alanı (mobil) */}
      <circle r={22} fill="transparent" />

      {dead ? (
        <g>
          <ellipse cx={2} cy={12} rx={11} ry={3.5} fill="#000" opacity={0.35} />
          <path d="M-9 12 V-4 A9 9 0 0 1 9 -4 V12 Z" fill="#6b6b6b" stroke="#2e2e2e" strokeWidth={1.5} />
          <path d="M-9 12 V-4 A9 9 0 0 1 0 -13" fill="none" stroke="#8a8a8a" strokeWidth={1} />
          <text y={3} textAnchor="middle" fontSize={6} fontWeight={700} fill="#2e2e2e">RIP</text>
        </g>
      ) : (
        <g style={{ animation: selected ? 'tokenBob 1.2s ease-in-out infinite' : undefined }}>
          <ellipse cx={2} cy={12} rx={12} ry={4} fill="#000" opacity={0.4} />
          {selected && (
            <circle r={17} fill="none" stroke="#f87171" strokeWidth={2} style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseRing 1.2s ease-out infinite' }} />
          )}
          <circle
            r={14}
            fill={cloak}
            stroke={isMe ? '#f0d080' : showTeammate ? '#ef4444' : '#140c07'}
            strokeWidth={isMe || showTeammate ? 2.5 : 1.5}
          />
          {/* Kapüşon + yüz (yukarıdan görünüm) */}
          <circle cy={-2} r={8} fill="#000" opacity={0.25} />
          <circle cy={-3} r={6.5} fill="#e7c9a0" />
          <path d="M-7 -4 A7 7 0 0 1 7 -4 L5 -8 A6 6 0 0 0 -5 -8 Z" fill={cloak} opacity={0.9} />
          {showTeammate && <text x={0} y={11} textAnchor="middle" fontSize={7}>🩸</text>}
        </g>
      )}

      {/* Numara rozeti */}
      <g transform="translate(-14 -13)">
        <circle r={6.5} fill={dead ? '#3a3a3a' : '#f0d080'} stroke="#1a120c" strokeWidth={1} />
        <text y={2.6} textAnchor="middle" fontSize={7.5} fontWeight={800} fill="#1a120c">{player.number}</text>
      </g>

      {/* Oy sayısı */}
      {voteCount > 0 && (
        <g transform="translate(14 -13)">
          <circle r={7} fill="#b91c1c" stroke="#fecaca" strokeWidth={1} />
          <text y={3} textAnchor="middle" fontSize={8} fontWeight={800} fill="#fff">{voteCount}</text>
        </g>
      )}

      {/* Kahin sonucu */}
      {seer && !dead && (
        <g transform="translate(14 10)">
          <circle r={5.5} fill={seer === 'vampire' ? '#7f1d1d' : '#14532d'} stroke="#000" strokeWidth={0.8} />
          <text y={2.2} textAnchor="middle" fontSize={6} fill="#fff">{seer === 'vampire' ? '!' : '✓'}</text>
        </g>
      )}

      {/* İsim */}
      <text
        y={26}
        textAnchor="middle"
        fontSize={9}
        fontWeight={700}
        fill={isMe ? '#f7e3a8' : dead ? '#9ca3af' : '#f3f4f6'}
        stroke="#000" strokeWidth={2.6} paintOrder="stroke"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {shortName(player.name, 11)}
      </text>
      {roleShown && (
        <text
          y={35}
          textAnchor="middle"
          fontSize={7.5}
          fontWeight={700}
          fill={ROLE_COLOR[player.role!]}
          stroke="#000" strokeWidth={2.2} paintOrder="stroke"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          {ROLE_INFO[player.role!].label}
        </text>
      )}
    </g>
  );
}

function TownSquare({
  players, myId, phase, votes, myVote, nightTarget, accusedId, spotlightId,
  seerResults, hiddenRoleIds, canTarget, onPlayerClick,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const ringR = ringRadius(players.length);
  const viewBox = useViewBox(boxRef, ringR);
  const night = isNightPhase(phase);
  const inCourt = COURT_PHASES.includes(phase) && !!accusedId;
  const gallows = phase === 'last-words' || phase === 'execution';
  const me = players.find(p => p.id === myId);
  const iAmVampire = me?.team === 'vampire';

  const voteCounts: Record<string, number> = {};
  Object.values(votes).forEach(t => { if (t) voteCounts[t] = (voteCounts[t] ?? 0) + 1; });

  const positions = new Map(players.map((p, i) => [p.id, ringPos(i, players.length, ringR)]));
  const posOf = (id: string) => (inCourt && id === accusedId ? { x: CX, y: CY - 2 } : positions.get(id)!);
  const spot = spotlightId && positions.has(spotlightId) ? posOf(spotlightId) : null;

  return (
    <div ref={boxRef} className="relative w-full h-full overflow-hidden">
    <svg
      viewBox={viewBox}
      className="absolute inset-0 w-full h-full block select-none"
      preserveAspectRatio="xMidYMid meet"
      style={{ touchAction: 'manipulation' }}
    >
      <Scenery night={night} />
      <Platform gallows={gallows} />

      {/* Gece örtüsü */}
      <rect {...BG} fill="#0a1638" style={{ opacity: night ? 0.62 : 0, transition: 'opacity 1.2s ease' }} pointerEvents="none" />
      {/* Gündüz sıcak ışık */}
      <rect {...BG} fill="#ffb347" style={{ opacity: night ? 0 : 0.07, transition: 'opacity 1.2s ease' }} pointerEvents="none" />
      {/* Yargılama sırasında kırmızımsı ton */}
      <rect {...BG} fill="#5a0a0a" style={{ opacity: inCourt ? 0.22 : 0, transition: 'opacity 0.8s ease' }} pointerEvents="none" />

      {players.map(p => {
        const pos = posOf(p.id);
        const isMe = p.id === myId;
        return (
          <g
            key={p.id}
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px)`,
              transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Token
              player={p}
              isMe={isMe}
              voteCount={phase === 'voting' ? (voteCounts[p.id] ?? 0) : 0}
              selected={p.id === myVote || p.id === nightTarget}
              clickable={canTarget(p.id)}
              roleHidden={hiddenRoleIds.includes(p.id)}
              seer={seerResults[p.id]}
              showTeammate={iAmVampire && !isMe && p.team === 'vampire' && p.isAlive}
              onClick={() => onPlayerClick(p.id)}
            />
          </g>
        );
      })}


      {/* Spot ışığı: her yer kararır, sadece ölen oyuncu aydınlanır */}
      <defs>
        <filter id="ts-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <mask id="ts-spot" maskUnits="userSpaceOnUse" {...BG}>
          <rect {...BG} fill="white" />
          {spot && <circle cx={spot.x} cy={spot.y + 6} r={40} fill="black" filter="url(#ts-blur)" />}
        </mask>
      </defs>
      <rect
        {...BG} fill="#000" mask="url(#ts-spot)" pointerEvents="none"
        style={{ opacity: spot ? 0.78 : 0, transition: 'opacity 0.6s ease' }}
      />
    </svg>
    {/* Kenar kararması */}
    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.7) 100%)' }} />
    </div>
  );
}

export default memo(TownSquare);
