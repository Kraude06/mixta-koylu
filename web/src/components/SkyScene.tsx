import { PhaseType } from '@vampir-koylu/shared';

interface Props {
  phase: PhaseType;
}

const STARS = [
  { x: 5,  y: 18, r: 0.6 }, { x: 14, y: 38, r: 0.35 }, { x: 22, y: 12, r: 0.5 },
  { x: 32, y: 55, r: 0.4 }, { x: 40, y: 22, r: 0.65 }, { x: 48, y: 68, r: 0.3 },
  { x: 55, y: 9,  r: 0.55 }, { x: 62, y: 44, r: 0.4 }, { x: 68, y: 26, r: 0.5 },
  { x: 74, y: 62, r: 0.35 }, { x: 80, y: 14, r: 0.6 }, { x: 86, y: 48, r: 0.4 },
  { x: 91, y: 30, r: 0.5 }, { x: 95, y: 70, r: 0.35 }, { x: 98, y: 18, r: 0.55 },
  { x: 10, y: 52, r: 0.3 }, { x: 28, y: 8,  r: 0.45 }, { x: 44, y: 40, r: 0.35 },
  { x: 60, y: 16, r: 0.5 }, { x: 77, y: 35, r: 0.4 },
];

function VillageSilhouette({ dark = false }: { dark?: boolean }) {
  const fill  = dark ? '#030010' : '#0d1904';
  const fill2 = dark ? '#040114' : '#0b1602';

  return (
    <g>
      {/* Kale — sol kule */}
      <rect x="36%" y="28%" width="6%" height="42%" fill={fill}/>
      <rect x="36%" y="22%" width="1.6%" height="8%" fill={fill}/>
      <rect x="38.3%" y="22%" width="1.6%" height="8%" fill={fill}/>
      <rect x="40.4%" y="22%" width="1.6%" height="8%" fill={fill}/>
      {/* Kale — sağ kule */}
      <rect x="58%" y="28%" width="6%" height="42%" fill={fill}/>
      <rect x="58%" y="22%" width="1.6%" height="8%" fill={fill}/>
      <rect x="60.3%" y="22%" width="1.6%" height="8%" fill={fill}/>
      <rect x="62.4%" y="22%" width="1.6%" height="8%" fill={fill}/>
      {/* Bağlantı duvarı */}
      <rect x="42%" y="46%" width="16%" height="24%" fill={fill}/>
      {/* Ana kule */}
      <rect x="44.5%" y="18%" width="11%" height="52%" fill={fill}/>
      <rect x="44.5%" y="11%" width="2.2%" height="9%" fill={fill}/>
      <rect x="47.3%" y="11%" width="2.2%" height="9%" fill={fill}/>
      <rect x="50.1%" y="11%" width="2.2%" height="9%" fill={fill}/>
      <rect x="52.9%" y="11%" width="2.2%" height="9%" fill={fill}/>
      <polygon points="50%,4% 48.5%,12% 51.5%,12%" fill={fill}/>
      {/* Pencereler — turuncu ışık */}
      <rect x="47.5%" y="26%" width="2%" height="3.5%" rx="1%" fill={dark ? 'rgba(255,120,0,0.22)' : 'rgba(255,220,80,0.18)'}/>
      <rect x="50.5%" y="26%" width="2%" height="3.5%" rx="1%" fill={dark ? 'rgba(255,100,0,0.18)' : 'rgba(255,220,80,0.14)'}/>
      <rect x="48.5%" y="56%" width="3%" height="14%" fill={dark ? '#020008' : '#0a1402'}/>

      {/* Köy evleri — sağ */}
      <rect x="68%" y="55%" width="8%" height="30%" fill={fill2}/>
      <polygon points="68%,55% 72%,44% 76%,55%" fill={fill}/>
      <rect x="75%" y="60%" width="6%" height="25%" fill={fill}/>
      <polygon points="75%,60% 78%,51% 81%,60%" fill={fill2}/>
      <rect x="82%" y="52%" width="10%" height="33%" fill={fill2}/>
      <polygon points="82%,52% 87%,40% 92%,52%" fill={fill}/>
      <rect x="91%" y="58%" width="9%" height="27%" fill={fill}/>
      <polygon points="91%,58% 95.5%,48% 100%,58%" fill={fill2}/>
      {/* Pencere — sağ köy */}
      <rect x="70.5%" y="60%" width="2%" height="3%" rx="0.5%" fill={dark ? 'rgba(255,140,0,0.2)' : 'rgba(255,230,100,0.15)'}/>
      <rect x="84%" y="58%" width="2%" height="3%" rx="0.5%" fill={dark ? 'rgba(255,120,0,0.18)' : 'rgba(255,230,100,0.12)'}/>

      {/* Köy evleri — sol (kilise dahil) */}
      <rect x="0%" y="48%" width="7%" height="37%" fill={fill}/>
      <polygon points="0%,48% 3.5%,36% 7%,48%" fill={fill2}/>
      <polygon points="2%,43% 3.5%,31% 5%,43%" fill={fill}/>
      <rect x="8%" y="55%" width="7%" height="30%" fill={fill2}/>
      <polygon points="8%,55% 11.5%,44% 15%,55%" fill={fill}/>
      <rect x="16%" y="58%" width="8%" height="27%" fill={fill}/>
      <polygon points="16%,58% 20%,48% 24%,58%" fill={fill2}/>
      <rect x="25%" y="53%" width="7%" height="32%" fill={fill}/>
      <polygon points="25%,53% 28.5%,42% 32%,53%" fill={fill}/>
      {/* Pencere — sol köy */}
      <rect x="10%" y="60%" width="2%" height="3%" rx="0.5%" fill={dark ? 'rgba(255,140,0,0.2)' : 'rgba(255,230,100,0.15)'}/>

      {/* Ağaçlar */}
      <polygon points="18%,70% 21%,56% 24%,70%" fill={fill}/>
      <polygon points="29%,70% 32.5%,53% 36%,70%" fill={fill2}/>
      <polygon points="64%,70% 67%,55% 70%,70%" fill={fill2}/>
      <polygon points="76%,70% 79%,57% 82%,70%" fill={fill}/>
    </g>
  );
}

