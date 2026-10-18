/**
 * 房间服务（C 维护）。
 *
 * 这一层刻意做得很薄：**规则只有一份**，全在 `src/mocks/mockEngine.ts`。
 * 真实后端和前端 Mock 调的是同一组函数，所以两边的状态机、错误码、
 * 越权过滤永远一致，不存在「Mock 能过、真实接口不能过」。
 *
 * 这里只负责：取剧本目录 → 读写存储 → 调用引擎。
 */

import type { RoomContext, RoomSession } from '../../types/api';
import type {
  AIHint,
  ListResult,
  RoomState,
  ScriptDetail,
  ScriptSummary,
} from '../../types/models';
import {
  buildAIHint,
  createRoom,
  finishRoom,
  joinRoom,
  listScripts,
  nextAct,
  readRoomContext,
  readRoomState,
  readScriptDetail,
  selectCharacter,
  setReady,
  startRoom,
  submitVote,
} from '../../mocks/mockEngine';
import { mutate, read } from '../store/roomStore';
import { getCatalog } from './scriptService';

export async function getScripts(params: {
  genre?: string;
  keyword?: string;
}): Promise<ListResult<ScriptSummary>> {
  return listScripts(await getCatalog(), params);
}

export async function getScriptDetail(scriptId: string): Promise<ScriptDetail> {
  return readScriptDetail(await getCatalog(), scriptId);
}

export async function createRoomSession(input: {
  scriptId: string;
  nickname: string;
}): Promise<RoomSession> {
  const catalog = await getCatalog();
  return mutate((db) => createRoom(db, catalog, input.nickname, input.scriptId));
}

export async function joinRoomSession(input: {
  code: string;
  nickname: string;
}): Promise<RoomSession> {
  const catalog = await getCatalog();
  return mutate((db) => joinRoom(db, catalog, input.code, input.nickname));
}

export async function getRoomState(roomId: string, playerId: string): Promise<RoomState> {
  const catalog = await getCatalog();
  return read((db) => readRoomState(db, catalog, roomId, playerId));
}

export async function getRoomContext(roomId: string, playerId: string): Promise<RoomContext> {
  const catalog = await getCatalog();
  const context = await read((db) => readRoomContext(db, catalog, roomId, playerId));

  // 安全红线（AGENTS.md §3.4）：真实模式绝不下发凶手。
  // 结局揭晓走 room.state.result（status === 'ended' 才有），不从这里漏。
  return { ...context, murdererCharacterId: null };
}

export async function chooseCharacter(
  roomId: string,
  playerId: string,
  characterId: string,
): Promise<RoomState> {
  const catalog = await getCatalog();
  return mutate((db) => selectCharacter(db, catalog, roomId, playerId, characterId));
}

export async function updateReady(
  roomId: string,
  playerId: string,
  isReady: boolean,
): Promise<RoomState> {
  const catalog = await getCatalog();
  return mutate((db) => setReady(db, catalog, roomId, playerId, isReady));
}

export async function beginGame(roomId: string, playerId: string): Promise<RoomState> {
  const catalog = await getCatalog();
  return mutate((db) => startRoom(db, catalog, roomId, playerId));
}

export async function advanceAct(roomId: string, playerId: string): Promise<RoomState> {
  const catalog = await getCatalog();
  return mutate((db) => nextAct(db, catalog, roomId, playerId));
}

export async function vote(
  roomId: string,
  voterPlayerId: string,
  targetPlayerId: string,
): Promise<RoomState> {
  const catalog = await getCatalog();
  return mutate((db) => submitVote(db, catalog, roomId, voterPlayerId, targetPlayerId));
}

export async function endGame(roomId: string, playerId: string): Promise<RoomState> {
  const catalog = await getCatalog();
  return mutate((db) => finishRoom(db, catalog, roomId, playerId));
}

/** 确定性兜底提示（无 Key / 超时 / 解析失败时使用）。 */
export async function mockHint(roomId: string, playerId: string): Promise<AIHint> {
  const catalog = await getCatalog();
  return read((db) => buildAIHint(db, catalog, roomId, playerId));
}
