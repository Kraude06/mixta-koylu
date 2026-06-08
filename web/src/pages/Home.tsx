import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useGameStore } from '../store/gameStore';

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

  // Ack callback düşse bile room:joined eventi roomCode'u set edince buradan yönlendir
  useEffect(() => {
    if (roomCode) {
      pendingRef.current = false;
      navigate('/lobby');
    }
  }, [roomCode, navigate]);

  function connect(action: () => void) {
    if (socket.connected) {
      action();
      return;
    }
    // Temiz bağlantı — eski listener'ları temizle
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
        if (!ok || !playerId) {
          setErr(error ?? 'Odaya katılamadı.');
          return;
        }
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gothic-950 to-night-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-8xl mb-4">🧛</div>
          <h1 className="text-5xl font-gothic font-bold text-blood-600 mb-2">Vampir Köylü</h1>
          <p className="text-gray-400">Köyü kurtarabilecek misin?</p>
        </div>

        {mode === 'menu' && (
          <div className="flex flex-col gap-4">
            <button className="btn-primary text-lg py-4" onClick={() => setMode('create')}>
              ➕ Oda Oluştur
            </button>
            <button className="btn-ghost text-lg py-4" onClick={() => setMode('join')}>
              🚪 Odaya Katıl
            </button>
          </div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <div className="card flex flex-col gap-4">
            <button
              className="text-gray-500 hover:text-gray-300 text-sm text-left"
              onClick={handleBack}
            >
              ← Geri
            </button>
            <h2 className="text-xl font-bold text-blood-400">
              {mode === 'create' ? '➕ Oda Oluştur' : '🚪 Odaya Katıl'}
            </h2>

            <input
              className="input-field"
              placeholder="Oyuncu adın"
              maxLength={20}
              value={name}
              disabled={loading}
              onChange={(e) => { setName(e.target.value); setErr(''); }}
              onKeyDown={(e) => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
            />

            {mode === 'join' && (
              <input
                className="input-field uppercase tracking-widest text-center text-xl"
                placeholder="ODA KODU"
                maxLength={6}
                value={code}
                disabled={loading}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            )}

            {err && <p className="text-blood-400 text-sm">{err}</p>}

            <button
              className="btn-primary py-3"
              disabled={loading}
              onClick={mode === 'create' ? handleCreate : handleJoin}
            >
              {loading ? 'Bağlanıyor...' : mode === 'create' ? 'Oluştur' : 'Katıl'}
            </button>
          </div>
        )}

        <p className="text-center text-gray-600 text-xs mt-8">
          4–16 oyuncu • Sıra tabanlı • Çok oyunculu
        </p>
      </div>
    </div>
  );
}
