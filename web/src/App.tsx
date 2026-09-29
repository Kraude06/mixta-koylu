import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import { useGameStore, abandonRestore } from './store/gameStore';

function Reconnecting() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-wood-950 px-6 text-center">
      <div className="text-5xl animate-pulse">🦇</div>
      <p className="narrator-text text-3xl">Odaya geri dönülüyor...</p>
      <button className="btn-brass px-6 text-lg" onClick={abandonRestore}>Vazgeç</button>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const roomCode = useGameStore((s) => s.roomCode);
  const restoring = useGameStore((s) => s.restoring);
  if (restoring) return <Reconnecting />;
  if (!roomCode) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <Game />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
