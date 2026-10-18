import { BookOpen, Flame, Frame, KeyRound, Lock, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Clue } from '../../types/models';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { cn } from '../ui/cn';

interface SceneExplorerProps {
  clues: Clue[];
  discoveredIds: Set<string>;
  onDiscover: (clue: Clue) => void;
}

const hotspots = [
  { id: 'painting', label: '墙上的油画', icon: Frame, position: 'left-[14%] top-[26%]', tone: 'gold' },
  { id: 'desk', label: '书桌抽屉', icon: BookOpen, position: 'right-[19%] bottom-[30%]', tone: 'gold' },
  { id: 'fireplace', label: '壁炉', icon: Flame, position: 'left-[21%] bottom-[18%]', tone: 'crimson' },
  { id: 'window', label: '钟楼窗', icon: KeyRound, position: 'right-[13%] top-[20%]', tone: 'crimson' },
] as const;

export function SceneExplorer({ clues, discoveredIds, onDiscover }: SceneExplorerProps) {
  const [activeClue, setActiveClue] = useState<Clue | null>(null);
  const [emptySpot, setEmptySpot] = useState<string | null>(null);

  const spots = useMemo(
    () =>
      hotspots.map((spot, index) => {
        const clue = clues[index] ?? null;
        return {
          ...spot,
          clue,
          discovered: clue ? discoveredIds.has(clue.id) : false,
        };
      }),
    [clues, discoveredIds],
  );

  const discoveredCount = clues.filter((clue) => discoveredIds.has(clue.id)).length;
  const nextSceneUnlocked = discoveredCount >= Math.min(2, clues.length);
  const activeDiscovered = activeClue ? discoveredIds.has(activeClue.id) : false;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0b0a]">
      <header className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Tag variant="gold">场景探索</Tag>
            <span className="text-xs text-muted">雾夜庄园 · 书房</span>
          </div>
          <h2 className="mt-2 font-display text-xl text-paper">点击房间里的物件，发现隐藏线索</h2>
        </div>
        <div className="text-xs text-muted">
          探索进度 {discoveredCount}/{clues.length || 0}
        </div>
      </header>

      <div className="relative aspect-[16/9] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(200,169,106,0.14),transparent_34%),radial-gradient(circle_at_82%_72%,rgba(142,31,47,0.13),transparent_38%)]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.08)_3px)]" />

        <div className="absolute inset-x-0 top-0 h-[62%] bg-gradient-to-b from-[#1b1511] to-[#120e0b]" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-b from-[#17100b] to-[#080706]" />
        <div className="absolute inset-x-0 bottom-[36%] h-px bg-gold/20" />

        <div className="absolute left-[11%] top-[13%] h-[43%] w-[29%] border-[6px] border-[#3a2a1a] bg-gradient-to-br from-[#1b1a20] to-[#09090d] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-3 border border-gold/20" />
          <div className="absolute inset-0 flex items-center justify-center font-display text-5xl text-gold/15">?</div>
        </div>

        <div className="absolute bottom-[18%] right-[14%] h-[20%] w-[36%] rotate-[-1deg] rounded-sm border border-[#4a3420] bg-gradient-to-b from-[#2a1c12] to-[#110b07] shadow-2xl">
          <div className="absolute left-[12%] top-[28%] h-[8%] w-[24%] rounded-sm bg-gold/20" />
          <div className="absolute right-[18%] top-[22%] h-[42%] w-[18%] border border-[#4a3420] bg-black/30" />
        </div>

        <div className="absolute bottom-[12%] left-[15%] h-[25%] w-[18%] rounded-t-full border border-[#4a3420] bg-[#140d09]">
          <div className="absolute inset-x-[18%] bottom-[12%] h-[45%] rounded-t-full bg-gradient-to-t from-crimson/40 to-gold/20 blur-sm" />
          <Flame className="absolute bottom-[27%] left-1/2 h-6 w-6 -translate-x-1/2 text-gold/80" />
        </div>

        <div className="absolute right-[10%] top-[10%] h-[36%] w-[14%] border border-gold/20 bg-gradient-to-b from-[#17202b] to-[#0a0d13]">
          <div className="absolute inset-x-1/2 inset-y-0 w-px bg-gold/20" />
          <div className="absolute inset-y-1/2 inset-x-0 h-px bg-gold/20" />
          <div className="absolute -right-1 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-gold/10 blur-xl" />
        </div>

        {spots.map((spot) => {
          const Icon = spot.icon;
          const isLocked = !spot.clue;
          return (
            <button
              key={spot.id}
              type="button"
              onClick={() => {
                if (spot.clue) {
                  setActiveClue(spot.clue);
                  setEmptySpot(null);
                } else {
                  setEmptySpot(spot.label);
                }
              }}
              className={cn(
                'group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-2 text-xs backdrop-blur transition-all duration-300',
                spot.tone === 'gold'
                  ? 'border-gold/40 bg-black/50 text-gold hover:border-gold hover:bg-gold/15'
                  : 'border-crimson/40 bg-black/50 text-[#e5a4ae] hover:border-crimson hover:bg-crimson/15',
                isLocked && 'border-white/10 text-muted/70',
                spot.position,
              )}
              aria-label={spot.label}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{spot.label}</span>
              {!isLocked && !spot.discovered && (
                <span className="absolute -right-1 -top-1 h-2 w-2 animate-ping rounded-full bg-gold" />
              )}
              {spot.discovered && <span className="text-[10px] text-emerald-400">已发现</span>}
            </button>
          );
        })}

        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs text-muted backdrop-blur">
          探索进度 {discoveredCount}/{clues.length || 0} · 钟楼暗门{' '}
          {nextSceneUnlocked ? '已解锁' : '未解锁'}
        </div>
      </div>

      {emptySpot && (
        <p className="border-t border-white/10 px-5 py-3 text-xs text-muted">
          「{emptySpot}」暂时没有新的线索。先看看其他物件。
        </p>
      )}

      {activeClue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gold/20 bg-[#141012] p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              发现新线索
            </div>
            <h3 className="mt-4 font-display text-2xl text-paper">{activeClue.title}</h3>
            <p className="mt-4 text-sm leading-7 text-muted">{activeClue.content}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setActiveClue(null)}>
                {activeDiscovered ? '关闭' : '稍后再看'}
              </Button>
              {!activeDiscovered && (
                <Button
                  onClick={() => {
                    onDiscover(activeClue);
                    setActiveClue(null);
                  }}
                >
                  记入我的线索
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {clues.length === 0 && (
        <p className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-muted">
          <Lock className="h-3.5 w-3.5" />
          这一幕还没有可探索的线索。
        </p>
      )}
    </section>
  );
}