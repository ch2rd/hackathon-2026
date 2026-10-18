/**
 * 游戏全局 store（B 维护，Zustand）。
 *
 * 职责（AGENTS.md §3.3）：API 调用、轮询、错误状态、身份持久化。
 * 页面组件只从这里取数和派发动作，不直接 fetch、不写状态机。
 *
 * 关于依赖注入：本文件不 import `src/api`（那是 C 的，尚未落地），
 * 而是声明一个与 §5.4 函数签名逐字一致的 `RoomsApi` 端口；
 * 页面入口用 `configureRoomsApi()` 注入 C 的真实/Mock 实现。
 * 这样 Mock-first 与真实模式共用同一套 store 逻辑。
 */

import { create } from 'zustand';
import * as roomsApi from '../api/rooms';
import type { RoomContext } from '../types/api';
import type { RoomState } from '../types/models';

// ---------- RoomsApi 端口（签名逐字来自 AGENTS.md §5.4 + C 扩展的 getRoomContext） ----------

export interface RoomsApi {
  getRoomState(roomId: string, playerId: string): Promise<RoomState>;
  getRoomContext(roomId: string, playerId: string): Promise<RoomContext>;
  selectCharacter(roomId: string, playerId: string, characterId: string): Promise<RoomState>;
  setReady(roomId: string, playerId: string, isReady: boolean): Promise<RoomState>;
  startRoom(roomId: string, playerId: string): Promise<RoomState>;
  nextAct(roomId: string, playerId: string): Promise<RoomState>;
  submitVote(roomId: string, voterPlayerId: string, targetPlayerId: string): Promise<RoomState>;
  finishRoom(roomId: string, playerId: string): Promise<RoomState>;
}

let injectedApi: RoomsApi | null = null;

/** 页面入口（或测试）注入实现；重复调用以最后一次为准。 */
export function configureRoomsApi(api: RoomsApi): void {
  injectedApi = api;
}

function requireApi(): RoomsApi {
  if (!injectedApi) {
    throw new Error('RoomsApi 未注入：请在入口调用 configureRoomsApi（C 提供 src/api 实现）');
  }
  return injectedApi;
}

// ---------- 错误规范化（结构对齐 §5.1/§5.2，不做第二套定义） ----------

export interface GameApiError {
  code: string;
  message: string;
}

/** 从 unknown 错误里提取 { code, message }；网络层错误归一为 NETWORK_ERROR。 */
export function readApiError(error: unknown): GameApiError {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown };
    if (typeof candidate.code === 'string') {
      return { code: candidate.code, message: typeof candidate.message === 'string' ? candidate.message : '请求失败' };
    }
  }
  return { code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : '网络异常，请稍后重试' };
}

/** 这些错误说明本地状态已过期，需要立刻重新拉取房间状态。 */
const RESYNC_ERROR_CODES = new Set(['INVALID_STATE', 'FORBIDDEN', 'NOT_FOUND', 'ROOM_FULL']);

// ---------- 身份持久化（昵称 + 房间号 + 本地 playerId，§0.1） ----------

const IDENTITY_KEY = 'zhenxiangju:identity';

export interface RoomIdentity {
  roomId: string;
  playerId: string;
}

export function saveIdentity(identity: RoomIdentity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function loadIdentity(): RoomIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' && parsed !== null &&
      typeof (parsed as RoomIdentity).roomId === 'string' &&
      typeof (parsed as RoomIdentity).playerId === 'string'
    ) {
      return parsed as RoomIdentity;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY);
}

// ---------- store ----------

export type ConnectionStatus = 'idle' | 'syncing' | 'online' | 'offline';

export interface GameStoreState {
  roomId: string | null;
  playerId: string | null;
  roomState: RoomState | null;
  /** 剧本静态数据（幕/角色/线索），供 selectors 与状态机使用；进房后拉取一次 */
  context: RoomContext | null;
  status: ConnectionStatus;
  /** 房间动作（选角/准备/投票等）进行中标记，页面据此禁用按钮 */
  isActing: boolean;
  /** 最近一次动作或轮询的错误；null = 无错误 */
  error: GameApiError | null;
}

