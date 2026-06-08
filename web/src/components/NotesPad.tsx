import { useGameStore } from '../store/gameStore';

export default function NotesPad() {
  const { myNotes, setMyNotes } = useGameStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 shrink-0">
        <span className="text-sm font-semibold text-gray-300">📝 Notlarım</span>
        <span className="text-xs text-gray-600 ml-auto">{myNotes.length}/2000</span>
      </div>
      <textarea
        className="flex-1 bg-transparent text-gray-300 text-sm p-3 resize-none focus:outline-none
                   placeholder-gray-700 font-mono"
        placeholder={"Özel notlarını buraya yaz...\n\nÖldüğünde diğer oyuncular bu notları okuyabilir."}
        value={myNotes}
        onChange={(e) => setMyNotes(e.target.value)}
        maxLength={2000}
      />
    </div>
  );
}
