import type { Clue } from '../../types/models';

/**
 * 线索列表（B 的 game 组件）。
 * 传入的 clues 必须是 RoomState.me.visibleClues（服务端/状态机已过滤权限），
 * 组件自身不做权限判断。
 */

export interface ClueListProps {
  clues: Clue[];
}

export function ClueList({ clues }: ClueListProps) {
  if (clues.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-neutral-800 p-4 text-sm text-neutral-500">
        暂时还没有线索，等待剧情推进。
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2" data-testid="clue-list">
      {clues.map((clue) => (
        <li key={clue.id} className="rounded-md border border-neutral-700 bg-neutral-900 p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{clue.title}</span>
            <span
              className={
                clue.visibility === 'private'
                  ? 'rounded bg-amber-950 px-1.5 py-0.5 text-xs text-amber-400'
                  : 'rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400'
              }
            >
              {clue.visibility === 'private' ? `第 ${clue.actNumber} 幕 · 私密` : `第 ${clue.actNumber} 幕 · 公开`}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-300">{clue.content}</p>
        </li>
      ))}
    </ul>
  );
}
