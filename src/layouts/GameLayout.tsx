import { Link, Outlet, useParams } from 'react-router-dom';
import { AiFloatingAssistant } from '../components/game/AiFloatingAssistant';
import { useGameStore } from '../stores/gameStore';

export default function GameLayout() {
  const { roomId } = useParams();
  const state = useGameStore((store) => store.roomState);
  const canAskForHints = state !== null && state.room.id === roomId && (
    (state.room.status === 'playing' && state.room.gameplayPhase !== 'reading') ||
    state.room.status === 'voting'
  );

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="mx-auto w-full max-w-7xl">
          <Link to="/" className="text-sm text-muted transition hover:text-gold">
            ← 返回首页
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      {canAskForHints && <AiFloatingAssistant key={`${roomId}:${state.me.player.id}`} />}
    </div>
  );
}
