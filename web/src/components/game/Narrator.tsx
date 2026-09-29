import { useEffect, useRef, useState } from 'react';
import { DeathReveal, PhaseType, Player, REVEAL_STEP_MS, ROLE_INFO, RoleType } from '@vampir-koylu/shared';
import { ROLE_COLOR } from '../../utils/game';
import { playDeath } from '../../utils/sounds';

// ── Ölüm açıklaması sırası ───────────────────────────────────────────────────

export type RevealStep = 'pre' | 'intro' | 'cause' | 'will' | 'deathNote' | 'role';

/** Açıklama başlamadan önce kısa bir nefes (faz duyurusu görünsün). Sunucu 800–1200ms pay bırakır. */
const PRE_MS = 700;

function stepsFor(r: DeathReveal): { step: RevealStep; ms: number }[] {
  const steps: { step: RevealStep; ms: number }[] = [
    { step: 'intro', ms: REVEAL_STEP_MS.intro },
    { step: 'cause', ms: REVEAL_STEP_MS.cause },
    { step: 'will', ms: r.will.trim() ? REVEAL_STEP_MS.will : REVEAL_STEP_MS.noWill },
  ];
  if (r.deathNote.trim()) steps.push({ step: 'deathNote', ms: REVEAL_STEP_MS.deathNote });
  steps.push({ step: 'role', ms: REVEAL_STEP_MS.role });
  return steps;
}

/** Kuyruktaki ilk açıklamayı adım adım oynatır, bitince finish() çağırır. */
export function useRevealSequence(queue: DeathReveal[], finish: () => void, soundEnabled: boolean) {
  const current = queue[0] ?? null;
  const [step, setStep] = useState<RevealStep>('pre');
  const wasIdle = useRef(true);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  useEffect(() => {
    if (!current) { wasIdle.current = true; return; }
    const seq = stepsFor(current);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = wasIdle.current ? PRE_MS : 0;
    wasIdle.current = false;
    setStep('pre');
    seq.forEach(({ step: s, ms }) => {
      timers.push(setTimeout(() => {
        setStep(s);
        if (s === 'intro' && soundRef.current) playDeath();
      }, t));
      t += ms;
    });
    timers.push(setTimeout(finish, t));
    return () => timers.forEach(clearTimeout);
    // Aynı kişinin açıklaması tekrar tetiklenmesin diye sadece id'ye bağlıyız
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.playerId]);

  return { current, step: current ? step : null };
}

// ── Faz duyuruları ───────────────────────────────────────────────────────────

interface Banner { id: number; title: string; sub?: string; ms: number }

export function usePhaseBanners(
  phase: PhaseType, dayNumber: number, accused: Player | undefined,
  myId: string | null, votesNeeded: number, hunterId: string | null,
) {
  const [queue, setQueue] = useState<Banner[]>([]);
  const idRef = useRef(0);
  const prevPhase = useRef<PhaseType | null>(null);

  useEffect(() => {
    if (prevPhase.current === phase) return;
    prevPhase.current = phase;
    const name = accused?.name ?? 'Sanık';
    const isMeAccused = !!accused && accused.id === myId;
    const make = (title: string, sub?: string, ms = 2600): Banner => ({ id: ++idRef.current, title, sub, ms });
    let items: Banner[] = [];
    switch (phase) {
      case 'discussion':
        items = [dayNumber === 1
          ? make(`Gün 1`, 'Köylüler tanışıyor — bugün oylama yok')
          : make(`Gün ${dayNumber}`, 'Tartışma başladı')];
        break;
      case 'voting':
        items = [make('Oylama Başladı', `Yargılamak için ${votesNeeded} oy gerekli`)];
        break;
      case 'trial':
        items = [
          make(`Köy, ${name} adlı oyuncuyu yargılamaya karar verdi.`, undefined, 2800),
          make(isMeAccused ? 'Savunman nedir?' : `${name} savunmasını yapıyor.`, undefined, 2400),
        ];
        break;
      case 'verdict':
        items = [make(`Köy, ${name} adlı oyuncunun kaderini oyluyor.`, undefined, 2600)];
        break;
      case 'last-words':
        items = [make(isMeAccused ? 'Son sözlerin var mı?' : `${name} son sözlerini söylüyor.`)];
        break;
      case 'night':
        items = [make(`Gece ${dayNumber}`, 'Köylüler uyuyor, vampirler uyanıyor...')];
        break;
      case 'morning':
        items = [make('Güneş doğuyor...', undefined, 1600)];
        break;
      case 'hunter-revenge':
        items = [make('Avcının İntikamı', hunterId === myId ? 'Son okunu kime atacaksın?' : 'Avcı son okunu atmaya hazırlanıyor...')];
        break;
    }
    setQueue(items);
  }, [phase, dayNumber, accused, myId, votesNeeded, hunterId]);

  const current = queue[0] ?? null;
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue(q => q.slice(1)), current.ms);
    return () => clearTimeout(t);
  }, [current]);

  return current;
}

