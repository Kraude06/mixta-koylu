import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useGameStore } from '../store/gameStore';
import GothicScene from '../components/GothicScene';

export default function Home() {
  const navigate = useNavigate();
  const { setMyId, setMyName } = useGameStore();
  const roomCode = useGameStore((s) => s.roomCode);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const pendingRef = useRef(false);

  useEffect(() => {
    if (roomCode) {
      pendingRef.current = false;
      navigate('/lobby');
    }
  }, [roomCode, navigate]);

  function connect(action: () => void) {
    if (socket.connected) { action(); return; }
    socket.off('connect');
    socket.disconnect();
    socket.once('connect', action);
    socket.connect();
  }

  function handleCreate() {
    if (!name.trim()) return setErr('İsim gir.');
    if (pendingRef.current) return;
    pendingRef.current = true;
    setLoading(true);
    setErr('');
    connect(() => {
      socket.emit('room:create', name.trim(), (roomCode, playerId) => {
        pendingRef.current = false;
        setLoading(false);
        setMyId(playerId);
        setMyName(name.trim());
        navigate('/lobby');
      });
    });
  }

  function handleJoin() {
    if (!name.trim()) return setErr('İsim gir.');
    if (!code.trim()) return setErr('Oda kodu gir.');
    if (pendingRef.current) return;
    pendingRef.current = true;
    setLoading(true);
    setErr('');
    connect(() => {
      socket.emit('room:join', code.toUpperCase(), name.trim(), (ok, error, playerId) => {
        pendingRef.current = false;
        setLoading(false);
        if (!ok || !playerId) { setErr(error ?? 'Odaya katılamadı.'); return; }
        setMyId(playerId);
        setMyName(name.trim());
        navigate('/lobby');
      });
    });
  }

  function handleBack() {
    setMode('menu');
    setErr('');
    pendingRef.current = false;
    setLoading(false);
    if (socket.connected) socket.disconnect();
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Arka plan sahne */}
      <GothicScene />

      {/* Hafif karartma katmanı — okunabilirlik için */}
      <div className="absolute inset-0 bg-black/30" />

      {/* İçerik */}
      <div className="relative z-10 w-full max-w-sm px-4 flex flex-col items-center">

        {/* Başlık */}
        <div className="text-center mb-8 select-none">
          {/* Kırmızı yatay çizgiler */}
          <div className="flex items-center gap-3 mb-4 justify-center">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-blood-600"/>
            <span className="text-blood-500 text-lg">🦇</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-blood-600"/>
          </div>

          {/* Oyun adı */}
          <h1
            className="font-gothic font-black text-blood-500 tracking-widest leading-tight"
            style={{
              fontSize: 'clamp(2.2rem, 8vw, 3.5rem)',
              textShadow: '0 0 40px rgba(153,27,27,0.8), 0 2px 0 #000, 0 4px 0 rgba(0,0,0,0.5)',
            }}
          >
            VAMPİR
          </h1>
          <h1
            className="font-gothic font-black text-gray-100 tracking-[0.3em] leading-tight"
            style={{
              fontSize: 'clamp(1.4rem, 5vw, 2.2rem)',
              textShadow: '0 0 30px rgba(255,255,255,0.15), 0 2px 0 #000',
            }}
          >
            KÖYLÜ
          </h1>

          <div className="flex items-center gap-3 mt-4 justify-center">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-blood-800"/>
            <span className="text-gray-600 text-xs tracking-widest uppercase">Köyü Kurtarabilecek misin?</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-blood-800"/>
          </div>
        </div>

        {/* Form kartı — frosted glass */}
        <div
          className="w-full rounded-2xl border border-white/10 p-6"
          style={{
            background: 'rgba(4, 0, 16, 0.75)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {mode === 'menu' && (
            <div className="flex flex-col gap-3">
              <button
                className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all duration-200
                  bg-blood-700 hover:bg-blood-600 text-white border border-blood-500
                  hover:shadow-[0_0_20px_rgba(153,27,27,0.5)] active:scale-95"
                onClick={() => setMode('create')}
              >
                🏰 Oda Oluştur
              </button>
              <button
                className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all duration-200
                  bg-transparent hover:bg-white/5 text-gray-300 border border-white/15
                  hover:border-white/30 active:scale-95"
                onClick={() => setMode('join')}
              >
                🚪 Odaya Katıl
              </button>
            </div>
          )}

          {(mode === 'create' || mode === 'join') && (
            <div className="flex flex-col gap-4">
              {/* Geri */}
              <button
                className="text-gray-600 hover:text-gray-400 text-sm text-left transition-colors"
                onClick={handleBack}
              >
                ← Geri
              </button>

              {/* Başlık */}
              <h2 className="text-blood-400 font-bold text-lg">
                {mode === 'create' ? '🏰 Oda Oluştur' : '🚪 Odaya Katıl'}
              </h2>

              {/* İsim input */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">
                  Oyuncu Adın
                </label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                    text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blood-600
                    focus:bg-white/8 transition-all"
                  placeholder="Adını gir..."
                  maxLength={20}
                  value={name}
                  disabled={loading}
                  onChange={(e) => { setName(e.target.value); setErr(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
                  autoFocus
                />
              </div>

              {/* Oda kodu (join) */}
              {mode === 'join' && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">
                    Oda Kodu
                  </label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                      text-blood-300 placeholder-gray-700 focus:outline-none focus:border-blood-600
                      transition-all uppercase tracking-[0.35em] text-center text-xl font-mono font-bold"
                    placeholder="XXXXXX"
                    maxLength={6}
                    value={code}
                    disabled={loading}
                    onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  />
                </div>
              )}

              {/* Hata */}
              {err && (
                <p className="text-blood-400 text-sm flex items-center gap-1">
                  <span>⚠️</span> {err}
                </p>
              )}

              {/* Buton */}
              <button
                className="w-full py-3.5 rounded-xl font-bold text-base tracking-wide transition-all duration-200
                  bg-blood-700 hover:bg-blood-600 text-white border border-blood-500
                  hover:shadow-[0_0_20px_rgba(153,27,27,0.5)] active:scale-95
                  disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                onClick={mode === 'create' ? handleCreate : handleJoin}
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      Bağlanıyor...
                    </span>
                  : mode === 'create' ? 'Odayı Oluştur' : 'Odaya Katıl'}
              </button>
            </div>
          )}
        </div>

        {/* Alt bilgi */}
        <p className="text-gray-700 text-xs mt-6 tracking-wider">
          4 – 16 oyuncu &nbsp;•&nbsp; Sıra tabanlı &nbsp;•&nbsp; Çok oyunculu
        </p>
      </div>
    </div>
  );
}
