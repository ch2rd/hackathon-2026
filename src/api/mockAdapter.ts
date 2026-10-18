/**
 * Mock 适配器（C 维护）—— **只负责存储与取数**，游戏规则全在 mockEngine。
 *
 * Mock-first 策略的落地（AGENTS.md §1.2）：
 * - 剧本数据来自 `data/scripts/*.json`（与后端 seed 同一份），按 id 查表，不写死任何剧本；
 * - 房间/玩家/投票存在 localStorage，多标签页共享；
 * - 错误统一抛 `ApiError`，错误码语义与真实模式一致。
 *
 * 多标签页：每次调用都重新读取 localStorage（不做内存缓存），
 * 因此 A/B 的 2 秒轮询天然能看到其它标签页写入的新状态。
 */

import type { ScriptCatalog, MockDb } from '../mocks/mockEngine';
import {
  buildAIHint,
  createRoom,
  emptyDb,
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
  toCatalog,
} from '../mocks/mockEngine';
import { loadScriptBundles } from '../mocks/scriptCatalog';
import type { ApiAdapter } from './adapter';
import { ApiError } from './client';

const STORAGE_KEY = 'truth-bureau/mock-state/v1';

function readDb(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw) as Partial<MockDb> | null;
    if (!parsed || typeof parsed !== 'object') return emptyDb();
    return {
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
      players: Array.isArray(parsed.players) ? parsed.players : [],
      votes: Array.isArray(parsed.votes) ? parsed.votes : [],
    };
  } catch {
    // 存储被禁用或数据损坏时，宁可开一个干净房间，也不要白屏
    return emptyDb();
  }
}

function writeDb(db: MockDb): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    throw new ApiError('INTERNAL_ERROR', '本地存储不可用，Mock 模式无法保存房间');
  }
}

async function loadCatalog(): Promise<ScriptCatalog> {
  return toCatalog(await loadScriptBundles());
}

export const mockAdapter: ApiAdapter = {
  async getScripts(params) {
    return listScripts(await loadCatalog(), params);
  },

  async getScriptDetail(scriptId) {
    return readScriptDetail(await loadCatalog(), scriptId);
  },

  async createRoom(input) {
    const catalog = await loadCatalog();
    const db = readDb();
    const session = createRoom(db, catalog, input.nickname, input.scriptId);
    writeDb(db);
    return session;
  },

  async joinRoom(input) {
    const catalog = await loadCatalog();
    const db = readDb();
    const session = joinRoom(db, catalog, input.code, input.nickname);
    writeDb(db);
    return session;
  },

  async getRoomState(roomId, playerId) {
    return readRoomState(readDb(), await loadCatalog(), roomId, playerId);
  },

  async getRoomContext(roomId, playerId) {
    return readRoomContext(readDb(), await loadCatalog(), roomId, playerId);
  },

  async selectCharacter(roomId, playerId, characterId) {
    const catalog = await loadCatalog();
    const db = readDb();
    const state = selectCharacter(db, catalog, roomId, playerId, characterId);
    writeDb(db);
    return state;
  },

  async setReady(roomId, playerId, isReady) {
    const catalog = await loadCatalog();
    const db = readDb();
    const state = setReady(db, catalog, roomId, playerId, isReady);
    writeDb(db);
    return state;
  },

  async startRoom(roomId, playerId) {
    const catalog = await loadCatalog();
    const db = readDb();
    const state = startRoom(db, catalog, roomId, playerId);
    writeDb(db);
    return state;
  },

  async nextAct(roomId, playerId) {
    const catalog = await loadCatalog();
    const db = readDb();
    const state = nextAct(db, catalog, roomId, playerId);
    writeDb(db);
    return state;
  },

  async submitVote(roomId, voterPlayerId, targetPlayerId) {
    const catalog = await loadCatalog();
    const db = readDb();
    const state = submitVote(db, catalog, roomId, voterPlayerId, targetPlayerId);
    writeDb(db);
    return state;
  },

  async finishRoom(roomId, playerId) {
    const catalog = await loadCatalog();
    const db = readDb();
    const state = finishRoom(db, catalog, roomId, playerId);
    writeDb(db);
    return state;
  },

  async getAIHint(roomId, playerId) {
    return buildAIHint(readDb(), await loadCatalog(), roomId, playerId);
  },
};
