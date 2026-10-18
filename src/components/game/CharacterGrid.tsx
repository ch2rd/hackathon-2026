import type { CharacterPublic } from '../../types/models';

/**
 * 选角卡片网格（B 的 game 组件）。
 * 可选性判定来自 selectors.availableCharacters，本组件不重复实现规则。
 */

export interface CharacterAssignment {
  characterId: string;
  /** 选了该角色的玩家昵称 */
  nickname: string;
}

export interface CharacterGridProps {
  /** 剧本全部角色（按 sortOrder 升序传入） */
  characters: CharacterPublic[];
  /** 已被选走的角色 */
  assignments: CharacterAssignment[];
  myCharacterId: string | null;
  /** 当前是否处于可点选状态（selecting 且本人未准备） */
  canSelect: boolean;
  onSelect: (characterId: string) => void;
}

export function CharacterGrid({
  characters,
  assignments,
  myCharacterId,
  canSelect,
  onSelect,
}: CharacterGridProps) {
  const assignmentByCharacterId = new Map(assignments.map((a) => [a.characterId, a.nickname]));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="character-grid">
      {characters.map((character, index) => {
        const takenBy = assignmentByCharacterId.get(character.id);
        const isMine = character.id === myCharacterId;
        // 别人已选走 → 永远禁用；不可选阶段（非本人角色）→ 禁用
        const isDisabled = !isMine && (!canSelect || takenBy !== undefined);
        return (
          <button
            key={character.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(character.id)}
            style={{ animationDelay: `${index * 70}ms` }}
            className={[
              'fx-rise flex flex-col items-start gap-1 rounded-md border p-4 text-left transition',
              isMine
                ? 'border-emerald-500 bg-emerald-950'
                : takenBy
                  ? 'border-neutral-800 bg-neutral-900 opacity-50'
                  : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500',
            ].join(' ')}
          >
            <span className="font-medium">{character.name}</span>
            <span className="text-sm text-neutral-400">{character.identity} · {character.age}岁</span>
            <span className="text-xs text-neutral-500">{character.publicIntro}</span>
            {takenBy && (
              <span className="text-xs text-amber-400">已被 {takenBy} 选走</span>
            )}
            {isMine && <span className="text-xs text-emerald-400">我的角色</span>}
          </button>
        );
      })}
    </div>
  );
}
