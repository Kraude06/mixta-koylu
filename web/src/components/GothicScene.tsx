const STARS = [
  { x: 18, y: 14 }, { x: 35, y: 28 }, { x: 52, y: 9 },  { x: 68, y: 22 },
  { x: 82, y: 11 }, { x: 98, y: 32 }, { x: 118, y: 16 }, { x: 134, y: 7 },
  { x: 148, y: 26 }, { x: 163, y: 14 }, { x: 185, y: 10 }, { x: 215, y: 20 },
  { x: 240, y: 8 },  { x: 258, y: 28 }, { x: 275, y: 13 }, { x: 350, y: 18 },
  { x: 368, y: 9 },  { x: 382, y: 30 }, { x: 396, y: 15 }, { x: 12, y: 35 },
  { x: 310, y: 22 }, { x: 42, y: 42 },  { x: 170, y: 35 }, { x: 295, y: 38 },
];

const BAT_PATH = 'M0,0 C-3,-5 -9,-4 -12,-1 C-15,2 -11,5 -7,2 C-4,0 -2,2 0,3 C2,2 4,0 7,2 C11,5 15,2 12,-1 C9,-4 3,-5 0,0Z';

const BATS = [
  { id: 1, x: '12%',  y: '22%', dur: 22, delay: 0,   scale: 1.1 },
  { id: 2, x: '72%',  y: '14%', dur: 28, delay: 5,   scale: 0.8 },
  { id: 3, x: '45%',  y: '18%', dur: 18, delay: 10,  scale: 1.0 },
  { id: 4, x: '85%',  y: '28%', dur: 32, delay: 2,   scale: 0.7 },
  { id: 5, x: '28%',  y: '12%', dur: 25, delay: 14,  scale: 0.9 },
];

