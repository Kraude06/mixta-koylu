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

// Horoz sesi: Ko-Ko-ri-KO — sawtooth ana + square harmonik, yüksek ses
export function playDay() {
  const c = getCtx();
  if (!c) return;

  function syllable(t: number, f0: number, fpeak: number, f1: number, dur: number, vol: number) {
    const now = c!.currentTime;
    // Ana osilatör — sawtooth (çıtırtılı horoz tınısı)
    const o1 = c!.createOscillator(), g1 = c!.createGain();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(f0, now + t);
    o1.frequency.linearRampToValueAtTime(fpeak, now + t + dur * 0.32);
    o1.frequency.linearRampToValueAtTime(f1, now + t + dur);
    g1.gain.setValueAtTime(0, now + t);
    g1.gain.linearRampToValueAtTime(vol, now + t + 0.016);
    g1.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
    o1.connect(g1); g1.connect(c!.destination);
    o1.start(now + t); o1.stop(now + t + dur + 0.06);

    // Harmonik — square, 1.5× frekans (keskin üst tını)
    const o2 = c!.createOscillator(), g2 = c!.createGain();
    o2.type = 'square';
    o2.frequency.setValueAtTime(f0 * 1.5, now + t);
    o2.frequency.linearRampToValueAtTime(fpeak * 1.5, now + t + dur * 0.32);
    o2.frequency.linearRampToValueAtTime(f1 * 1.5, now + t + dur);
    g2.gain.setValueAtTime(0, now + t);
    g2.gain.linearRampToValueAtTime(vol * 0.28, now + t + 0.016);
    g2.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
    o2.connect(g2); g2.connect(c!.destination);
    o2.start(now + t); o2.stop(now + t + dur + 0.06);
  }

  //          t     f0   peak   f1   dur   vol
  syllable(0.00,  580,  950,  380, 0.22, 0.40); // "Ko"  — kısa, keskin
  syllable(0.28,  480,  820,  300, 0.18, 0.34); // "Ko"  — biraz kısık
  syllable(0.50,  360, 1200,  500, 0.13, 0.30); // "ri"  — hızlı glide
  syllable(0.66,  680, 1700,  200, 0.72, 0.52); // "KO!" — uzun, dramatik zirve
}

// Kurt uluması: kısa hav → dramatik uluma (vibrato, 4 kat harmonik)
export function playNight() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  // ── 1. Hav saldırısı ──────────────────────────────────────────
  const woof = c.createOscillator(), woofG = c.createGain();
  woof.type = 'sawtooth';
  woof.frequency.setValueAtTime(190, now);
  woof.frequency.exponentialRampToValueAtTime(85, now + 0.2);
  woofG.gain.setValueAtTime(0, now);
  woofG.gain.linearRampToValueAtTime(0.42, now + 0.03);
  woofG.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
  woof.connect(woofG); woofG.connect(c.destination);
  woof.start(now); woof.stop(now + 0.28);

  // ── 2. Ana uluma (sine + LFO vibrato) ────────────────────────
  const howl = c.createOscillator(), howlG = c.createGain();
  const lfo = c.createOscillator(), lfoG = c.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 5.8;
  lfoG.gain.setValueAtTime(0, now + 0.2);
  lfoG.gain.linearRampToValueAtTime(60, now + 1.1);   // güçlü vibrato derinliği
  lfoG.gain.linearRampToValueAtTime(50, now + 2.6);
  lfoG.gain.exponentialRampToValueAtTime(0.1, now + 4.2);
  lfo.connect(lfoG); lfoG.connect(howl.frequency);

  howl.type = 'sine';
  howl.frequency.setValueAtTime(160, now + 0.2);
  howl.frequency.linearRampToValueAtTime(850, now + 0.78);  // hızlı dramatik tırmanış
  howl.frequency.linearRampToValueAtTime(790, now + 1.4);
  howl.frequency.linearRampToValueAtTime(640, now + 2.6);
  howl.frequency.exponentialRampToValueAtTime(185, now + 4.2);
  howlG.gain.setValueAtTime(0, now + 0.2);
  howlG.gain.linearRampToValueAtTime(0.52, now + 0.58);
  howlG.gain.linearRampToValueAtTime(0.52, now + 1.6);
  howlG.gain.exponentialRampToValueAtTime(0.001, now + 4.2);
  howl.connect(howlG); howlG.connect(c.destination);
  lfo.start(now + 0.2); howl.start(now + 0.2);
  lfo.stop(now + 4.3); howl.stop(now + 4.3);

  // ── 3. Üst harmonik (triangle — uğursuz tını, daha güçlü) ───
  const harm = c.createOscillator(), harmG = c.createGain();
  harm.type = 'triangle';
  harm.frequency.setValueAtTime(320, now + 0.2);
  harm.frequency.linearRampToValueAtTime(1700, now + 0.78);
  harm.frequency.linearRampToValueAtTime(1280, now + 2.6);
  harm.frequency.exponentialRampToValueAtTime(370, now + 4.0);
  harmG.gain.setValueAtTime(0, now + 0.28);
  harmG.gain.linearRampToValueAtTime(0.16, now + 0.7);
  harmG.gain.exponentialRampToValueAtTime(0.001, now + 4.0);
  harm.connect(harmG); harmG.connect(c.destination);
  harm.start(now + 0.2); harm.stop(now + 4.1);

  // ── 4. Alt sub-harmonik (sine — derin uğultu) ────────────────
  const sub = c.createOscillator(), subG = c.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(80, now + 0.2);
  sub.frequency.linearRampToValueAtTime(425, now + 0.78);
  sub.frequency.linearRampToValueAtTime(320, now + 2.6);
  sub.frequency.exponentialRampToValueAtTime(92, now + 4.1);
  subG.gain.setValueAtTime(0, now + 0.22);
  subG.gain.linearRampToValueAtTime(0.20, now + 0.65);
  subG.gain.exponentialRampToValueAtTime(0.001, now + 4.0);
  sub.connect(subG); subG.connect(c.destination);
  sub.start(now + 0.2); sub.stop(now + 4.2);
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
