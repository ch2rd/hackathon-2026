import type { PublicPlayer } from '../../types/models';

/**
 * 玩家列表（B 的 game 组件，等 A 的 ui/Card 落地后可替换外壳样式）。
 * 纯展示：不做任何规则判定，数据由 RoomPage 从 RoomState 取出传入。
 */

export interface PlayerListProps {
  players: PublicPlayer[];
  /** 当前玩家 id，用于标注「我」 */
  currentPlayerId: string;
  /** 剧本建议人数，用于渲染「虚位以待」空位 */
  playerCount: number;
}

export function PlayerList({ players, currentPlayerId, playerCount }: PlayerListProps) {
  const emptySlots = Math.max(playerCount - players.length, 0);
  return (
    <ul className="flex flex-col gap-2" data-testid="player-list">
      {players.map((player) => (
        <li
          key={player.id}
          className="flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-900 p-3"
        >
          <span className="flex items-center gap-2">
            <span className="font-medium">{player.nickname}</span>
            {player.id === currentPlayerId && (
              <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs">我</span>
            )}
            {player.isHost && (
              <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs">房主</span>
            )}
          </span>
          <span className="flex items-center gap-2 text-sm text-neutral-400">
            <span>{player.characterName ?? '虚位以待'}</span>
            {player.isReady ? (
              <span className="text-emerald-400">已准备</span>
            ) : (
              <span>未准备</span>
            )}
          </span>
        </li>
      ))}
      {Array.from({ length: emptySlots }, (_, index) => (
        <li
          key={`empty-${index}`}
          className="flex items-center rounded-md border border-dashed border-neutral-800 p-3 text-sm text-neutral-600"
        >
          等待玩家加入…
        </li>
      ))}
    </ul>
  );
}