export interface GameStoreActions {
  enterRoom(identity: RoomIdentity): void;
  leaveRoom(): void;
  /** 立即轮询一次（不等定时器） */
  pollOnce(): Promise<void>;
  /** 拉取剧本静态上下文（已拉过则跳过） */
  ensureContext(): Promise<void>;
  startPolling(intervalMs?: number): void;
  stopPolling(): void;
  runRoomAction(action: (api: RoomsApi, roomId: string, playerId: string) => Promise<RoomState>): Promise<boolean>;
  selectCharacter(characterId: string): Promise<boolean>;
  setReady(isReady: boolean): Promise<boolean>;
  startRoom(): Promise<boolean>;
  nextAct(): Promise<boolean>;
  submitVote(targetPlayerId: string): Promise<boolean>;
  finishRoom(): Promise<boolean>;
}

export const POLL_INTERVAL_MS = 2000;

type GameStore = GameStoreState & GameStoreActions;

let pollTimer: ReturnType<typeof setInterval> | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  roomId: null,
  playerId: null,
  roomState: null,
  context: null,
  status: 'idle',
  isActing: false,
  error: null,

  enterRoom(identity) {
    saveIdentity(identity);
    set({ ...identity, roomState: null, context: null, status: 'syncing', error: null, isActing: false });
  },

  leaveRoom() {
    get().stopPolling();
    clearIdentity();
    set({ roomId: null, playerId: null, roomState: null, context: null, status: 'idle', error: null, isActing: false });
  },

  async ensureContext() {
    const { roomId, playerId, context } = get();
    if (!roomId || !playerId || context) return;
    try {
      set({ context: await requireApi().getRoomContext(roomId, playerId) });
    } catch (error) {
      set({ error: readApiError(error) });
    }
  },

  async pollOnce() {
    const { roomId, playerId } = get();
    if (!roomId || !playerId) return;
    try {
      const roomState = await requireApi().getRoomState(roomId, playerId);
      // 轮询成功：覆盖本地状态、清掉旧错误，但不打断“动作进行中”标记
      set({ roomState, status: 'online', error: null });
      if (roomState.room.status === 'ended') get().stopPolling();
    } catch (error) {
      set({ status: 'offline', error: readApiError(error) });
    }
  },

  startPolling(intervalMs = POLL_INTERVAL_MS) {
    if (pollTimer) return;
    void get().pollOnce();
    pollTimer = setInterval(() => void get().pollOnce(), intervalMs);
  },

  stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  },

  async runRoomAction(action) {
    const { roomId, playerId } = get();
    if (!roomId || !playerId) {
      set({ error: { code: 'INVALID_STATE', message: '尚未加入房间' } });
      return false;
    }
    set({ isActing: true });
    try {
      const roomState = await action(requireApi(), roomId, playerId);
      set({ roomState, status: 'online', error: null, isActing: false });
      if (roomState.room.status === 'ended') get().stopPolling();
      return true;
    } catch (error) {
      const apiError = readApiError(error);
      set({ error: apiError, isActing: false });
      // 状态冲突类错误：服务端才是权威，立即重新同步（game-flow.md §4）
      if (RESYNC_ERROR_CODES.has(apiError.code)) {
        await get().pollOnce();
        // 同步成功后保留动作错误，页面才能展示「角色已被选走」这类提示
        set({ error: apiError });
      }
      return false;
    }
  },

  selectCharacter(characterId) {
    return get().runRoomAction((api, roomId, playerId) => api.selectCharacter(roomId, playerId, characterId));
  },
  setReady(isReady) {
    return get().runRoomAction((api, roomId, playerId) => api.setReady(roomId, playerId, isReady));
  },
  startRoom() {
    return get().runRoomAction((api, roomId, playerId) => api.startRoom(roomId, playerId));
  },
  nextAct() {
    return get().runRoomAction((api, roomId, playerId) => api.nextAct(roomId, playerId));
  },
  submitVote(targetPlayerId) {
    return get().runRoomAction((api, roomId, playerId) => api.submitVote(roomId, playerId, targetPlayerId));
  },
  finishRoom() {
    return get().runRoomAction((api, roomId, playerId) => api.finishRoom(roomId, playerId));
  },
}));

// 默认接线：C 的 src/api/rooms.ts 与端口签名一致，直接注入。
// 测试里再用 configureRoomsApi(fakeApi) 覆盖即可。
configureRoomsApi(roomsApi);
