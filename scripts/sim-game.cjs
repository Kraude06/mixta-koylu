// Bot oyuncularla uçtan uca oyun simülasyonu.
// Kullanım: sunucuyu başlat (PORT=3099), sonra: node scripts/sim-game.cjs
const { io } = require('socket.io-client');

const URL = process.env.SIM_URL ?? 'http://localhost:3099';
const NAMES = ['Ali', 'Ayşe', 'Can', 'Deniz', 'Ece'];
const log = (...a) => console.log(new Date().toISOString().slice(14, 23), ...a);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

function connect() {
  return new Promise(res => {
    const s = io(URL, { transports: ['websocket'], forceNew: true });
    s.on('connect', () => res(s));
  });
}

(async () => {
  const bots = [];
  for (const name of NAMES) {
    const s = await connect();
    const bot = { name, s, id: null, role: null, phase: 'lobby', players: {}, msgs: [], errors: [] };
    s.on('room:joined', (st) => { bot.players = st.players; bot.phase = st.phase; });
    s.on('game:started', (st) => { bot.role = st.myRole; bot.players = st.players; });
    s.on('game:state', (st) => { bot.players = st.players; bot.state = st; });
    s.on('game:phase', (p, d) => { bot.phase = p; bot.day = d; if (bot === bots[0]) log(`── FAZ: ${p} (gün ${d})`); });
    s.on('game:reveal', (r) => { if (bot === bots[0]) log('REVEAL', r.map(x => `${x.playerName}=${x.role} (${x.cause}) will="${x.will}" note="${x.deathNote}"`).join(' | ')); });
    s.on('game:over', (w, why) => { bot.winner = w; if (bot === bots[0]) log('OYUN BİTTİ', w, why); });
    s.on('chat:message', (m) => bot.msgs.push(m));
    s.on('error', (e) => { bot.errors.push(e); log(`[hata→${name}]`, e); });
    bots.push(bot);
  }

  const host = bots[0];
  const code = await new Promise(r => host.s.emit('room:create', host.name, (c, id) => { host.id = id; r(c); }));
  log('Oda', code);
  for (const b of bots.slice(1)) {
    await new Promise(r => b.s.emit('room:join', code, b.name, (ok, err, id) => { b.id = id; r(); }));
  }
  await wait(200);

  host.s.emit('game:start', {
    vampireCount: 1, includeDoctor: true, includeSeer: true, includeHunter: true,
    discussionDuration: 1, votingDuration: 6, trialDuration: 1, verdictDuration: 2, nightDuration: 2,
  });
  await wait(300);
  log('Roller:', bots.map(b => `${b.name}=${b.role}`).join(', '));
  const vamp = bots.find(b => b.role === 'vampire');
  const town = bots.filter(b => b.role !== 'vampire');
  const hunter = bots.find(b => b.role === 'hunter');
  const seer = bots.find(b => b.role === 'seer');

  // Vasiyet & ölüm notu
  bots.forEach(b => b.s.emit('notes:update', `Ben ${b.name}, rolüm ${b.role}`));
  vamp.s.emit('deathnote:update', 'Sıradaki sensin.');

  // Gizlilik: diğer oyuncuların rolleri görünmemeli
  const leak = town[0].players[vamp.id]?.role;
  log('Rol sızıntısı kontrolü (undefined olmalı):', leak);

  // Canlı oyuncunun vasiyeti okunamamalı
  const liveWill = await new Promise(r => town[0].s.emit('notes:read', vamp.id, r));
  log('Canlı vasiyet okuma (boş olmalı):', JSON.stringify(liveWill));

  const until = async (pred, label, max = 60000) => {
    const t0 = Date.now();
    while (!pred()) { if (Date.now() - t0 > max) throw new Error('Zaman aşımı: ' + label); await wait(50); }
  };

  const alive = () => bots.filter(b => host.players[b.id]?.isAlive);

  let acquitted = false;
  let nights = 0;
  let reconnected = false;
  while (!host.winner) {
    await until(() => ['voting', 'night', 'hunter-revenge', 'game-over', 'discussion'].includes(host.phase), 'faz');
    if (host.winner || host.phase === 'game-over') break;

    if (host.phase === 'discussion' && !reconnected && host.day === 2) {
      // Oyun ortasında kopma → aynı isimle yeni soketle geri dönme
      reconnected = true;
      const b = alive().find(x => x !== host && x !== vamp);
      b.s.close();
      await wait(300);
      const s2 = await connect();
      const st = await new Promise(r => {
        s2.once('room:joined', (state) => r(state));
        s2.emit('room:join', code, b.name, () => {});
      });
      log(`Yeniden bağlanma: ${b.name} faz=${st.phase} rol=${st.myRole} (beklenen ${b.role}) mesaj=${st.messages.length}`);
      s2.on('game:state', (x) => { b.players = x.players; });
      s2.on('game:phase', (p) => { b.phase = p; });
      s2.on('chat:message', (m) => b.msgs.push(m));
      s2.on('error', (e) => { b.errors.push(e); log(`[hata→${b.name}]`, e); });
      b.s = s2;
      await until(() => host.phase !== 'discussion', 'tartışma sonu');
      continue;
    }
    if (host.phase === 'discussion') { await until(() => host.phase !== 'discussion', 'tartışma sonu'); continue; }

    if (host.phase === 'hunter-revenge') {
      const h = hunter;
      const target = alive().find(b => b !== vamp && b !== h);
      log(`Avcı ${h.name} → ${target.name} vuruyor`);
      h.s.emit('game:hunter-shot', target.id);
      await until(() => host.phase !== 'hunter-revenge' || !!host.winner, 'avcı sonu');
      continue;
    }

    if (host.phase === 'voting') {
      const aliveNow = alive();
      const talkers = aliveNow.filter(b => b !== vamp);
      talkers[0].s.emit('chat:whisper', talkers[1].id, 'psst');
      const target = acquitted ? vamp : aliveNow.find(b => b !== vamp);
      for (const b of aliveNow) if (b !== target) b.s.emit('game:vote', target.id);
      await until(() => host.phase === 'trial', 'trial');
      target.s.emit('chat:send', 'Ben masumum!', 'public');
      await until(() => host.phase === 'verdict', 'verdict');
      const verdict = acquitted ? 'guilty' : 'innocent';
      for (const b of alive()) if (b !== target) b.s.emit('game:verdict-vote', verdict);
      if (!acquitted) {
        acquitted = true;
        await until(() => host.phase !== 'verdict', 'karar sonu');
        log(`Serbest bırakıldı → faz=${host.phase}, kalan hak=${host.state?.trialsLeft} ✓`);
      } else {
        await until(() => host.phase === 'execution', 'infaz');
        await until(() => host.phase !== 'execution', 'infaz sonu');
      }
      continue;
    }

    if (host.phase === 'night') {
      nights++;
      // İlk gece avcıyı öldür → avcı intikamı tetiklensin
      const victim = nights === 1 && hunter ? hunter : alive().find(b => b !== vamp && b !== host);
      vamp.s.emit('game:night-action', victim.id);
      if (seer && host.players[seer.id]?.isAlive) seer.s.emit('game:night-action', vamp.id);
      await until(() => host.phase !== 'night', 'gece sonu');
    }
  }

  await until(() => !!host.winner, 'kazanan', 90000);
  await wait(300);
  const whisper = bots.map(b => `${b.name}:${b.msgs.filter(m => m.channel === 'whisper').length}`).join(' ');
  const notices = host.msgs.filter(m => m.kind === 'whisper-notice').length;
  log('Fısıltı mesajı sayısı (sadece gönderen+alıcıda >0):', whisper, '| herkese giden bildirim:', notices);
  log('Kahin mesajları:', seer ? seer.msgs.filter(m => m.recipientId === seer.id).map(m => m.content) : '-');
  log('Vampir mesajları town[0]\'a sızdı mı:', town[0].msgs.some(m => m.channel === 'vampire'));
  log('Hatalar:', JSON.stringify(bots.flatMap(b => b.errors.map(e => `${b.name}: ${e}`))));
  log('Kazanan:', host.winner, '| oyun sonu rolleri açık mı:', Object.values(host.players).every(p => p.role));

  // Oyun sırasında kopma → aynı isimle geri dönme testi yukarıda yapılamadı; lobi dönüşünü bekle
  await until(() => host.phase === 'lobby', 'lobiye dönüş', 30000);
  log('Lobiye dönüldü ✓');
  bots.forEach(b => b.s.close());
  process.exit(0);
})().catch(e => { console.error('SİMÜLASYON HATASI:', e.message); process.exit(1); });
