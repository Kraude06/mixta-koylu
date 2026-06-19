import { PhaseType } from '@vampir-koylu/shared';

interface Props {
  phase: PhaseType;
}

const STARS = [
  { x: 5,  y: 18 }, { x: 14, y: 38 }, { x: 22, y: 12 }, { x: 32, y: 55 },
  { x: 40, y: 22 }, { x: 48, y: 68 }, { x: 55, y: 9  }, { x: 62, y: 44 },
  { x: 68, y: 26 }, { x: 74, y: 62 }, { x: 80, y: 14 }, { x: 86, y: 48 },
  { x: 91, y: 30 }, { x: 95, y: 70 }, { x: 98, y: 18 },
];

/* Köy + kale silueti — tüm fazlar için ortak alt katman */
function VillageSilhouette({ dark = false }: { dark?: boolean }) {
  const fill = dark ? '#030010' : '#0e1a05';
  const fill2 = dark ? '#040114' : '#0b1604';

  return (
    <g>
      {/* ---- Kale (orta-arka) ---- */}
      {/* Sol kule */}
      <rect x="36%" y="28%" width="6%" height="42%" fill={fill}/>
      <rect x="36%" y="22%" width="1.6%" height="8%" fill={fill}/>
      <rect x="38.3%" y="22%" width="1.6%" height="8%" fill={fill}/>
      <rect x="40.4%" y="22%" width="1.6%" height="8%" fill={fill}/>
      {/* Sağ kule */}
      <rect x="58%" y="28%" width="6%" height="42%" fill={fill}/>
      <rect x="58%" y="22%" width="1.6%" height="8%" fill={fill}/>
      <rect x="60.3%" y="22%" width="1.6%" height="8%" fill={fill}/>
      <rect x="62.4%" y="22%" width="1.6%" height="8%" fill={fill}/>
      {/* Bağlantı duvarları */}
      <rect x="42%" y="46%" width="16%" height="24%" fill={fill}/>
      {/* Ana kule */}
      <rect x="44.5%" y="18%" width="11%" height="52%" fill={fill}/>
      <rect x="44.5%" y="11%" width="2.2%" height="9%" fill={fill}/>
      <rect x="47.3%" y="11%" width="2.2%" height="9%" fill={fill}/>
      <rect x="50.1%" y="11%" width="2.2%" height="9%" fill={fill}/>
      <rect x="52.9%" y="11%" width="2.2%" height="9%" fill={fill}/>
      {/* Sivri kule */}
      <polygon points="50%,4% 48.5%,12% 51.5%,12%" fill={fill}/>
      {/* Pencereler (parlak) */}
      <rect x="47.5%" y="26%" width="2%" height="4%" rx="1%" fill="rgba(255,100,0,0.3)"/>
      <rect x="50.5%" y="26%" width="2%" height="4%" rx="1%" fill="rgba(255,100,0,0.25)"/>
      {/* Kapı kemeri */}
      <rect x="48.5%" y="56%" width="3%" height="14%" fill={dark ? '#020008' : '#0a1402'}/>

      {/* ---- Köy evleri (sağ) ---- */}
      <rect x="68%" y="55%" width="8%" height="30%" fill={fill2}/>
      <polygon points="68%,55% 72%,44% 76%,55%" fill={fill}/>
      <rect x="75%" y="60%" width="6%" height="25%" fill={fill}/>
      <polygon points="75%,60% 78%,51% 81%,60%" fill={fill2}/>
      <rect x="82%" y="52%" width="10%" height="33%" fill={fill2}/>
      <polygon points="82%,52% 87%,40% 92%,52%" fill={fill}/>
      <rect x="91%" y="58%" width="9%" height="27%" fill={fill}/>
      <polygon points="91%,58% 95.5%,48% 100%,58%" fill={fill2}/>

      {/* ---- Köy evleri (sol) ---- */}
      {/* Kilise */}
      <rect x="0%" y="48%" width="7%" height="37%" fill={fill}/>
      <polygon points="0%,48% 3.5%,36% 7%,48%" fill={fill2}/>
      <polygon points="2%,43% 3.5%,31% 5%,43%" fill={fill}/>
      <rect x="8%" y="55%" width="7%" height="30%" fill={fill2}/>
      <polygon points="8%,55% 11.5%,44% 15%,55%" fill={fill}/>
      <rect x="16%" y="58%" width="8%" height="27%" fill={fill}/>
      <polygon points="16%,58% 20%,48% 24%,58%" fill={fill2}/>
      <rect x="25%" y="53%" width="7%" height="32%" fill={fill}/>
      <polygon points="25%,53% 28.5%,42% 32%,53%" fill={fill}/>

      {/* ---- Ağaçlar ---- */}
      {/* Sol taraf */}
      <polygon points="18%,70% 21%,56% 24%,70%" fill={fill}/>
      <polygon points="29%,70% 32.5%,53% 36%,70%" fill={fill2}/>
      {/* Sağ taraf */}
      <polygon points="64%,70% 67%,55% 70%,70%" fill={fill2}/>
      <polygon points="76%,70% 79%,57% 82%,70%" fill={fill}/>
    </g>
  );
}

