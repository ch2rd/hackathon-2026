import type { Character } from '../../types/models';
import { CharacterPortrait } from '../character/CharacterPortrait';
import { SceneBackdrop } from './SceneBackdrop';
import { resolveMemoryFilter, type SceneKey } from './visuals';

/**
 * 出场声明动画（B 的 game 组件）。
 *
 * 选角完成、进入游戏后先播放一次：本角色的立绘 + 身份信息 + 公开介绍 + 秘密，
 * 用「回忆滤镜 + 上浮淡入」做成动画开场。点「进入现场」关闭，进入房间探索。
 * 只展示当前玩家自己的角色（character 来自 RoomState.me.character，含 secret）。
 */

interface CharacterIntroProps {
  character: Character;
  scene: SceneKey;
  onEnter: () => void;
}

export function CharacterIntro({ character, scene, onEnter }: CharacterIntroProps) {
  const memory = resolveMemoryFilter(character.identity);

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      <style>{`
        @keyframes intro-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <SceneBackdrop scene={scene} memory={memory.filter} />
      <div className="absolute inset-0 bg-black/55" />

      <div
        className="relative z-10 flex h-full flex-col items-center justify-center gap-3 overflow-y-auto p-6 text-center"
        style={{ animation: 'intro-rise 0.9s ease-out both' }}
      >
        <span className="text-xs tracking-[0.5em] text-gold/80">人 物 登 场</span>
        <h2 className="text-4xl font-bold md:text-5xl" style={{ color: memory.accent }}>
          {character.name}
        </h2>
        <p className="text-paper/80">
          {character.identity} · {character.age} 岁
        </p>

        <div className="h-44 w-36 md:h-60 md:w-44">
          <CharacterPortrait
            character={character}
            size="lg"
            className="h-full w-full"
          />
        </div>

        <p className="max-w-md text-sm leading-6 text-paper/90">{character.publicIntro}</p>

        <div className="max-w-md rounded-xl border border-amber-700/50 bg-amber-950/40 p-3 text-left">
          <p className="mb-1 text-xs tracking-widest text-amber-400">你的秘密 · 只有你知道</p>
          <p className="text-sm leading-6 text-amber-100/90">{character.secret}</p>
        </div>

        <p className="text-xs text-neutral-400">{memory.label}</p>

        <button
          type="button"
          onClick={onEnter}
          className="mt-1 rounded-md border bg-black/40 px-7 py-3 font-medium transition hover:bg-black/70"
          style={{ borderColor: memory.accent, color: memory.accent }}
        >
          进入现场
        </button>
      </div>
    </div>
  );
}