// ── Görsel ───────────────────────────────────────────────────────────────────

const CAUSE_TEXT: Record<DeathReveal['cause'], { intro: (n: string) => string; cause: string; icon: string }> = {
  killed: { intro: n => `${n} dün gece öldü.`, cause: 'Vampirler tarafından parçalandı.', icon: '🩸' },
  voted:  { intro: n => `Tanrı ruhuna merhamet etsin, ${n}.`, cause: 'Köy tarafından asıldı.', icon: '⚖️' },
  hunter: { intro: n => `${n} vuruldu!`, cause: 'Avcının okuyla can verdi.', icon: '🏹' },
};

function BigText({ title, sub, keyId }: { title: string; sub?: string; keyId: string | number }) {
  return (
    <div key={keyId} className="px-4 pt-3 text-center" style={{ animation: 'narratorIn 0.35s ease-out both' }}>
      <div className="narrator-text text-[1.55rem] leading-tight sm:text-[2rem]">{title}</div>
      {sub && <div className="narrator-text text-base mt-1 opacity-90" style={{ color: '#e6cf98' }}>{sub}</div>}
    </div>
  );
}

export function ScrollView({ title, text, variant = 'will', onClose }: {
  title: string; text: string; variant?: 'will' | 'deathNote'; onClose?: () => void;
}) {
  const isNote = variant === 'deathNote';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-auto" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.45)', animation: 'fadeIn 0.2s ease-out both' }}>
      <div
        className="w-full max-w-xs"
        style={{ animation: 'scrollOpen 0.45s cubic-bezier(0.34,1.3,0.64,1) both', transformOrigin: 'top' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="h-4 rounded-full mx-[-10px]" style={{ background: 'linear-gradient(#b88d3e,#6b4726)', boxShadow: '0 3px 6px rgba(0,0,0,.5)' }} />
        <div
          className="parchment px-5 py-4 min-h-[180px] max-h-[55vh] overflow-y-auto"
          style={isNote ? { filter: 'sepia(0.4) hue-rotate(-25deg) saturate(1.6)', } : undefined}
        >
          <h3 className="font-display text-2xl text-center mb-3" style={{ color: isNote ? '#7f1d1d' : '#3a2a15' }}>{title}</h3>
          <p className="font-hand text-[1.05rem] leading-relaxed whitespace-pre-wrap break-words" style={{ color: isNote ? '#5c0d0d' : '#3a2a15' }}>
            {text.trim() || 'Boş...'}
          </p>
        </div>
        <div className="h-4 rounded-full mx-[-10px]" style={{ background: 'linear-gradient(#b88d3e,#6b4726)', boxShadow: '0 3px 6px rgba(0,0,0,.5)' }} />
      </div>
    </div>
  );
}

function RoleMedallion({ role, name }: { role: RoleType; name: string }) {
  const info = ROLE_INFO[role];
  return (
    <div className="flex flex-col items-center pt-3 px-4 text-center">
      <div className="narrator-text text-[1.45rem] leading-tight sm:text-[1.9rem]" style={{ animation: 'narratorIn 0.35s ease-out both' }}>
        {name} bir <span style={{ color: ROLE_COLOR[role] }}>{info.label}</span> idi.
      </div>
      <div
        className="mt-3 w-20 h-20 rounded-full flex items-center justify-center text-5xl"
        style={{
          animation: 'medallionIn 0.6s 0.15s cubic-bezier(0.34,1.5,0.64,1) both',
          background: 'radial-gradient(circle at 35% 30%, #f7e3a8, #b88d3e 60%, #5c4420)',
          border: '3px solid #2a1a0e',
          boxShadow: `0 0 0 3px #dcb45c, 0 0 30px ${ROLE_COLOR[role]}88, 0 8px 20px rgba(0,0,0,.6)`,
        }}
      >
        {info.icon}
      </div>
    </div>
  );
}

const DRIPS = [4, 11, 17, 26, 33, 41, 48, 57, 63, 71, 78, 86, 93].map((left, i) => ({
  left, h: 30 + ((i * 37) % 45), d: (i % 5) * 0.06, w: 14 + (i % 3) * 8,
}));

function YouDied() {
  return (
    <div className="fixed inset-0 z-[55] pointer-events-none overflow-hidden" style={{ animation: 'fadeIn 0.25s ease-out both' }}>
      <div className="absolute inset-0" style={{ background: 'rgba(80,0,0,0.55)' }} />
      <div className="absolute top-0 left-0 right-0 h-[18vh]" style={{ background: '#8b0000' }} />
      {DRIPS.map((d, i) => (
        <div key={i} className="absolute rounded-b-full" style={{
          left: `${d.left}%`, top: '17vh', width: d.w, height: `${d.h}vh`,
          background: 'linear-gradient(#8b0000, #a4161a)',
          transformOrigin: 'top', animation: `bloodDrip 1.1s ${d.d}s cubic-bezier(0.4,0,0.2,1) both`,
        }} />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <h1 className="font-display text-7xl sm:text-8xl" style={{
          color: '#fff1f1', animation: 'youDiedIn 0.5s 0.2s cubic-bezier(0.34,1.4,0.64,1) both',
          textShadow: '0 4px 0 #3b0000, 0 0 40px #000',
        }}>
          ÖLDÜN!
        </h1>
      </div>
    </div>
  );
}

interface NarratorProps {
  banner: Banner | null;
  reveal: DeathReveal | null;
  step: RevealStep | null;
  myId: string | null;
}

/** Meydanın üstüne yerleşen anlatıcı katmanı */
export default function Narrator({ banner, reveal, step, myId }: NarratorProps) {
  const isMe = !!reveal && reveal.playerId === myId;
  const cfg = reveal ? CAUSE_TEXT[reveal.cause] : null;

  let content: React.ReactNode = null;
  if (reveal && step && step !== 'pre' && cfg) {
    const name = reveal.playerName;
    switch (step) {
      case 'intro': content = <BigText keyId="intro" title={cfg.intro(name)} />; break;
      case 'cause': content = <BigText keyId="cause" title={`${cfg.icon} ${cfg.cause}`} />; break;
      case 'will':
        content = reveal.will.trim()
          ? <BigText keyId="will" title="Cesedin yanında bir vasiyet bulundu." />
          : <BigText keyId="nowill" title="Vasiyet bulunamadı." />;
        break;
      case 'deathNote': content = <BigText keyId="dn" title="Cesedin yanında bir ölüm notu bulundu." />; break;
      case 'role': content = <RoleMedallion role={reveal.role} name={name} />; break;
    }
  } else if (banner) {
    content = <BigText keyId={banner.id} title={banner.title} sub={banner.sub} />;
  }

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">{content}</div>
      {reveal && isMe && (step === 'intro' || step === 'cause') && <YouDied />}
      {reveal && step === 'will' && reveal.will.trim() && (
        <ScrollView title={`Vasiyet — ${reveal.playerName}`} text={reveal.will} />
      )}
      {reveal && step === 'deathNote' && (
        <ScrollView title="Ölüm Notu" text={reveal.deathNote} variant="deathNote" />
      )}
    </>
  );
}
