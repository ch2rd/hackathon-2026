import { Volume2, VolumeX } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { isMuted, setMuted, subscribeMuted, unlockAudio } from '../../game/audio';

/**
 * 音效开关（B 的 game 组件，对应 AGENTS.md §2.3 的 P1「音效开关」）。
 *
 * 点这一下本身就是用户手势，顺手把 AudioContext 解锁掉，
 * 所以放在游戏页头部，玩家第一次点它就能出声。
 */

interface SfxToggleProps {
  className?: string;
}

export function SfxToggle({ className }: SfxToggleProps) {
  const muted = useSyncExternalStore(subscribeMuted, isMuted);
  const label = muted ? '开启音效' : '关闭音效';

  return (
    <button
      type="button"
      data-testid="sfx-toggle"
      aria-pressed={!muted}
      aria-label={label}
      title={label}
      onClick={() => {
        unlockAudio();
        setMuted(!muted);
      }}
      className={[
        'rounded-md border border-neutral-700 p-1.5 text-neutral-400 transition',
        'hover:border-neutral-500 hover:text-neutral-200',
        className ?? '',
      ].join(' ')}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}
