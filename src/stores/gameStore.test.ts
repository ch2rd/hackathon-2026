/**
 * gameStore 测试：轮询、身份持久化、错误处理与冲突重同步。
 * 用注入的假 RoomsApi（vi.fn）驱动，不依赖 src/api 落地。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoomState } from '../types/models';
import {
  clearIdentity,
  configureRoomsApi,
  loadIdentity,
  readApiError,
  saveIdentity,
  useGameStore,
  type RoomsApi,
} from './gameStore';

function makeRoomState(overrides?: Partial<RoomState['room']>): RoomState {
  return {
    room: {
      id: 'r1', code: 'ABC234', scriptId: 's1', hostPlayerId: 'p1',
      status: 'waiting', currentAct: 0, createdAt: '2026-10-18T00:00:00.000Z',
      ...overrides,
    },
    players: [
      { id: 'p1', nickname: '小A', characterId: null, characterName: null, isHost: true, isReady: false },
    ],
    currentAct: null,
    me: {
      player: { id: 'p1', roomId: 'r1', nickname: '小A', characterId: null, isHost: true, isReady: false, joinedAt: '2026-10-18T00:00:00.000Z' },
      character: null,
      visibleClues: [],
    },
    messages: [],
    votes: [],
    result: null,
  };
}

function makeApi(state: RoomState = makeRoomState()): RoomsApi {
  return {
    getRoomState: vi.fn().mockResolvedValue(state),
    getRoomContext: vi.fn().mockResolvedValue({ acts: [], characters: [], clues: [], murdererCharacterId: null }),
    selectCharacter: vi.fn().mockResolvedValue(state),
    setReady: vi.fn().mockResolvedValue(state),
    startRoom: vi.fn().mockResolvedValue(state),
    nextAct: vi.fn().mockResolvedValue(state),
    submitVote: vi.fn().mockResolvedValue(state),
    finishRoom: vi.fn().mockResolvedValue(state),
  };
}

const store = () => useGameStore.getState();

beforeEach(() => {
  localStorage.clear();
  useGameStore.setState({ roomId: null, playerId: null, roomState: null, context: null, status: 'idle', isActing: false, error: null });
});

afterEach(() => {
  store().stopPolling();
  vi.useRealTimers();
});

describe('身份持久化（§3.3：刷新可恢复）', () => {
  it('save/load/clear 往返，损坏 JSON 返回 null', () => {
    saveIdentity({ roomId: 'r1', playerId: 'p1' });
    expect(loadIdentity()).toEqual({ roomId: 'r1', playerId: 'p1' });
    localStorage.setItem('zhenxiangju:identity', '{坏掉的json');
    expect(loadIdentity()).toBeNull();
    clearIdentity();
    expect(loadIdentity()).toBeNull();
  });

  it('enterRoom 写入身份，leaveRoom 清除', () => {
    store().enterRoom({ roomId: 'r1', playerId: 'p2' });
    expect(loadIdentity()).toEqual({ roomId: 'r1', playerId: 'p2' });
    store().leaveRoom();
    expect(loadIdentity()).toBeNull();
    expect(store().roomId).toBeNull();
  });
});

describe('轮询', () => {
  it('enterRoom 后 startPolling 每 2 秒拉一次状态', async () => {
    const api = makeApi();
    configureRoomsApi(api);
    vi.useFakeTimers();
    store().enterRoom({ roomId: 'r1', playerId: 'p1' });
    store().startPolling();
    await vi.advanceTimersByTimeAsync(4500);
    expect(api.getRoomState).toHaveBeenCalledTimes(3); // 立即 1 次 + 2s/4s 各 1 次
    expect(store().roomState?.room.id).toBe('r1');
    expect(store().status).toBe('online');
  });

  it('房间 ended 后自动停止轮询', async () => {
    const api = makeApi(makeRoomState({ status: 'ended' }));
    configureRoomsApi(api);
    vi.useFakeTimers();
    store().enterRoom({ roomId: 'r1', playerId: 'p1' });
    store().startPolling();
    await vi.advanceTimersByTimeAsync(6000);
    expect(api.getRoomState).toHaveBeenCalledTimes(1);
  });

  it('轮询失败进入 offline，不清空已有数据；恢复后回到 online', async () => {
    const api = makeApi();
    configureRoomsApi(api);
    store().enterRoom({ roomId: 'r1', playerId: 'p1' });
    await store().pollOnce();
    expect(store().status).toBe('online');
    (api.getRoomState as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('fetch failed'));
    await store().pollOnce();
    expect(store().status).toBe('offline');
    expect(store().roomState).not.toBeNull();
    await store().pollOnce();
    expect(store().status).toBe('online');
  });
});

describe('房间动作与错误处理', () => {
  it('动作成功时直接用返回值覆盖本地状态', async () => {
    const state = makeRoomState({ status: 'selecting' });
    const api = makeApi(state);
    configureRoomsApi(api);
    store().enterRoom({ roomId: 'r1', playerId: 'p1' });
    const ok = await store().setReady(true);
    expect(ok).toBe(true);
    expect(api.setReady).toHaveBeenCalledWith('r1', 'p1', true);
    expect(store().roomState?.room.status).toBe('selecting');
    expect(store().error).toBeNull();
  });

  it('INVALID_STATE：记录错误并立即重新同步', async () => {
    const conflict = Object.assign(new Error('角色已被选走'), { code: 'INVALID_STATE', message: '角色已被选走' });
    const fresh = makeRoomState({ status: 'selecting' });
    const api = makeApi();
    (api.selectCharacter as ReturnType<typeof vi.fn>).mockRejectedValue(conflict);
    (api.getRoomState as ReturnType<typeof vi.fn>).mockResolvedValue(fresh);
    configureRoomsApi(api);
    store().enterRoom({ roomId: 'r1', playerId: 'p1' });
    const ok = await store().selectCharacter('c1');
    expect(ok).toBe(false);
    expect(store().error?.code).toBe('INVALID_STATE');
    // 重同步以服务端为权威（game-flow.md §4）
    expect(api.getRoomState).toHaveBeenCalled();
    expect(store().roomState?.room.status).toBe('selecting');
  });

  it('未进入房间就动作：返回 false 并给出 INVALID_STATE', async () => {
    configureRoomsApi(makeApi());
    const ok = await store().nextAct();
    expect(ok).toBe(false);
    expect(store().error).toEqual({ code: 'INVALID_STATE', message: '尚未加入房间' });
  });

  it('网络层错误归一为 NETWORK_ERROR，服务端错误保留 code', () => {
    expect(readApiError(new Error('boom'))).toEqual({ code: 'NETWORK_ERROR', message: 'boom' });
    expect(readApiError(Object.assign(new Error('x'), { code: 'FORBIDDEN', message: '不是房主' })))
      .toEqual({ code: 'FORBIDDEN', message: '不是房主' });
  });
});
