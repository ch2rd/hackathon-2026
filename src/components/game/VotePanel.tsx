import type { PublicPlayer } from '../../types/models';

/**
 * 投票面板（B 的 game 组件，/play 页 voting 阶段用）。
 * targets 必须是 selectors.voteTargets 的结果（已排除自己）；
 * 是否可投（canVote）由页面用 hasVoted 计算后传入。
 */

export interface VotePanelProps {
  targets: PublicPlayer[];
  /** 本人已投的目标玩家 id；未投为 null */
  myTargetPlayerId: string | null;
  /** 各目标当前票数 */
  counts: Record<string, number>;
  canVote: boolean;
  onVote: (targetPlayerId: string) => void;
}

export function VotePanel({ targets, myTargetPlayerId, counts, canVote, onVote }: VotePanelProps) {
  return (
    <div className="flex flex-col gap-2" data-testid="vote-panel">
      {myTargetPlayerId !== null && (
        <p className="text-sm text-neutral-400">你已投出选票，等待其他玩家。</p>
      )}
      {targets.map((target) => {
        const isMyTarget = target.id === myTargetPlayerId;
        return (
          <button
            key={target.id}
            type="button"
            disabled={!canVote}
            onClick={() => onVote(target.id)}
            className={[
              'flex items-center justify-between rounded-md border p-3 text-left transition',
              isMyTarget
                ? 'border-emerald-500 bg-emerald-950'
                : 'border-neutral-700 bg-neutral-900 enabled:hover:border-neutral-500',
              canVote ? '' : 'opacity-60',
            ].join(' ')}
          >
            <span>
              <span className="font-medium">{target.nickname}</span>
              <span className="ml-2 text-sm text-neutral-400">{target.characterName ?? '未选角'}</span>
            </span>
            <span className="text-sm text-neutral-400">{counts[target.id] ?? 0} 票</span>
          </button>
        );
      })}
    </div>
  );
}
