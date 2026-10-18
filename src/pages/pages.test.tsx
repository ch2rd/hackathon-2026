/**
 * 页面集成测试（B）：RoomPage / GamePage / EndingPage。
 *
 * 验证 §3.3 验收标准：每个 RoomStatus 有对应 UI、状态间自动跳转、
 * 刷新后按 localStorage 身份恢复、投票限制、动作调用正确的 api 函数。
 * 用 MemoryRouter + 注入假 RoomsApi，不依赖后端与 A 的 router.tsx。
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoomState, ScriptAct } from '../types/models';
import { EndingPage } from '../pages/EndingPage';
import { GamePage } from '../pages/GamePage';
import { RoomPage } from '../pages/RoomPage';
import { configureRoomsApi, useGameStore, type RoomsApi } from '../stores/gameStore';

const act1: ScriptAct = { id: 'act1', scriptId: 's1', actNumber: 1, title: '第一幕·停电', narration: '雷声过后，庄园陷入黑暗。' };
const act2: ScriptAct = { id: 'act2', scriptId: 's1', actNumber: 2, title: '第二幕·证词', narration: '每个人都有自己的说法。' };

function makeRoomState(overrides?: {
  room?: Partial<RoomState['room']>;
  players?: RoomState['players'];
  currentAct?: RoomState['currentAct'];
  votes?: RoomState['votes'];
  result?: RoomState['result'];
}): RoomState {
  return {
    room: {
      id: 'r1', code: 'ABC234', scriptId: 's1', hostPlayerId: 'p1',
      status: 'waiting', currentAct: 0, createdAt: '2026-10-18T00:00:00.000Z',
      ...overrides?.room,
    },
    players: overrides?.players ?? [
      { id: 'p1', nickname: '小A', characterId: null, characterName: null, isHost: true, isReady: false },
      { id: 'p2', nickname: '小B', characterId: null, characterName: null, isHost: false, isReady: false },
    ],
    currentAct: overrides?.currentAct ?? null,
    me: {
      player: { id: 'p1', roomId: 'r1', nickname: '小A', characterId: null, isHost: true, isReady: false, joinedAt: '2026-10-18T00:00:00.000Z' },
      character: null,
      visibleClues: [],
    },
    votes: overrides?.votes ?? [],
    result: overrides?.result ?? null,
  };
}

function makeApi(state: RoomState): RoomsApi {
  return {
    getRoomState: vi.fn().mockResolvedValue(state),
    getRoomContext: vi.fn().mockResolvedValue({
      acts: [act1, act2],
      characters: [
        { id: 'c_butler', scriptId: 's1', name: '管家', identity: '庄园管家', age: 45, avatarUrl: '', publicIntro: '老成持重', sortOrder: 1 },
        { id: 'c_doctor', scriptId: 's1', name: '医生', identity: '私人医生', age: 38, avatarUrl: '', publicIntro: '神情疲惫', sortOrder: 2 },
      ],
      clues: [],
      murdererCharacterId: null,
    }),
    selectCharacter: vi.fn().mockResolvedValue(state),
    setReady: vi.fn().mockResolvedValue(state),
    startRoom: vi.fn().mockResolvedValue({ ...state, room: { ...state.room, status: 'selecting' as const } }),
    nextAct: vi.fn().mockResolvedValue({ ...state, room: { ...state.room, currentAct: 2 }, currentAct: act2 }),
    submitVote: vi.fn().mockResolvedValue(state),
    finishRoom: vi.fn().mockResolvedValue(state),
  };
}

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

const ALL_ROUTES = ['/rooms/:roomId', '/rooms/:roomId/play', '/rooms/:roomId/ending', '/scripts'];

/** 被测页面挂在它自己的路由模板上，其余路径挂探针以断言跳转 */
function renderPage(route: string, element: ReactElement, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {ALL_ROUTES.map((candidate) => (
          <Route key={candidate} path={candidate} element={candidate === route ? element : <LocationProbe />} />
        ))}
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  // 模拟刷新后恢复：身份已持久化在 localStorage
  localStorage.setItem('zhenxiangju:identity', JSON.stringify({ roomId: 'r1', playerId: 'p1' }));
  useGameStore.setState({ roomId: null, playerId: null, roomState: null, context: null, status: 'idle', isActing: false, error: null });
});

afterEach(() => {
  useGameStore.getState().stopPolling();
});