export default function SkyScene({ phase }: Props) {
  const isDay    = phase === 'day' || phase === 'trial' || phase === 'verdict';
  const isNight  = phase === 'night' || phase === 'hunter-revenge';

  if (!isDay && !isNight) return null;

  const isHunter  = phase === 'hunter-revenge';
  const isTrial   = phase === 'trial';
  const isVerdict = phase === 'verdict';

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', position: 'absolute', inset: 0 }}
    >
      <defs>
        {/* Gökyüzü gradyanları */}
        <linearGradient id="sky-day" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={isTrial ? '#2d1400' : isVerdict ? '#2a0800' : '#0e4a7a'}/>
          <stop offset="40%"  stopColor={isTrial ? '#7c3a00' : isVerdict ? '#7c1800' : '#2a7fb5'}/>
          <stop offset="75%"  stopColor={isTrial ? '#c26000' : isVerdict ? '#b02800' : '#72bde0'}/>
          <stop offset="100%" stopColor={isTrial ? '#e8870a' : isVerdict ? '#d03c10' : '#b8e4f8'}/>
        </linearGradient>
        <linearGradient id="sky-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={isHunter ? '#150002' : '#010410'}/>
          <stop offset="45%"  stopColor={isHunter ? '#260008' : '#080520'}/>
          <stop offset="100%" stopColor={isHunter ? '#3d0a00' : '#16143a'}/>
        </linearGradient>

        {/* Güneş parıltısı */}
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={isTrial ? '#f97316' : isVerdict ? '#ef4444' : '#fff4a0'} stopOpacity="0.85"/>
          <stop offset="30%"  stopColor={isTrial ? '#f97316' : isVerdict ? '#ef4444' : '#fde047'} stopOpacity="0.45"/>
          <stop offset="65%"  stopColor={isTrial ? '#c2410c' : isVerdict ? '#b91c1c' : '#fb923c'} stopOpacity="0.18"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        {/* Gökyüzü aydınlığı — güneşin çevresindeki gökyüzü açılır */}
        <radialGradient id="sky-sun-bright" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={isTrial ? '#7c3200' : isVerdict ? '#7c1000' : '#bae6fd'} stopOpacity="0.55"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={isHunter ? '#ff4400' : '#c8d8ff'} stopOpacity={isHunter ? '0.5' : '0.38'}/>
          <stop offset="55%"  stopColor={isHunter ? '#881100' : '#8899cc'} stopOpacity="0.15"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>

        {/* Sis filtresi */}
        <filter id="fog-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.8"/>
        </filter>
        {/* Parlama filtresi */}
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Güçlü güneş parıltısı */}
        <filter id="sun-filter" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Gökyüzü arka planı */}
      <rect width="100" height="100" fill={isDay ? 'url(#sky-day)' : 'url(#sky-night)'}/>

      {/* ── GECE ── */}
      {isNight && (
        <>
          {/* Bulutumsu nebula lekesi */}
          <ellipse cx="25" cy="30" rx="20" ry="8" fill={isHunter ? '#330008' : '#0d1240'} opacity="0.55" filter="url(#fog-blur)"/>
          <ellipse cx="70" cy="20" rx="15" ry="6" fill={isHunter ? '#280006' : '#0a0e30'} opacity="0.45" filter="url(#fog-blur)"/>

          {/* Ay parıltı hâlesi */}
          <circle cx="83" cy="17" r="24" fill="url(#moon-glow)"/>
          {/* Ay */}
          <circle cx="83" cy="17" r="9.5" fill={isHunter ? '#cc4422' : '#e8e0c8'} filter="url(#glow)"/>
          {/* Ay'ın gölge yarısı (hilal görünümü) */}
          <circle cx="80" cy="14" r="8.5" fill={isHunter ? '#1c0005' : '#090820'} opacity="0.82"/>
          {/* Krater detayları */}
          {!isHunter && (
            <>
              <circle cx="87" cy="21" r="1.4" fill="#d0c8a8" opacity="0.35"/>
              <circle cx="84" cy="13" r="0.9" fill="#d0c8a8" opacity="0.28"/>
            </>
          )}

          {/* Yıldızlar */}
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={isHunter ? '#ffbbaa' : 'white'} opacity={0.75}>
              <animate
                attributeName="opacity"
                values={`${0.4 + (i%4)*0.15};${0.1};${0.4 + (i%4)*0.15}`}
                dur={`${2.2 + (i%5)*0.6}s`}
                begin={`${(i%5)*0.4}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

          {/* Yarasalar */}
          <g fill={isHunter ? '#1a0000' : '#0a0525'} opacity="0.9">
            <path d="M0,-1 C-1.5,-2.5 -4,-2 -5,-0.5 C-4,1 -1.5,0.5 0,0.8 C1.5,0.5 4,1 5,-0.5 C4,-2 1.5,-2.5 0,-1Z">
              <animateMotion dur="17s" repeatCount="indefinite"
                path="M20,25 C15,18 30,12 45,22 C60,32 55,18 70,25 C80,30 78,20 72,15 C60,8 40,18 20,25Z"/>
            </path>
            <path d="M0,-0.8 C-1.2,-2 -3.2,-1.6 -4,-0.4 C-3.2,0.8 -1.2,0.4 0,0.6 C1.2,0.4 3.2,0.8 4,-0.4 C3.2,-1.6 1.2,-2 0,-0.8Z">
              <animateMotion dur="23s" begin="6s" repeatCount="indefinite"
                path="M75,20 C80,12 90,18 95,14 C90,8 75,12 60,20 C45,28 30,18 15,22 C30,28 55,32 75,20Z"/>
            </path>
          </g>

          {/* Zemin sis katmanı */}
          <rect x="0" y="66%" width="100" height="8%" fill={isHunter ? '#1a0000' : '#0c0828'} opacity="0.40" filter="url(#fog-blur)"/>
          <rect x="0" y="69%" width="100" height="6%" fill={isHunter ? '#220000' : '#080620'} opacity="0.55" filter="url(#fog-blur)"/>
        </>
      )}

      {/* ── GÜNDÜZ ── */}
      {isDay && (
        <>
          {/* Güneş konumu: sağ üst, görünür alanda */}
          {(() => {
            const sx = isTrial ? 82 : isVerdict ? 82 : 80;
            const sy = isTrial ? 28 : isVerdict ? 28 : 26;
            const sr = isTrial ? 8 : isVerdict ? 8 : 11;
            const sunColor = isTrial ? '#f97316' : isVerdict ? '#dc2626' : '#fef08a';
            const rayColor = isTrial ? '#fb923c' : isVerdict ? '#f87171' : '#fde047';
            return (
              <>
                {/* Gökyüzü aydınlığı (güneşin çevresi) */}
                <circle cx={sx} cy={sy} r="50" fill="url(#sky-sun-bright)"/>

                {/* Normal gündüz: dönen uzun ışınlar (SVG animateTransform ile) */}
                {!isTrial && !isVerdict && (
                  <g opacity="0.36">
                    <g>
                      {[0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5].map((a, i) => {
                        const r1 = sr + 3, r2 = sr + 12 + (i%3)*5;
                        const rad = a * Math.PI / 180;
                        return (
                          <line key={i}
                            x1={sx + Math.cos(rad)*r1} y1={sy + Math.sin(rad)*r1}
                            x2={sx + Math.cos(rad)*r2} y2={sy + Math.sin(rad)*r2}
                            stroke={rayColor} strokeWidth={i%2===0 ? 0.65 : 0.38}/>
                        );
                      })}
                      <animateTransform attributeName="transform" type="rotate"
                        from={`0 ${sx} ${sy}`} to={`360 ${sx} ${sy}`}
                        dur="48s" repeatCount="indefinite"/>
                    </g>
                  </g>
                )}

                {/* Büyük parıltı hâlesi */}
                <circle cx={sx} cy={sy} r={sr + 22} fill="url(#sun-glow)" opacity="0.9"/>
                <circle cx={sx} cy={sy} r={sr + 10} fill="url(#sun-glow)" opacity="0.6"/>

                {/* Güneş diski */}
                <circle cx={sx} cy={sy} r={sr} fill={sunColor} filter="url(#sun-filter)"/>

                {/* İç parlak merkez */}
                <circle cx={sx} cy={sy} r={sr * 0.55} fill="white" opacity="0.45"/>

                {/* Trial/Verdict: kısa sert ışınlar */}
                {(isTrial || isVerdict) && (
                  <g stroke={rayColor} strokeWidth="0.5" opacity="0.35">
                    {[0,45,90,135,180,225,270,315].map((a, i) => {
                      const r1 = sr + 2, r2 = sr + 9;
                      const rad = a * Math.PI / 180;
                      return <line key={i}
                        x1={sx + Math.cos(rad)*r1} y1={sy + Math.sin(rad)*r1}
                        x2={sx + Math.cos(rad)*r2} y2={sy + Math.sin(rad)*r2}/>;
                    })}
                  </g>
                )}
              </>
            );
          })()}

          {/* Bulutlar — normal gündüz */}
          {!isTrial && !isVerdict && (
            <>
              <g opacity="0.82" filter="url(#fog-blur)">
                <ellipse cx="18" cy="30" rx="14" ry="6" fill="white">
                  <animateTransform attributeName="transform" type="translate" values="0,0;6,0;0,0" dur="24s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="25" cy="25" rx="10" ry="5" fill="white">
                  <animateTransform attributeName="transform" type="translate" values="0,0;6,0;0,0" dur="24s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="12" cy="26" rx="7" ry="4" fill="#f0f8ff">
                  <animateTransform attributeName="transform" type="translate" values="0,0;6,0;0,0" dur="24s" repeatCount="indefinite"/>
                </ellipse>
              </g>
              <g opacity="0.72" filter="url(#fog-blur)">
                <ellipse cx="52" cy="34" rx="12" ry="5.5" fill="white">
                  <animateTransform attributeName="transform" type="translate" values="0,0;-7,0;0,0" dur="30s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="46" cy="30" rx="9" ry="4.5" fill="white">
                  <animateTransform attributeName="transform" type="translate" values="0,0;-7,0;0,0" dur="30s" repeatCount="indefinite"/>
                </ellipse>
              </g>
              {/* Küçük kuşlar */}
              <g stroke="#1e6fa8" strokeWidth="0.4" fill="none" opacity="0.45">
                <path d="M32,22 Q33.5,20 35,22"/>
                <path d="M37,19 Q38.5,17 40,19"/>
                <path d="M42,23 Q43.5,21 45,23"/>
              </g>
            </>
          )}

          {/* Dramatik bulutlar — yargılama/karar */}
          {(isTrial || isVerdict) && (
            <>
              <ellipse cx="18" cy="30" rx="16" ry="6" fill={isTrial ? '#78350f' : '#7f1d1d'} opacity="0.7" filter="url(#fog-blur)"/>
              <ellipse cx="48" cy="24" rx="13" ry="5" fill={isTrial ? '#92400e' : '#991b1b'} opacity="0.6" filter="url(#fog-blur)"/>
              <ellipse cx="33" cy="38" rx="11" ry="4" fill={isTrial ? '#6b2800' : '#6b0000'} opacity="0.45" filter="url(#fog-blur)"/>
              <rect x="0" y="55%" width="100" height="20%" fill={isTrial ? '#7c3a00' : '#7c0000'} opacity="0.1" filter="url(#fog-blur)"/>
            </>
          )}

          {/* Alt sis */}
          <rect x="0" y="66%" width="100" height="8%" fill="white" opacity={isTrial || isVerdict ? 0.04 : 0.07} filter="url(#fog-blur)"/>

        </>
      )}

      {/* Köy + kale silueti */}
      <VillageSilhouette dark={isNight}/>

      {/* Zemin */}
      <rect x="0" y="70%" width="100" height="30%"
        fill={isNight ? (isHunter ? '#0d0000' : '#010010') : (isTrial ? '#1a0800' : isVerdict ? '#160000' : '#0c1802')}/>

      {/* Zemin sis şeridi */}
      <rect x="0" y="68%" width="100" height="5%"
        fill={isNight ? (isHunter ? '#200000' : '#08061e') : 'white'}
        opacity={isNight ? 0.38 : 0.05}
        filter="url(#fog-blur)"/>
    </svg>
  );
}
