import { PhaseType, Player, ROLE_INFO, RoleType, VerdictChoice } from '@vampir-koylu/shared';

interface Props {
  phase: PhaseType;
  me: Player | undefined;
  myRole: RoleType | null;
  accused: Player | undefined;
  hunterId: string | null;
  votesNeeded: number;
  trialsLeft: number;
  myVoteTarget: Player | undefined;
  nightTarget: Player | undefined;
  verdictVotedCount: number;
  verdictEligible: number;
  myVerdict: VerdictChoice;
  onVerdict: (v: VerdictChoice) => void;
}

function Hint({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'red' | 'night' }) {
  const color = tone === 'red' ? '#fca5a5' : tone === 'night' ? '#c7d2fe' : '#e7e5e4';
  return <p className="text-center text-[13.5px] leading-snug px-3" style={{ color }}>{children}</p>;
}

/** Meydanın hemen altında, o anki faza göre ne yapılacağını söyleyen şerit */
export default function ActionBar({
  phase, me, myRole, accused, hunterId, votesNeeded, trialsLeft,
  myVoteTarget, nightTarget, verdictVotedCount, verdictEligible, myVerdict, onVerdict,
}: Props) {
  const alive = me?.isAlive ?? false;
  const isAccused = !!accused && accused.id === me?.id;
  let content: React.ReactNode = null;

  if (!alive && phase !== 'game-over' && phase !== 'hunter-revenge') {
    content = <Hint>💀 Öldün — köyün kaderini izliyorsun.</Hint>;
  } else {
    switch (phase) {
      case 'discussion':
        content = <Hint>💬 Tartış ve şüphelerini paylaş. <span className="text-violet-300">Fısıldamak için bir oyuncuya dokun.</span></Hint>;
        break;
      case 'voting':
        content = (
          <Hint>
            🗳️ Yargılamak istediğin oyuncuya dokun — <b className="text-brass-300">{votesNeeded} oy</b> gerekli
            <span className="text-stone-400"> · {trialsLeft} hak</span>
            {myVoteTarget && <><br /><span className="text-red-300">Oyun: {myVoteTarget.number}. {myVoteTarget.name}</span><span className="text-stone-500"> (geri almak için tekrar dokun)</span></>}
          </Hint>
        );
        break;
      case 'trial':
        content = <Hint tone="red">⚖️ {isAccused ? 'Savunmanı yap! Sadece sen konuşabilirsin.' : `${accused?.name} savunmasını yapıyor...`}</Hint>;
        break;
      case 'verdict':
        content = isAccused ? (
          <Hint tone="red">⚖️ Köy kaderini oyluyor... ({verdictVotedCount}/{verdictEligible})</Hint>
        ) : (
          <div className="flex flex-col items-center gap-1.5 w-full px-3">
            <div className="flex gap-3 w-full max-w-sm">
              {(['guilty', 'innocent'] as const).map(v => {
                const on = myVerdict === v;
                const red = v === 'guilty';
                return (
                  <button
                    key={v}
                    onClick={() => onVerdict(on ? 'abstain' : v)}
                    className="flex-1 font-display text-2xl py-2 rounded-lg active:scale-95 transition-all"
                    style={{
                      color: on ? '#fff' : red ? '#fca5a5' : '#bbf7d0',
                      background: on ? (red ? '#991b1b' : '#15803d') : 'linear-gradient(180deg,#4d321b,#2a1a0e)',
                      border: `2px solid ${red ? '#dc2626' : '#16a34a'}`,
                      boxShadow: on ? `0 0 18px ${red ? '#dc262688' : '#16a34a88'}` : 'inset 0 1px 0 rgba(255,230,170,.2)',
                      textShadow: '0 1px 0 #000',
                    }}
                  >
                    {red ? 'SUÇLU' : 'SUÇSUZ'}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-stone-400">
              {myVerdict === 'abstain' ? 'Oy vermezsen çekimser sayılırsın' : 'Vazgeçmek için tekrar dokun'} · {verdictVotedCount}/{verdictEligible} oy verdi
            </span>
          </div>
        );
        break;
      case 'last-words':
        content = <Hint tone="red">🪢 {isAccused ? 'Son sözlerini söyle...' : `${accused?.name} son sözlerini söylüyor...`}</Hint>;
        break;
      case 'execution':
        content = <Hint tone="red">⚰️ İnfaz gerçekleşiyor...</Hint>;
        break;
      case 'morning':
        content = <Hint>🌅 Köy uyanıyor...</Hint>;
        break;
      case 'night': {
        const info = myRole ? ROLE_INFO[myRole] : null;
        const hasAbility = myRole === 'vampire' || myRole === 'doctor' || myRole === 'seer';
        content = hasAbility && info ? (
          <Hint tone="night">
            {info.icon} <b>{info.abilityLabel}:</b> bir oyuncuya dokun
            {nightTarget && <><br /><span className="text-brass-300">Seçimin: {nightTarget.number}. {nightTarget.name}</span></>}
          </Hint>
        ) : (
          <Hint tone="night">😴 Uyuyorsun... Sabahı bekle.</Hint>
        );
        break;
      }
      case 'hunter-revenge':
        content = hunterId === me?.id
          ? <Hint tone="red">🏹 Son okunu kime atacaksın? Bir oyuncuya dokun.</Hint>
          : <Hint>🏹 Avcı nişan alıyor...</Hint>;
        break;
    }
  }

  if (!content) return null;
  return (
    <div
      className="shrink-0 flex items-center justify-center py-2 min-h-[46px]"
      style={{ background: 'linear-gradient(180deg, rgba(23,14,9,0.96), rgba(12,7,5,0.96))', borderTop: '1px solid rgba(220,180,92,0.25)', borderBottom: '1px solid rgba(220,180,92,0.25)' }}
    >
      {content}
    </div>
  );
}
