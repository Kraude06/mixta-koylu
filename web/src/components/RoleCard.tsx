import { RoleType, ROLE_INFO } from '@vampir-koylu/shared';

interface Props {
  role: RoleType;
  expanded?: boolean;
}

export default function RoleCard({ role, expanded }: Props) {
  const info = ROLE_INFO[role];
  const isVampire = info.team === 'vampire';

  return (
    <div className={`rounded-xl border p-3 ${isVampire
      ? 'bg-blood-900/50 border-blood-700'
      : 'bg-green-900/20 border-green-800/50'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{info.icon}</span>
        <div>
          <div className={`font-bold text-sm ${isVampire ? 'text-blood-300' : 'text-green-300'}`}>
            {info.label}
          </div>
          <div className={`text-xs ${isVampire ? 'text-blood-500' : 'text-green-600'}`}>
            {isVampire ? '🩸 Vampir Takımı' : '🏡 Köy Takımı'}
          </div>
        </div>
      </div>
      {expanded && (
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">{info.description}</p>
      )}
    </div>
  );
}