export default function SkyScene({ phase }: Props) {
  const isDay = phase === 'day' || phase === 'trial' || phase === 'verdict';
  const isNight = phase === 'night' || phase === 'hunter-revenge';

  if (!isDay && !isNight) return null;

  const isHunter = phase === 'hunter-revenge';
  const isTrial = phase === 'trial';
  const isVerdict = phase === 'verdict';

  return (
    <div className="relative w-full overflow-hidden shrink-0" style={{ height: 120 }}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="sky-day" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isTrial ? '#2d1a00' : isVerdict ? '#2d0e00' : '#1e6fa8'}/>
            <stop offset="60%" stopColor={isTrial ? '#7c3a00' : isVerdict ? '#7c2000' : '#6ab4e0'}/>
            <stop offset="100%" stopColor={isTrial ? '#d97706' : isVerdict ? '#c2410c' : '#bae6fd'}/>
          </linearGradient>
          <linearGradient id="sky-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isHunter ? '#1c0000' : '#020617'}/>
            <stop offset="100%" stopColor={isHunter ? '#3d0a00' : '#1e1b4b'}/>
          </linearGradient>
          <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="moon-glow-s" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dde8ff" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Gökyüzü arka plan */}
        <rect width="100" height="100" fill={isDay ? 'url(#sky-day)' : 'url(#sky-night)'}/>

        {/* GECE: Ay + yıldızlar */}
        {isNight && (
          <>
            {/* Ay parıltısı */}
            <circle cx="85" cy="18" r="22" fill="url(#moon-glow-s)"/>
            {/* Ay */}
            <circle cx="85" cy="18" r="10" fill="#e8e0c8"/>
            <circle cx="82" cy="15" r="1.8" fill="#d6cdb0" opacity="0.5"/>
            <circle cx="88" cy="21" r="1.2" fill="#d6cdb0" opacity="0.4"/>

            {/* Yıldızlar */}
            {STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={i % 3 === 0 ? 0.6 : 0.4} fill="white" opacity={0.7}>
                <animate
                  attributeName="opacity"
                  values={`${0.5 + (i%3)*0.15};${0.15};${0.5 + (i%3)*0.15}`}
                  dur={`${2 + (i%5)*0.5}s`}
                  begin={`${(i%4)*0.3}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}

            {/* Yarasalar */}
            <g fill="#0a0525" opacity="0.85">
              <path d="M0,-1 C-1.5,-2.5 -4,-2 -5,-0.5 C-4,1 -1.5,0.5 0,0.8 C1.5,0.5 4,1 5,-0.5 C4,-2 1.5,-2.5 0,-1Z">
                <animateMotion dur="16s" repeatCount="indefinite"
                  path="M20,25 C15,18 30,12 45,22 C60,32 55,18 70,25 C80,30 78,20 72,15 C60,8 40,18 20,25Z"/>
              </path>
              <path d="M0,-0.8 C-1.2,-2 -3.2,-1.6 -4,-0.4 C-3.2,0.8 -1.2,0.4 0,0.6 C1.2,0.4 3.2,0.8 4,-0.4 C3.2,-1.6 1.2,-2 0,-0.8Z">
                <animateMotion dur="22s" begin="5s" repeatCount="indefinite"
                  path="M75,20 C80,12 90,18 95,14 C90,8 75,12 60,20 C45,28 30,18 15,22 C30,28 55,32 75,20Z"/>
              </path>
            </g>
          </>
        )}

        {/* GÜNDÜZ: Güneş + bulutlar */}
        {isDay && (
          <>
            {/* Güneş parıltısı */}
            <circle cx="88" cy="14" r="18" fill="url(#sun-glow)"/>
            {/* Güneş */}
            <circle cx="88" cy="14" r={isTrial || isVerdict ? 7 : 8} fill={isTrial ? '#f97316' : isVerdict ? '#dc2626' : '#fde047'}/>

            {/* Bulutlar */}
            {!isTrial && !isVerdict && (
              <>
                <ellipse cx="20" cy="22" rx="12" ry="5" fill="white" opacity="0.85">
                  <animateTransform attributeName="transform" type="translate" values="0,0;4,0;0,0" dur="20s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="26" cy="18" rx="8" ry="4" fill="white" opacity="0.8">
                  <animateTransform attributeName="transform" type="translate" values="0,0;4,0;0,0" dur="20s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="55" cy="26" rx="10" ry="4.5" fill="white" opacity="0.75">
                  <animateTransform attributeName="transform" type="translate" values="0,0;-5,0;0,0" dur="25s" repeatCount="indefinite"/>
                </ellipse>
              </>
            )}

            {/* Trial/Verdict için dramatik bulutlar */}
            {(isTrial || isVerdict) && (
              <>
                <ellipse cx="20" cy="24" rx="12" ry="4" fill={isTrial ? '#78350f' : '#7f1d1d'} opacity="0.6"/>
                <ellipse cx="50" cy="18" rx="10" ry="3.5" fill={isTrial ? '#92400e' : '#991b1b'} opacity="0.5"/>
              </>
            )}
          </>
        )}

        {/* Köy + kale silueti */}
        <VillageSilhouette dark={isNight}/>

        {/* Zemin */}
        <rect x="0" y="70%" width="100" height="30%" fill={isNight ? '#020010' : '#0e1a05'}/>

        {/* Alt sis katmanı */}
        <rect x="0" y="65%" width="100" height="12%" fill="white" opacity="0.04"/>
      </svg>
    </div>
  );
}