describe('RoomPage', () => {
  it('waiting + 房主：显示玩家列表与「开始选角」，点击后进入 selecting 并出现选角网格', async () => {
    const api = makeApi(makeRoomState());
    configureRoomsApi(api);
    renderPage('/rooms/:roomId', <RoomPage />, '/rooms/r1');
    expect(await screen.findByText('开始选角（2 人）')).toBeInTheDocument();
    expect(screen.getByText('小A')).toBeInTheDocument();
    fireEvent.click(screen.getByText('开始选角（2 人）'));
    expect(await screen.findByTestId('character-grid')).toBeInTheDocument();
    expect(api.startRoom).toHaveBeenCalledWith('r1', 'p1');
  });

  it('selecting：点空闲角色调用 selectCharacter，被抢角色禁用', async () => {
    const state = makeRoomState({
      players: [
        { id: 'p1', nickname: '小A', characterId: null, characterName: null, isHost: true, isReady: false },
        { id: 'p2', nickname: '小B', characterId: 'c_butler', characterName: '管家', isHost: false, isReady: false },
      ],
      room: { status: 'selecting', currentAct: 0 },
    });
    const api = makeApi(state);
    configureRoomsApi(api);
    renderPage('/rooms/:roomId', <RoomPage />, '/rooms/r1');
    const doctor = await screen.findByRole('button', { name: /医生/ });
    fireEvent.click(doctor);
    expect(api.selectCharacter).toHaveBeenCalledWith('r1', 'p1', 'c_doctor');
    expect(screen.getByRole('button', { name: /管家/ })).toBeDisabled();
  });

  it('playing 状态自动跳转 /play（无死路）', async () => {
    configureRoomsApi(makeApi(makeRoomState({ room: { status: 'playing', currentAct: 1 }, currentAct: act1 })));
    renderPage('/rooms/:roomId', <RoomPage />, '/rooms/r1');
    expect(await screen.findByTestId('location')).toHaveTextContent('/rooms/r1/play');
  });
});

describe('GamePage', () => {
  it('playing：显示旁白与线索区，房主可点「下一幕」', async () => {
    const api = makeApi(makeRoomState({ room: { status: 'playing', currentAct: 1 }, currentAct: act1 }));
    configureRoomsApi(api);
    renderPage('/rooms/:roomId/play', <GamePage />, '/rooms/r1/play');
    expect(await screen.findByText(/雷声过后/)).toBeInTheDocument();
    expect(screen.getByTestId('ai-hint-card')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    expect(api.nextAct).toHaveBeenCalledWith('r1', 'p1');
  });

  it('voting：投票面板排除自己，点击调用 submitVote', async () => {
    const state = makeRoomState({
      room: { status: 'voting', currentAct: 2 },
      players: [
        { id: 'p1', nickname: '小A', characterId: 'c_butler', characterName: '管家', isHost: true, isReady: true },
        { id: 'p2', nickname: '小B', characterId: 'c_doctor', characterName: '医生', isHost: false, isReady: true },
      ],
      currentAct: act2,
    });
    const api = makeApi(state);
    configureRoomsApi(api);
    renderPage('/rooms/:roomId/play', <GamePage />, '/rooms/r1/play');
    const panel = await screen.findByTestId('vote-panel');
    expect(panel).toBeInTheDocument();
    expect(screen.queryByText('小A')).not.toBeInTheDocument(); // 不能投自己：自己不在候选里
    fireEvent.click(screen.getByRole('button', { name: /小B/ }));
    expect(api.submitVote).toHaveBeenCalledWith('r1', 'p1', 'p2');
  });

  it('waiting 状态自动跳回房间页（无死路）', async () => {
    configureRoomsApi(makeApi(makeRoomState()));
    renderPage('/rooms/:roomId/play', <GamePage />, '/rooms/r1/play');
    expect(await screen.findByTestId('location')).toHaveTextContent('/rooms/r1');
  });
});

describe('EndingPage', () => {
  it('ended + 投对：显示推理成功、真凶标注与票数', async () => {
    const state = makeRoomState({
      room: { status: 'ended', currentAct: 2 },
      players: [
        { id: 'p1', nickname: '小A', characterId: 'c_butler', characterName: '管家', isHost: true, isReady: true },
        { id: 'p2', nickname: '小B', characterId: 'c_doctor', characterName: '医生', isHost: false, isReady: true },
      ],
      votes: [
        { voterPlayerId: 'p1', targetPlayerId: 'p2' },
        { voterPlayerId: 'p2', targetPlayerId: 'p1' },
      ],
      result: { murdererCharacterId: 'c_doctor', topVotedCharacterId: 'c_doctor', isCorrect: true },
    });
    configureRoomsApi(makeApi(state));
    renderPage('/rooms/:roomId/ending', <EndingPage />, '/rooms/r1/ending');
    expect(await screen.findByTestId('verdict')).toHaveTextContent('推理成功');
    expect(screen.getByText('真凶')).toBeInTheDocument();
    expect(screen.getAllByText('1 票')).toHaveLength(2);
  });

  it('平票：显示「无人被推出」文案', async () => {
    const state = makeRoomState({
      room: { status: 'ended', currentAct: 2 },
      votes: [
        { voterPlayerId: 'p1', targetPlayerId: 'p2' },
        { voterPlayerId: 'p2', targetPlayerId: 'p1' },
      ],
      result: { murdererCharacterId: 'c_doctor', topVotedCharacterId: null, isCorrect: false },
    });
    configureRoomsApi(makeApi(state));
    renderPage('/rooms/:roomId/ending', <EndingPage />, '/rooms/r1/ending');
    expect(await screen.findByTestId('verdict')).toHaveTextContent('平票，无人被推出');
  });

  it('再来一局：清身份并跳剧本库', async () => {
    const state = makeRoomState({
      room: { status: 'ended', currentAct: 2 },
      result: { murdererCharacterId: 'c_doctor', topVotedCharacterId: 'c_doctor', isCorrect: true },
    });
    configureRoomsApi(makeApi(state));
    renderPage('/rooms/:roomId/ending', <EndingPage />, '/rooms/r1/ending');
    fireEvent.click(await screen.findByText('再来一局（创建新房间）'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/scripts'));
    expect(localStorage.getItem('zhenxiangju:identity')).toBeNull();
  });
});
