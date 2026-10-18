/**
 * 适配器契约（C 维护）。
 *
 * Mock 与真实 HTTP 必须实现**同一个接口**，保证 A/B 切换模式时
 * 函数签名、返回类型、错误行为完全一致（AGENTS.md §1.2 第 2 条）。
 * 任何一侧少实现一个方法，typecheck 就会拦下来。
 */

import type {
  AIHint,
  Genre,
  ListResult,
  RoomState,
  ScriptDetail,
  ScriptSummary,
} from '../types/models';
import type { RoomContext, RoomSession } from '../types/api';

export interface CreateRoomInput {
  scriptId: string;
  nickname: string;
}

export interface JoinRoomInput {
  code: string;
  nickname: string;
}

export interface ScriptQuery {
  genre?: Genre;
  keyword?: string;
}

export interface ApiAdapter {
  // ---- 剧本 ----
  getScripts(params?: ScriptQuery): Promise<ListResult<ScriptSummary>>;
  getScriptDetail(scriptId: string): Promise<ScriptDetail>;

  // ---- 房间 ----
  createRoom(input: CreateRoomInput): Promise<RoomSession>;
  joinRoom(input: JoinRoomInput): Promise<RoomSession>;
  getRoomState(roomId: string, playerId: string): Promise<RoomState>;
  getRoomContext(roomId: string, playerId: string): Promise<RoomContext>;

  // ---- 房间内的操作 ----
  selectCharacter(roomId: string, playerId: string, characterId: string): Promise<RoomState>;
  setReady(roomId: string, playerId: string, isReady: boolean): Promise<RoomState>;
  startRoom(roomId: string, playerId: string): Promise<RoomState>;
  nextAct(roomId: string, playerId: string): Promise<RoomState>;
  submitVote(roomId: string, voterPlayerId: string, targetPlayerId: string): Promise<RoomState>;
  finishRoom(roomId: string, playerId: string): Promise<RoomState>;

  // ---- AI ----
  getAIHint(roomId: string, playerId: string): Promise<AIHint>;
}
