let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.25,
  startAt = 0,
) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + startAt);
  gain.gain.setValueAtTime(0, c.currentTime + startAt);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startAt + duration);
  osc.start(c.currentTime + startAt);
  osc.stop(c.currentTime + startAt + duration + 0.05);
}

export function playClick() {
  tone(600, 0.06, 'square', 0.08);
}

export function playVoteCast() {
  tone(440, 0.12, 'sine', 0.18);
  tone(550, 0.08, 'sine', 0.12, 0.1);
}

export function playDay() {
  tone(330, 0.25, 'sine', 0.2, 0);
  tone(440, 0.25, 'sine', 0.22, 0.15);
  tone(550, 0.35, 'sine', 0.2, 0.3);
  tone(660, 0.4, 'sine', 0.18, 0.45);
}

export function playNight() {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(280, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(70, c.currentTime + 1.8);
  gain.gain.setValueAtTime(0.28, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.2);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 2.3);

  // Uğursuz ikinci ses
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.connect(gain2);
  gain2.connect(c.destination);
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(140, c.currentTime + 0.3);
  osc2.frequency.exponentialRampToValueAtTime(55, c.currentTime + 1.8);
  gain2.gain.setValueAtTime(0.15, c.currentTime + 0.3);
  gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2.0);
  osc2.start(c.currentTime + 0.3);
  osc2.stop(c.currentTime + 2.1);
}

export function playTrial() {
  tone(200, 0.35, 'sawtooth', 0.18, 0);
  tone(160, 0.4, 'sawtooth', 0.15, 0.3);
  tone(120, 0.6, 'sine', 0.2, 0.6);
}

export function playVerdict() {
  tone(350, 0.2, 'square', 0.12, 0);
  tone(350, 0.2, 'square', 0.12, 0.25);
  tone(350, 0.4, 'square', 0.16, 0.5);
}

export function playDeath() {
  const c = getCtx();
  if (!c) return;
  // Çöküş tonu — üç kademeli inen ses
  [0, 0.22, 0.44].forEach((start, i) => {
    const freq = 220 - i * 55;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, c.currentTime + start + 0.5);
    gain.gain.setValueAtTime(0.28, c.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + 0.55);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + 0.6);
  });
}

export function playGameOver(winner: 'village' | 'vampire') {
  if (winner === 'village') {
    // Zafer fanfarı
    [330, 415, 494, 523, 659, 784].forEach((freq, i) => {
      tone(freq, 0.35, 'sine', 0.22, i * 0.1);
    });
  } else {
    // Yenilgi dirjesi
    [330, 294, 247, 220, 185, 165].forEach((freq, i) => {
      tone(freq, 0.45, 'sine', 0.22, i * 0.15);
    });
  }
}

export function playHunterRevenge() {
  tone(280, 0.1, 'square', 0.2, 0);
  tone(350, 0.1, 'square', 0.18, 0.12);
  tone(200, 0.5, 'sawtooth', 0.22, 0.25);
}

// İlk kullanıcı etkileşiminde AudioContext'i başlat
export function initAudio() {
  getCtx();
}
