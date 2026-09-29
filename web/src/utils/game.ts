import { PhaseType, RoleType } from '@vampir-koylu/shared';

export const NIGHT_PHASES: PhaseType[] = ['night', 'hunter-revenge'];
export const COURT_PHASES: PhaseType[] = ['trial', 'verdict', 'last-words', 'execution'];

export function isNightPhase(phase: PhaseType): boolean {
  return NIGHT_PHASES.includes(phase);
}

export const PHASE_LABEL: Record<PhaseType, string> = {
  lobby: 'Lobi',
  discussion: 'Tartışma',
  voting: 'Oylama',
  trial: 'Savunma',
  verdict: 'Karar',
  'last-words': 'Son Sözler',
  execution: 'İnfaz',
  night: 'Gece',
  morning: 'Sabah',
  'hunter-revenge': 'Avcının İntikamı',
  'game-over': 'Oyun Bitti',
};

/** Rol renkleri (ToS'taki gibi takım rengine göre) */
export const ROLE_COLOR: Record<RoleType, string> = {
  villager: '#86efac',
  doctor: '#7dd3fc',
  seer: '#c4b5fd',
  hunter: '#fdba74',
  vampire: '#f87171',
};

/** Her oyuncuya ismine göre sabit bir pelerin rengi */
const CLOAK_COLORS = [
  '#7f1d1d', '#1e3a5f', '#3f5f2a', '#5b3a73', '#6b4a1f', '#2d5a5a',
  '#6d2f4f', '#40506b', '#5a5a2a', '#733f2a', '#2a4a3f', '#4a2a6b',
  '#6b2a2a', '#2a3a6b', '#556b2f', '#704214',
];

export function cloakColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CLOAK_COLORS[h % CLOAK_COLORS.length];
}

/** "Mustafa" → "Mustafa'yı" gibi ekler yerine nötr kalıplar kullanıyoruz; bu sadece kısaltma için. */
export function shortName(name: string, max = 10): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}
