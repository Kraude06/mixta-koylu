import { PhaseType } from '@vampir-koylu/shared';

interface Props {
  phase: PhaseType;
}

const STARS = [
  { x: 8, y: 15, s: 1.4, d: 0 },
  { x: 15, y: 40, s: 1, d: 0.3 },
  { x: 22, y: 10, s: 1.8, d: 0.8 },
  { x: 30, y: 55, s: 1.2, d: 1.2 },
  { x: 38, y: 20, s: 1, d: 0.5 },
  { x: 45, y: 70, s: 1.6, d: 1.8 },
  { x: 52, y: 8, s: 1.2, d: 0.2 },
  { x: 58, y: 45, s: 1, d: 1.5 },
  { x: 65, y: 25, s: 2, d: 0.7 },
  { x: 70, y: 65, s: 1.2, d: 2.1 },
  { x: 76, y: 12, s: 1.5, d: 0.4 },
  { x: 82, y: 50, s: 1, d: 1.1 },
  { x: 88, y: 30, s: 1.8, d: 0.9 },
  { x: 93, y: 72, s: 1.2, d: 1.7 },
  { x: 97, y: 18, s: 1, d: 0.6 },
];

export default function SkyScene({ phase }: Props) {
  const isDay = phase === 'day';
  const isNight = phase === 'night';
  const isHunter = phase === 'hunter-revenge';

  if (!isDay && !isNight && !isHunter) return null;

  return (
    <div
      className="relative w-full overflow-hidden transition-all duration-1000"
      style={{ height: 110 }}
    >
      {/* Arka plan gradyanı */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: isDay
            ? 'linear-gradient(to bottom, #38bdf8, #bae6fd, #e0f2fe)'
            : isHunter
              ? 'linear-gradient(to bottom, #431407, #7c2d12, #1c0a00)'
              : 'linear-gradient(to bottom, #020617, #0f0f2e, #1e1b4b)',
        }}
      />

      {/* Gündüz */}
      {isDay && (
        <>
          {/* Güneş */}
          <div
            className="absolute"
            style={{
              right: 40, top: 10,
              fontSize: 52,
              filter: 'drop-shadow(0 0 16px #fde047)',
              animation: 'spin 40s linear infinite',
            }}
          >
            ☀️
          </div>
          {/* Bulutlar */}
          <div className="absolute" style={{ left: 20, top: 22, fontSize: 38, opacity: 0.9, animation: 'drift1 18s ease-in-out infinite' }}>☁️</div>
          <div className="absolute" style={{ left: 100, top: 8, fontSize: 28, opacity: 0.75, animation: 'drift2 22s ease-in-out infinite' }}>☁️</div>
          <div className="absolute" style={{ left: 200, top: 38, fontSize: 44, opacity: 0.85, animation: 'drift1 26s ease-in-out infinite reverse' }}>⛅</div>
          <div className="absolute" style={{ left: 320, top: 14, fontSize: 32, opacity: 0.7, animation: 'drift2 20s ease-in-out infinite' }}>☁️</div>
          <div className="absolute" style={{ left: 460, top: 30, fontSize: 36, opacity: 0.8, animation: 'drift1 24s ease-in-out infinite' }}>⛅</div>
          {/* Zemin çizgisi */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ height: 18, background: 'linear-gradient(to top, #166534, #15803d)', borderRadius: '50% 50% 0 0 / 6px 6px 0 0' }}
          />
        </>
      )}

      {/* Gece */}
      {isNight && (
        <>
          {/* Ay */}
          <div
            className="absolute"
            style={{ right: 36, top: 10, fontSize: 44, filter: 'drop-shadow(0 0 12px #818cf8)', animation: 'float 6s ease-in-out infinite' }}
          >
            🌙
          </div>
          {/* Yıldızlar */}
          {STARS.map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.s * 2,
                height: s.s * 2,
                opacity: 0.9,
                animation: `twinkle 2.5s ease-in-out ${s.d}s infinite`,
              }}
            />
          ))}
          {/* Silüet ağaçlar */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end" style={{ height: 40 }}>
            {['🌲', '🌳', '🌲', '🌲', '🌳', '🌲', '🌲', '🌳'].map((t, i) => (
              <span key={i} style={{ fontSize: 28 + (i % 3) * 4, opacity: 0.6, lineHeight: 1, marginBottom: -6 }}>{t}</span>
            ))}
          </div>
        </>
      )}

      {/* Avcı İntikamı */}
      {isHunter && (
        <>
          <div className="absolute" style={{ right: 40, top: 12, fontSize: 44, animation: 'float 3s ease-in-out infinite' }}>🌘</div>
          <div className="absolute" style={{ left: '50%', top: '30%', fontSize: 32, transform: 'translateX(-50%)', animation: 'pulse 1s ease-in-out infinite' }}>🏹</div>
          <div className="absolute bottom-0 left-0 right-0" style={{ height: 14, background: '#1c0a00' }} />
        </>
      )}

      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(18px); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(-14px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.5); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.6; transform: translateX(-50%) scale(1.15); }
        }
      `}</style>
    </div>
  );
}
