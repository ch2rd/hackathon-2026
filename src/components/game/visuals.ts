/**
 * 剧情视觉化所需的纯函数（B 维护，只服务 game 组件渲染）。
 *
 * 不做任何「写死具体剧本/角色」的事：场景与立绘都靠通用关键词启发式映射，
 * 换一个剧本也能落到默认画面，不会白屏也不会报错。
 */

/** 场景标识：SceneBackdrop 据此画不同的程序化背景。 */
export type SceneKey =
  | 'belltower' // 钟楼
  | 'study' // 书房
  | 'hall' // 门厅
  | 'greenhouse' // 温室
  | 'pharmacy' // 药房
  | 'kitchen' // 厨房
  | 'fog' // 雾夜
  | 'night'; // 通用夜色

/** 立绘配饰：CharacterSprite 据此在剪影上加可辨识的轮廓细节。 */
export type SpriteRole =
  | 'butler' // 管家
  | 'doctor' // 医生
  | 'reporter' // 记者
  | 'maid' // 女仆
  | 'gardener' // 园丁
  | 'heir' // 继承人
  | 'generic';

interface KeywordRule<T extends string> {
  key: T;
  words: string[];
}

const ROLE_RULES: Array<KeywordRule<SpriteRole>> = [
  { key: 'butler', words: ['管家', '执事'] },
  { key: 'doctor', words: ['医生', '医师', '医护'] },
  { key: 'reporter', words: ['记者', '报社', '摄影师'] },
  { key: 'maid', words: ['女仆', '侍女', '佣人'] },
  { key: 'gardener', words: ['园丁', '花匠'] },
  { key: 'heir', words: ['继承人', '少爷', '公子', '少东'] },
];

/** 根据幕号解析出场背景：第 1 幕夜色，其后收束到钟楼。 */
export function resolveActScene(actNumber: number): SceneKey {
  return actNumber >= 2 ? 'belltower' : 'night';
}

/** 根据角色身份文案解析立绘配饰。 */
export function resolveSpriteRole(identity: string): SpriteRole {
  for (const rule of ROLE_RULES) {
    if (rule.words.some((word) => identity.includes(word))) return rule.key;
  }
  return 'generic';
}

// ---------- 回忆滤镜（每个角色的画面观感都不同） ----------

export interface MemoryFilter {
  /** 套在场景画面上的 CSS filter，做出「回忆」质感 */
  filter: string;
  /** 滤镜的说明文案（出场声明里展示） */
  label: string;
  /** 角色主题色（出场声明的点缀） */
  accent: string;
}

const MEMORY_FILTERS: Record<SpriteRole, MemoryFilter> = {
  butler: { filter: 'sepia(0.25) saturate(0.55) hue-rotate(185deg) brightness(0.92)', label: '冷灰的旧忆', accent: '#c8a96a' },
  doctor: { filter: 'sepia(0.18) saturate(0.65) hue-rotate(150deg)', label: '药水气味的记忆', accent: '#7fb3c0' },
  reporter: { filter: 'sepia(0.55) saturate(0.75) contrast(0.95)', label: '泛黄的剪报', accent: '#c08a5a' },
  maid: { filter: 'sepia(0.3) saturate(0.7) brightness(1.06) hue-rotate(-12deg)', label: '温柔的旧时光', accent: '#c98a9a' },
  gardener: { filter: 'sepia(0.22) saturate(0.75) hue-rotate(55deg)', label: '温室里的绿意', accent: '#8ab07a' },
  heir: { filter: 'sepia(0.45) saturate(0.85) contrast(1.05) hue-rotate(-18deg)', label: '镀金的家族记忆', accent: '#c89a4a' },
  generic: { filter: 'sepia(0.25) saturate(0.7)', label: '模糊的往事', accent: '#a7a29a' },
};

/** 根据角色身份文案解析回忆滤镜（复用到立绘配饰的同一套角色分类）。 */
export function resolveMemoryFilter(identity: string): MemoryFilter {
  return MEMORY_FILTERS[resolveSpriteRole(identity)];
}
