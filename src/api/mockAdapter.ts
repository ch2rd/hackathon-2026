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
  buildAIChatReply,
  buildAIHint,
  confirmStoryRead,
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
  sendMessage,
  setReady,
  startRoom,
  submitVote,
  toCatalog,
} from '../mocks/mockEngine';
import { loadScriptBundles } from '../mocks/scriptCatalog';
import type { VoiceSignal } from '../types/models';
import type { ApiAdapter, SendSignalInput } from './adapter';
import { ApiError } from './client';

const STORAGE_KEY = 'truth-bureau/mock-state/v1';

/**
 * 语音信令队列（与房间状态分开存）。
 *
 * 为什么不塞进 MockDb：信令是**高频、短命、取走即删**的传输数据，
 * 而 MockDb 是房间状态快照（roomStore 也按那个形状读盘）。混在一起会让
 * 状态文件每次轮询都重写一遍，还会把信令写进持久化存储。
 */
const SIGNAL_KEY = 'truth-bureau/mock-signals/v1';
/** 超过 60 秒的信令直接丢弃（WebRTC 握手早超时了，留着只会拖慢轮询）。 */
const SIGNAL_TTL_MS = 60_000;
/** 队列上限，防止某个标签页离开后堆积。 */
const SIGNAL_MAX = 200;

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
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
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

function readSignals(): VoiceSignal[] {
  try {
    const raw = localStorage.getItem(SIGNAL_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return (parsed as VoiceSignal[]).filter(
      (signal) => typeof signal?.createdAt === 'string' && now - Date.parse(signal.createdAt) < SIGNAL_TTL_MS,
    );
  } catch {
    // 存储被禁用或数据损坏：信令丢了顶多连不上语音，不该拖垮整个游戏
    return [];
  }
}

function writeSignals(signals: VoiceSignal[]): void {
  try {
    localStorage.setItem(SIGNAL_KEY, JSON.stringify(signals.slice(-SIGNAL_MAX)));
  } catch {
    // 同上：静默失败，不抛错
  }
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

  async confirmStoryRead(roomId, playerId) {
    const catalog = await loadCatalog();
    const db = readDb();
    const state = confirmStoryRead(db, catalog, roomId, playerId);
    writeDb(db);
    return state;
  },
  async sendMessage(roomId, playerId, input) {
    const catalog = await loadCatalog();
    const db = readDb();
    const state = sendMessage(db, catalog, roomId, playerId, input);
    writeDb(db);
    return state;
  },
  async getAIHint(roomId, playerId) {
    return buildAIHint(readDb(), await loadCatalog(), roomId, playerId);
  },

  async askAiDm(question) {
    return buildAIChatReply(question);
  },

  async sendSignal(input: SendSignalInput) {
    const signal: VoiceSignal = {
      id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...input,
      createdAt: new Date().toISOString(),
    };
    writeSignals([...readSignals(), signal]);
  },

  async pollSignals(roomId, playerId) {
    const all = readSignals();
    const mine = all.filter((signal) => signal.roomId === roomId && signal.toPlayerId === playerId);
    if (mine.length > 0) {
      writeSignals(all.filter((signal) => !mine.includes(signal)));
    }
    return mine;
  },
};
