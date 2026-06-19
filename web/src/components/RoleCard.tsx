import { RoleType, ROLE_INFO } from '@vampir-koylu/shared';

interface Props {
  role: RoleType;
  expanded?: boolean;
}

const ROLE_COLORS: Record<RoleType, { border: string; bg: string; title: string; badge: string; glow: string }> = {
  vampire: {
    border: 'rgba(153,27,27,0.7)',
    bg:     'rgba(60,0,0,0.5)',
    title:  '#fca5a5',
    badge:  'rgba(153,27,27,0.4)',
    glow:   '0 0 24px rgba(153,27,27,0.4)',
  },
  villager: {
    border: 'rgba(34,197,94,0.35)',
    bg:     'rgba(0,30,10,0.5)',
    title:  '#86efac',
    badge:  'rgba(21,128,61,0.35)',
    glow:   '0 0 24px rgba(21,128,61,0.2)',
  },
  doctor: {
    border: 'rgba(56,189,248,0.35)',
    bg:     'rgba(0,20,40,0.5)',
    title:  '#7dd3fc',
    badge:  'rgba(3,105,161,0.35)',
    glow:   '0 0 24px rgba(56,189,248,0.15)',
  },
  seer: {
    border: 'rgba(167,139,250,0.4)',
    bg:     'rgba(20,0,50,0.5)',
    title:  '#c4b5fd',
    badge:  'rgba(109,40,217,0.35)',
    glow:   '0 0 24px rgba(167,139,250,0.2)',
  },
  hunter: {
    border: 'rgba(251,146,60,0.4)',
    bg:     'rgba(40,15,0,0.5)',
    title:  '#fdba74',
    badge:  'rgba(194,65,12,0.35)',
    glow:   '0 0 24px rgba(251,146,60,0.2)',
  },
};

export default function RoleCard({ role, expanded }: Props) {
  const info = ROLE_INFO[role];
  const colors = ROLE_COLORS[role];
  const isVampire = info.team === 'vampire';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: colors.glow,
      }}
    >
      {/* Üst şerit */}
      <div
        className="h-0.5 w-full"
        style={{ background: `linear-gradient(to right, transparent, ${colors.border}, transparent)` }}
      />

      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* İkon çerçevesi */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl shrink-0"
            style={{
              background: colors.badge,
              border: `1px solid ${colors.border}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}
          >
            {info.icon}
          </div>

          <div className="flex-1 min-w-0">
            {/* Rol adı */}
            <div
              className="font-black text-base tracking-wide leading-tight"
              style={{ color: colors.title, textShadow: `0 0 12px ${colors.border}` }}
            >
              {info.label}
            </div>

            {/* Takım rozeti */}
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: colors.badge,
                  color: colors.title,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {isVampire ? '🩸 Vampir' : '🏡 Köy'}
              </span>
              {info.abilityLabel && (
                <span className="text-xs text-gray-500">
                  ✦ {info.abilityLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Açıklama */}
        {expanded && (
          <>
            <div
              className="my-3 h-px"
              style={{ background: `linear-gradient(to right, transparent, ${colors.border}, transparent)` }}
            />
            <p
              className="text-xs leading-relaxed"
              style={{ color: 'rgba(209,213,219,0.8)' }}
            >
              {info.description}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