export default function GothicScene() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <svg
        viewBox="0 0 400 280"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="gs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#02000a"/>
            <stop offset="55%"  stopColor="#09031c"/>
            <stop offset="100%" stopColor="#140828"/>
          </linearGradient>
          <radialGradient id="gs-moon-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffedb0" stopOpacity="0.45"/>
            <stop offset="45%"  stopColor="#ffd96a" stopOpacity="0.10"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="gs-window" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ff8c00" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#b34000" stopOpacity="0.2"/>
          </radialGradient>
          <filter id="gs-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Sky */}
        <rect width="400" height="280" fill="url(#gs-sky)"/>

        {/* Stars */}
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x} cy={s.y}
            r={i % 3 === 0 ? 1.4 : i % 3 === 1 ? 1.0 : 0.7}
            fill="white"
            opacity={0.55 + (i % 4) * 0.1}
          >
            <animate
              attributeName="opacity"
              values={`${0.4 + (i % 3) * 0.2};${0.15 + (i % 4) * 0.1};${0.4 + (i % 3) * 0.2}`}
              dur={`${2.2 + (i % 6) * 0.6}s`}
              begin={`${(i % 5) * 0.4}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Moon glow */}
        <circle cx="328" cy="46" r="68" fill="url(#gs-moon-glow)"/>
        {/* Moon */}
        <circle cx="328" cy="46" r="30" fill="#f4eec8"/>
        <circle cx="318" cy="40" r="4.5" fill="#e6dba8" opacity="0.45"/>
        <circle cx="336" cy="54" r="2.8" fill="#e6dba8" opacity="0.35"/>
        <circle cx="323" cy="57" r="1.8" fill="#e6dba8" opacity="0.30"/>

        {/* ====== CASTLE ====== */}
        {/* Walls between towers */}
        <rect x="154" y="180" width="18" height="33" fill="#060118"/>
        <rect x="228" y="180" width="18" height="33" fill="#060118"/>

        {/* Left tower */}
        <rect x="116" y="148" width="40" height="65" fill="#070218"/>
        <rect x="116" y="136" width="9"  height="15" fill="#070218"/>
        <rect x="129" y="136" width="9"  height="15" fill="#070218"/>
        <rect x="142" y="136" width="9"  height="15" fill="#070218"/>
        {/* Left window */}
        <rect x="130" y="163" width="8" height="14" rx="4" fill="#1a0620"/>
        <rect x="130" y="163" width="8" height="14" rx="4" fill="url(#gs-window)" opacity="0.55">
          <animate attributeName="opacity" values="0.55;0.8;0.55" dur="4.5s" repeatCount="indefinite"/>
        </rect>

        {/* Right tower */}
        <rect x="244" y="148" width="40" height="65" fill="#070218"/>
        <rect x="244" y="136" width="9"  height="15" fill="#070218"/>
        <rect x="257" y="136" width="9"  height="15" fill="#070218"/>
        <rect x="270" y="136" width="9"  height="15" fill="#070218"/>
        {/* Right window */}
        <rect x="262" y="163" width="8" height="14" rx="4" fill="#1a0620"/>
        <rect x="262" y="163" width="8" height="14" rx="4" fill="url(#gs-window)" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.75;0.5" dur="3.8s" begin="1s" repeatCount="indefinite"/>
        </rect>

        {/* Main keep */}
        <rect x="172" y="116" width="56" height="97" fill="#070218"/>
        <rect x="172" y="103" width="10" height="17" fill="#070218"/>
        <rect x="186" y="103" width="10" height="17" fill="#070218"/>
        <rect x="200" y="103" width="10" height="17" fill="#070218"/>
        <rect x="214" y="103" width="10" height="17" fill="#070218"/>
        {/* Spire */}
        <polygon points="200,82 195,105 205,105" fill="#050110"/>

        {/* Main keep windows */}
        <rect x="181" y="133" width="9" height="16" rx="4.5" fill="#1a0620"/>
        <rect x="181" y="133" width="9" height="16" rx="4.5" fill="url(#gs-window)" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.9;0.6" dur="5s" repeatCount="indefinite"/>
        </rect>
        <rect x="210" y="133" width="9" height="16" rx="4.5" fill="#1a0620"/>
        <rect x="210" y="133" width="9" height="16" rx="4.5" fill="url(#gs-window)" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.8;0.5" dur="6s" begin="0.7s" repeatCount="indefinite"/>
        </rect>

        {/* Gate arch */}
        <rect x="189" y="180" width="22" height="33" fill="#030010"/>
        <ellipse cx="200" cy="180" rx="11" ry="8" fill="#030010"/>

        {/* ====== TREES ====== */}
        {/* Left */}
        <polygon points="58,213 72,172 86,213"  fill="#050012"/>
        <polygon points="73,213 89,164 105,213" fill="#060118"/>
        <polygon points="90,213 104,175 118,213" fill="#050012"/>
        {/* Right */}
        <polygon points="282,213 296,175 310,213" fill="#050012"/>
        <polygon points="295,213 311,164 327,213" fill="#060118"/>
        <polygon points="314,213 328,172 342,213" fill="#050012"/>

        {/* ====== VILLAGE HOUSES ====== */}
        {/* Church (far left) */}
        <rect x="0" y="198" width="30" height="70" fill="#040012"/>
        <polygon points="0,198 15,172 30,198" fill="#040012"/>
        <polygon points="8,182 15,162 22,182"  fill="#060118"/>
        <ellipse cx="15" cy="210" rx="4" ry="6" fill="#090328" opacity="0.9"/>

        {/* Left houses */}
        <rect x="28"  y="210" width="34" height="60" fill="#050114"/>
        <polygon points="28,210 45,190 62,210" fill="#060218"/>
        <rect x="60"  y="218" width="26" height="52" fill="#040012"/>
        <polygon points="60,218 73,200 86,218" fill="#050114"/>

        {/* Right houses */}
        <rect x="316" y="218" width="28" height="52" fill="#050114"/>
        <polygon points="316,218 330,200 344,218" fill="#060218"/>
        <rect x="342" y="210" width="36" height="60" fill="#040012"/>
        <polygon points="342,210 360,190 378,210" fill="#050114"/>
        {/* Far right */}
        <rect x="376" y="202" width="24" height="68" fill="#050114"/>
        <polygon points="376,202 388,180 400,202" fill="#040012"/>

        {/* Ground */}
        <rect x="0" y="213" width="400" height="67" fill="#030010"/>

        {/* Fog layers */}
        <rect x="0" y="200" width="400" height="45" fill="white" opacity="0.035"/>
        <rect x="0" y="218" width="400" height="28" fill="white" opacity="0.055"/>

        {/* ====== BATS (SVG animateMotion) ====== */}
        <g fill="#140830" filter="url(#gs-glow)">
          <g transform="scale(1.1)">
            <path d={BAT_PATH}>
              <animateMotion dur="22s" repeatCount="indefinite"
                path="M50,55 C20,35 70,15 130,45 C190,75 170,35 220,55 C270,75 250,40 300,35 C330,30 360,55 340,70 C310,85 260,55 210,75 C160,95 100,65 50,55Z"/>
            </path>
          </g>

          <g transform="scale(0.8)">
            <path d={BAT_PATH}>
              <animateMotion dur="28s" begin="7s" repeatCount="indefinite"
                path="M290,50 C320,30 360,55 380,40 C360,20 320,10 280,30 C240,50 200,30 160,45 C120,60 80,40 40,55 C80,70 140,85 200,65 C240,50 270,60 290,50Z"/>
            </path>
          </g>

          <g transform="scale(0.9)">
            <path d={BAT_PATH}>
              <animateMotion dur="18s" begin="3s" repeatCount="indefinite"
                path="M180,40 C150,20 100,35 70,25 C40,15 20,35 50,50 C80,65 130,45 180,60 C230,75 280,55 310,45 C280,30 230,45 180,40Z"/>
            </path>
          </g>
        </g>
      </svg>
    </div>
  );
}
