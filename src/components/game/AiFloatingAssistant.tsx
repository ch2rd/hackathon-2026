import { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { getAIHint } from '../../api/ai';
import { loadIdentity, readApiError, useGameStore } from '../../stores/gameStore';
import type { AIHint } from '../../types/models';

/** 可爱的鲸鱼占位头像（用户没放图时的兜底）。 */
function WhaleMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="AI 助手">
      <circle cx="32" cy="32" r="30" fill="#1a2b3d" />
      <ellipse cx="27" cy="37" rx="17" ry="12" fill="#6fb3e0" />
      <path d="M10 33 L2 26 L6 40 Z" fill="#6fb3e0" />
      <ellipse cx="25" cy="42" rx="11" ry="6" fill="#e3f2fa" />
      <circle cx="33" cy="31" r="2.4" fill="#0b2233" />
      <circle cx="33.8" cy="30.2" r="0.9" fill="#ffffff" />
      <path d="M30 39 Q34 42 38 39" stroke="#0b2233" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="25" cy="37" r="2" fill="#f4a6b8" opacity="0.7" />
      <path
        d="M26 20 q-3 -7 0 -9 M26 20 q2 -6 0 -10"
        stroke="#9fd0ea"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 用户提供的卡通形象：public/ai-mascot.jpg，加载失败时回退鲸鱼占位。 */
const MASCOT_SRC = '/ai-mascot.jpg';

export function AiFloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<AIHint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const handleAsk = async () => {
    const state = useGameStore.getState();
    const roomId = state.roomId ?? loadIdentity()?.roomId;
    const playerId = state.playerId ?? loadIdentity()?.playerId;
    if (!roomId || !playerId) {
      setError('先加入房间，我才能读取你的线索。');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setHint(await getAIHint(roomId, playerId));
    } catch (failure) {
      setError(readApiError(failure).message);
    } finally {
      setLoading(false);
    }
  };

  const mascotLarge = imgFailed ? (
    <WhaleMascot className="h-12 w-12" />
  ) : (
    <img
      src={MASCOT_SRC}
      alt="AI 助手"
      className="h-12 w-12 rounded-full object-cover"
      onError={() => setImgFailed(true)}
    />
  );

  const mascotSmall = imgFailed ? (
    <WhaleMascot className="h-10 w-10 shrink-0" />
  ) : (
    <img
      src={MASCOT_SRC}
      alt="AI 助手"
      className="h-10 w-10 shrink-0 rounded-full object-cover"
      onError={() => setImgFailed(true)}
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="AI 推理助手"
        className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-ink/90 shadow-glow backdrop-blur transition-transform hover:scale-105"
      >
        {mascotLarge}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
          <header className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-br from-[#151520] to-[#0b0b0f] p-4">
            {mascotSmall}
            <div className="flex-1">
              <div className="font-medium text-paper">AI 推理助手</div>
              <div className="text-xs text-muted">
                {hint?.source === 'mock'
                  ? '演示模式（未接真模型）'
                  : hint?.source === 'llm'
                    ? 'AI 在线'
                    : '读你的线索，给推理方向'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭"
              className="text-muted transition hover:text-paper"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="max-h-[55vh] overflow-y-auto p-4">
            {loading && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在读线索、推理中…
              </p>
            )}

            {error && <p className="text-sm text-[#e5a4ae]">{error}</p>}

            {hint && !loading && (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-paper/90">{hint.summary}</p>
                {hint.suspects.length > 0 && (
                  <ul className="space-y-2">
                    {hint.suspects.map((suspect) => (
                      <li key={suspect.playerId} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-paper">{suspect.name}</span>
                          <span className="text-gold">嫌疑 {suspect.confidence}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-white/10">
                          <div
                            className="h-full bg-gold"
                            style={{ width: `${Math.min(Math.max(suspect.confidence, 0), 100)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-muted">{suspect.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted">{hint.disclaimer}</p>
              </div>
            )}

            {!hint && !loading && !error && (
              <p className="text-sm leading-6 text-muted">
                点击下方按钮，我会读取你已获得的线索，给你一个推理方向——不剧透凶手，也不替你做决定。
              </p>
            )}
          </div>

          <footer className="border-t border-white/10 p-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleAsk()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-[#d6b77c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? '正在思考…' : hint ? '重新推理' : '让 AI 梳理线索'}
            </button>
          </footer>
        </div>
      )}
    </>
  );
}
