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

// Horoz sesi: ko-ko-ri-ko (4 hece, sawtooth = çıtırtılı ton)
export function playDay() {
  const c = getCtx();
  if (!c) return;
  function crow(startT: number, f0: number, fpeak: number, f1: number, dur: number, vol: number) {
    const osc = c!.createOscillator();
    const gain = c!.createGain();
    osc.connect(gain);
    gain.connect(c!.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0, c!.currentTime + startT);
    osc.frequency.linearRampToValueAtTime(fpeak, c!.currentTime + startT + dur * 0.35);
    osc.frequency.linearRampToValueAtTime(f1, c!.currentTime + startT + dur);
    gain.gain.setValueAtTime(0, c!.currentTime + startT);
    gain.gain.linearRampToValueAtTime(vol, c!.currentTime + startT + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, c!.currentTime + startT + dur);
    osc.start(c!.currentTime + startT);
    osc.stop(c!.currentTime + startT + dur + 0.05);
  }
  crow(0,    700,  1100, 550, 0.28, 0.16);
  crow(0.30, 550,  850,  400, 0.22, 0.13);
  crow(0.54, 420,  1500, 600, 0.55, 0.20);
  crow(1.10, 750,  950,  280, 0.45, 0.16);
}

// Kurt uluması: alçaktan tırmanır, zirvede titreşir, yavaşça söner
export function playNight() {
  const c = getCtx();
  if (!c) return;

  const osc = c.createOscillator();
  const gain = c.createGain();

  // LFO — kurt ulumasındaki karakteristik titreşim
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 5.5;
  lfoGain.gain.setValueAtTime(0, c.currentTime);
  lfoGain.gain.linearRampToValueAtTime(20, c.currentTime + 1.2);
  lfoGain.gain.exponentialRampToValueAtTime(0.1, c.currentTime + 3.2);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(155, c.currentTime);
  osc.frequency.linearRampToValueAtTime(740, c.currentTime + 0.65);
  osc.frequency.linearRampToValueAtTime(680, c.currentTime + 1.2);
  osc.frequency.linearRampToValueAtTime(570, c.currentTime + 2.1);
  osc.frequency.exponentialRampToValueAtTime(175, c.currentTime + 3.2);
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.26, c.currentTime + 0.15);
  gain.gain.linearRampToValueAtTime(0.26, c.currentTime + 1.0);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 3.2);
  osc.connect(gain);
  gain.connect(c.destination);
  lfo.start(c.currentTime);
  osc.start(c.currentTime);
  lfo.stop(c.currentTime + 3.3);
  osc.stop(c.currentTime + 3.3);

  // Üst harmonik (uğursuz tını)
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(310, c.currentTime);
  osc2.frequency.linearRampToValueAtTime(1460, c.currentTime + 0.65);
  osc2.frequency.linearRampToValueAtTime(1100, c.currentTime + 2.1);
  osc2.frequency.exponentialRampToValueAtTime(340, c.currentTime + 3.1);
  gain2.gain.setValueAtTime(0, c.currentTime);
  gain2.gain.linearRampToValueAtTime(0.055, c.currentTime + 0.2);
  gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 3.0);
  osc2.connect(gain2);
  gain2.connect(c.destination);
  osc2.start(c.currentTime);
  osc2.stop(c.currentTime + 3.1);
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
