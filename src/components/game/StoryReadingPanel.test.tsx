import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmStoryRead } from '../../api/rooms';
import { useGameStore } from '../../stores/gameStore';
import type { RoomState } from '../../types/models';
import { StoryReadingPanel } from './StoryReadingPanel';

vi.mock('../../api/rooms', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../api/rooms')>(), confirmStoryRead: vi.fn(),
}));

const state: RoomState = {
  room: { id: 'r1', code: 'ABC234', scriptId: 's1', hostPlayerId: 'p1', status: 'playing', currentAct: 1,
    gameplayPhase: 'reading', storyReadPlayerIds: [], createdAt: '2026-10-18T00:00:00Z' },
  players: [
    { id: 'p1', nickname: '甲', characterId: 'c1', characterName: '林墨', isHost: true, isReady: true },
    { id: 'p2', nickname: '乙', characterId: 'c2', characterName: '苏晚', isHost: false, isReady: true },
  ],
  currentAct: null,
  me: {
    player: { id: 'p1', roomId: 'r1', nickname: '甲', characterId: 'c1', isHost: true, isReady: true, joinedAt: '2026-10-18T00:00:00Z' },
    character: { id: 'c1', scriptId: 's1', name: '林墨', identity: '庄园管家', age: 46, avatarUrl: '',
      publicIntro: '我是负责日常事务的管家。', backgroundStory: '你在庄园生活多年，熟悉这里的人和往事。',
      secret: '只有你知道的过去。', goals: ['守住自己的秘密'], sortOrder: 1 },
    visibleClues: [],
  },
  messages: [], votes: [], result: null,
};

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('个人故事阅读界面', () => {
  it('显示自己的完整故事、秘密与任务，阅读确认使用本人身份', async () => {
    const poll = vi.spyOn(useGameStore.getState(), 'pollOnce').mockResolvedValue();
    vi.mocked(confirmStoryRead).mockResolvedValue(state);
    render(<StoryReadingPanel state={state} />);
    expect(screen.getByText('你在庄园生活多年，熟悉这里的人和往事。')).toBeInTheDocument();
    expect(screen.getByText('只有你知道的过去。')).toBeInTheDocument();
    expect(screen.getByText('守住自己的秘密')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '我已读完，准备自我介绍' }));
    await waitFor(() => expect(poll).toHaveBeenCalledOnce());
    expect(confirmStoryRead).toHaveBeenCalledWith('r1', 'p1');
  });

  it('已读后等待其他玩家，不重复提交；旧角色资料不会展示', () => {
    const { rerender } = render(<StoryReadingPanel state={{ ...state, room: { ...state.room, storyReadPlayerIds: ['p1'] } }} />);
    expect(screen.getByRole('button', { name: '已读完，等待其他玩家' })).toBeDisabled();
    expect(screen.getByText(/已读完 1\/2 人/)).toBeInTheDocument();
    rerender(<StoryReadingPanel state={{ ...state, me: { ...state.me, player: { ...state.me.player, characterId: 'c2' } } }} />);
    expect(screen.queryByText('只有你知道的过去。')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('正在同步你的个人故事');
  });
});
