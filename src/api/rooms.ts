/**
 * 房间与游戏进程接口（C 维护）—— A/B 只 import 这里的函数。
 *
 * 所有返回 `RoomState` 的操作，都是「服务端（或 Mock）算完权威状态再回传」，
 * B 的 gameStore 拿到后直接覆盖本地状态即可（AGENTS.md §4.11）。
 */

import type { ApiAdapter, CreateRoomInput, JoinRoomInput } from './adapter';
import { isMockMode } from './client';
import { httpAdapter } from './httpAdapter';
import { mockAdapter } from './mockAdapter';

const adapter: ApiAdapter = isMockMode() ? mockAdapter : httpAdapter;

/** 创建房间，创建者自动成为房主。 */
export function createRoom(input: CreateRoomInput) {
  return adapter.createRoom(input);
}

/** 用 6 位房间号加入房间。 */
export function joinRoom(input: JoinRoomInput) {
  return adapter.joinRoom(input);
}

/** 轮询房间状态（每 2 秒一次，见 docs/game-flow.md 第四节）。 */
export function getRoomState(roomId: string, playerId: string) {
  return adapter.getRoomState(roomId, playerId);
}

/**
 * 状态机所需的剧本静态数据（幕 / 公开展示的角色 / 当前玩家可见线索）。
 *
 * 真实模式下 `murdererCharacterId` 恒为 null，结局前不下发；
 * 返回结构可直接作为 `GameContext` 使用。
 */
export function getRoomContext(roomId: string, playerId: string) {
  return adapter.getRoomContext(roomId, playerId);
}

/** 选角。已准备好的玩家必须先取消准备。 */
export function selectCharacter(roomId: string, playerId: string, characterId: string) {
  return adapter.selectCharacter(roomId, playerId, characterId);
}

/** 准备 / 取消准备。全部玩家准备后自动进入 playing。 */
export function setReady(roomId: string, playerId: string, isReady: boolean) {
  return adapter.setReady(roomId, playerId, isReady);
}

/** 房主开始游戏：waiting → selecting。 */
export function startRoom(roomId: string, playerId: string) {
  return adapter.startRoom(roomId, playerId);
}

/** 房主推进下一幕；最后一幕结束后进入 voting。 */
export function nextAct(roomId: string, playerId: string) {
  return adapter.nextAct(roomId, playerId);
}

/** 投票：每人一次，不能投自己；全部投完自动进入 ended。 */
export function submitVote(roomId: string, voterPlayerId: string, targetPlayerId: string) {
  return adapter.submitVote(roomId, voterPlayerId, targetPlayerId);
}

/** 演示兜底：房主强制结束（只在 `VITE_DEMO_MODE=true` 时由 UI 暴露）。 */
export function finishRoom(roomId: string, playerId: string) {
  return adapter.finishRoom(roomId, playerId);
}

export function sendMessage(roomId: string, playerId: string, input: import('../types/api').SendMessageInput) {
  return adapter.sendMessage(roomId, playerId, input);
}

export function confirmStoryRead(roomId: string, playerId: string) {
  return adapter.confirmStoryRead(roomId, playerId);
}
