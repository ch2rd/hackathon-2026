/**
 * 《真相局》API 契约类型（C 维护）。
 *
 * 这里只放「HTTP 层 / 取数契约」相关类型；业务数据模型一律在 models.ts。
 * 与 AGENTS.md §5 对齐，改动必须走 §3.6 变更流程。
 */

import type {
  CharacterPublic,
  ChatChannel,
  Clue,
  Player,
  Room,
  ScriptAct,
} from './models';

/**
 * AGENTS.md §5.2 的错误码，外加两个前端兜底码（不会由服务端返回）。
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'ROOM_FULL'
  | 'INVALID_STATE'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'AI_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT';

/** 服务端错误体：{ "error": { "code": "...", "message": "..." } } */
export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
}

/** 创建 / 加入房间的返回：房间 + 当前玩家。 */
export interface RoomSession {
  room: Room;
  player: Player;
}

/**
 * 状态机运转所需的剧本静态数据。
 *
 * 为什么需要它：AGENTS.md §5.3 的 P0 接口表里，`GET /api/scripts/:scriptId`
 * 只给到 ScriptDetail（不含幕与线索），`GET /api/rooms/:roomId/state` 只给到
 * 「当前幕 + 当前玩家可见线索」。而 B 的 `src/game/stateMachine.ts` 的
 * `GameContext` 需要「全部幕 / 全部线索」才能算可见性与结局，其注释也写明
 * 「由 src/api 提供」。
 *
 * 因此这是 §5.3 之外**新增**的取数契约（C 负责，已在 docs/api.md 登记），
 * 结构与 `GameContext` 兼容，B 可直接赋值。
 *
 * 安全约束（§3.4 验收标准）：
 * - `clues` 只允许包含「公开线索 + 当前玩家自己的私密线索」；
 * - `murdererCharacterId` **只在 Mock 模式非空**；真实模式一律为 null，
 *   结局揭晓前服务端绝不下发。
 */
export interface RoomContext {
  acts: ScriptAct[];
  characters: CharacterPublic[];
  clues: Clue[];
  murdererCharacterId: string | null;
}

export interface SendMessageInput {
  channel: ChatChannel;
  receiverPlayerId?: string;
  content: string;
  clueId?: string;
}
