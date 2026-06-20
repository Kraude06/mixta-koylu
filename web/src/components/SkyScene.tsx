import { PhaseType } from '@vampir-koylu/shared';

interface Props {
  phase: PhaseType;
}

const STARS = [
  { x: '8%',  y: '12%', s: 3 }, { x: '18%', y: '6%',  s: 2.5 }, { x: '30%', y: '9%',  s: 2 },
  { x: '45%', y: '5%',  s: 3 }, { x: '58%', y: '11%', s: 2 },   { x: '72%', y: '7%',  s: 2.5 },
  { x: '85%', y: '14%', s: 2 }, { x: '92%', y: '4%',  s: 3 },   { x: '5%',  y: '22%', s: 2 },
  { x: '38%', y: '18%', s: 2 }, { x: '62%', y: '20%', s: 2.5 }, { x: '78%', y: '22%', s: 2 },
];

export default function SkyScene({ phase }: Props) {
  const isDay   = phase === 'day' || phase === 'trial' || phase === 'verdict';
  const isNight = phase === 'night' || phase === 'hunter-revenge';

  if (!isDay && !isNight) return null;

  const isHunter  = phase === 'hunter-revenge';
  const isTrial   = phase === 'trial';
  const isVerdict = phase === 'verdict';

  /* Faz renk filtresi */
  const phaseOverlay =
    isTrial   ? 'rgba(100, 40, 0, 0.45)'  :
    isVerdict ? 'rgba(110, 15, 15, 0.50)' :
    isHunter  ? 'rgba(80,  0,  0, 0.42)'  : null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Ana arkaplan resmi */}
      <img
        src={isNight ? '/bg-night.jpg' : '/bg-day.jpg'}
        alt=""
        aria-hidden="true"
        className="w-full h-full object-cover object-center"
        style={{ display: 'block' }}
      />

      {/* Faz renk filtresi (trial / verdict / hunter) */}
      {phaseOverlay && (
        <div className="absolute inset-0" style={{ background: phaseOverlay, mixBlendMode: 'multiply' }} />
      )}

      {/* Gece animasyonları: yıldızlar + yarasalar */}
      {isNight && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Titrayan yıldızlar */}
          {STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.x} cy={s.y} r={s.s * 0.38}
              fill={isHunter ? '#ffccaa' : 'white'}
              opacity={0.8}
            >
              <animate
                attributeName="opacity"
                values={`${0.5 + (i % 3) * 0.2};0.1;${0.5 + (i % 3) * 0.2}`}
                dur={`${2 + (i % 5) * 0.7}s`}
                begin={`${(i % 4) * 0.4}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

          {/* Yarasa 1 */}
          <path
            d="M0,-1 C-1.5,-2.5 -4,-2 -5,-0.5 C-4,1 -1.5,0.5 0,0.8 C1.5,0.5 4,1 5,-0.5 C4,-2 1.5,-2.5 0,-1Z"
            fill={isHunter ? '#1a0000' : '#060218'}
            opacity="0.85"
          >
            <animateMotion dur="18s" repeatCount="indefinite"
              path="M15,20 C12,14 28,9 42,18 C56,28 52,14 68,22 C76,28 74,16 68,12 C56,5 36,16 15,20Z" />
          </path>

          {/* Yarasa 2 */}
          <path
            d="M0,-0.8 C-1.2,-2 -3.2,-1.6 -4,-0.4 C-3.2,0.8 -1.2,0.4 0,0.6 C1.2,0.4 3.2,0.8 4,-0.4 C3.2,-1.6 1.2,-2 0,-0.8Z"
            fill={isHunter ? '#1a0000' : '#060218'}
            opacity="0.8"
          >
            <animateMotion dur="25s" begin="7s" repeatCount="indefinite"
              path="M78,18 C84,10 92,16 96,12 C90,6 76,10 62,18 C48,26 34,16 18,20 C32,26 58,30 78,18Z" />
          </path>

          {/* Yarasa 3 (küçük) */}
          <path
            d="M0,-0.6 C-0.9,-1.5 -2.4,-1.2 -3,-0.3 C-2.4,0.6 -0.9,0.3 0,0.45 C0.9,0.3 2.4,0.6 3,-0.3 C2.4,-1.2 0.9,-1.5 0,-0.6Z"
            fill={isHunter ? '#1a0000' : '#060218'}
            opacity="0.7"
          >
            <animateMotion dur="14s" begin="3s" repeatCount="indefinite"
              path="M50,30 C42,22 30,18 20,24 C14,28 18,22 28,16 C40,10 55,14 65,22 C72,28 68,34 50,30Z" />
          </path>
        </svg>
      )}

      {/* Gündüz animasyonları: dramatik fazlar için hafif kıvılcım/parıltı */}
      {(isTrial || isVerdict) && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 60% 30% at 50% 100%, ${
            isTrial ? 'rgba(180,60,0,0.18)' : 'rgba(160,10,10,0.20)'
          } 0%, transparent 70%)`,
        }} />
      )}
    </div>
  );
}
