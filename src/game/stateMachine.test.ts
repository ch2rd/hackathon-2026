/**
 * 状态机单元测试（B 交付物 7，Vitest）。
 * 覆盖：正常全流程推进 + 异常分支（人数不足 / 非房主 / 角色被抢 /
 * 重复投票 / 投自己 / 状态错误 / 平票 / 演示推进边界）。
 */

import { describe, expect, it } from 'vitest';
import type { Character, CharacterPublic, Clue, RoomState, ScriptAct } from '../types/models';
import {
  applyEvent,
  demoAdvance,
  isAllSelectedAndReady,
  tallyVotes,
  type GameContext,
} from './stateMachine';
import {
  availableCharacters,
  canBeReady,
  canNextAct,
  canStart,
  canDemoAdvance,
  hasVoted,
  isFinalAct,
  startBlockReason,
  voteTargets,
} from './selectors';

// ---------- 测试数据：《雾夜庄园》精简版 ----------

const acts: ScriptAct[] = [
  { id: 'act1', scriptId: 's1', actNumber: 1, title: '第一幕·停电', narration: '……' },
  { id: 'act2', scriptId: 's1', actNumber: 2, title: '第二幕·证词', narration: '……' },
];

const characters: CharacterPublic[] = [
  { id: 'c_butler', scriptId: 's1', name: '管家', identity: '庄园管家', age: 45, avatarUrl: '', publicIntro: '老成持重', sortOrder: 1 },
  { id: 'c_doctor', scriptId: 's1', name: '医生', identity: '私人医生', age: 38, avatarUrl: '', publicIntro: '神情疲惫', sortOrder: 2 },
  { id: 'c_niece', scriptId: 's1', name: '侄女', identity: '死者侄女', age: 24, avatarUrl: '', publicIntro: '眼眶微红', sortOrder: 3 },
];

const fullMyCharacter: Character = {
  ...characters[0],
  secret: '我挪用了庄园的账。',
  goals: ['掩盖账目问题'],
};

const clues: Clue[] = [
  { id: 'k1', scriptId: 's1', actNumber: 1, title: '烛台', content: '书房烛台倒在地上。', visibility: 'public', ownerCharacterId: null },
  { id: 'k2', scriptId: 's1', actNumber: 1, title: '管家的账本', content: '账目有亏空。', visibility: 'private', ownerCharacterId: 'c_butler' },
  { id: 'k3', scriptId: 's1', actNumber: 2, title: '药瓶', content: '安眠药瓶出现在地毯边。', visibility: 'public', ownerCharacterId: null },
  { id: 'k4', scriptId: 's1', actNumber: 2, title: '侄女的信', content: '一封被撕碎的遗产信。', visibility: 'private', ownerCharacterId: 'c_niece' },
];

const ctx: GameContext = {
  acts,
  characters,
  clues,
  murdererCharacterId: 'c_doctor',
  resolveCharacter: (id) => (id === fullMyCharacter.id ? fullMyCharacter : null),
};

function makeState(overrides?: Partial<RoomState>): RoomState {
  return {
    room: {
      id: 'r1',
      code: 'ABC234',
      scriptId: 's1',
      hostPlayerId: 'p1',
      status: 'waiting',
      currentAct: 0,
      createdAt: '2026-10-18T00:00:00.000Z',
    },
    players: [
      { id: 'p1', nickname: '小A', characterId: null, characterName: null, isHost: true, isReady: false },
      { id: 'p2', nickname: '小B', characterId: null, characterName: null, isHost: false, isReady: false },
      { id: 'p3', nickname: '小C', characterId: null, characterName: null, isHost: false, isReady: false },
    ],
    currentAct: null,
    me: {
      player: {
        id: 'p1', roomId: 'r1', nickname: '小A', characterId: null,
        isHost: true, isReady: false, joinedAt: '2026-10-18T00:00:00.000Z',
      },
      character: null,
      visibleClues: [],
    },
    messages: [],
    votes: [],
    result: null,
    ...overrides,
  };
}

/** 推到指定状态的辅助：waiting → selecting → playing（第 3 人准备后自动流转）。 */
function advanceToPlaying(readStory = true): RoomState {
  let state = makeState();
  const started = applyEvent(state, ctx, { type: 'start', actorPlayerId: 'p1' });
  expect(started.ok).toBe(true);
  if (!started.ok) throw new Error('unreachable');
  state = started.state;
  for (const [playerId, characterId] of [
    ['p1', 'c_butler'],
    ['p2', 'c_doctor'],
    ['p3', 'c_niece'],
  ] as const) {
    const selected = applyEvent(state, ctx, { type: 'selectCharacter', playerId, characterId });
    expect(selected.ok).toBe(true);
    if (!selected.ok) throw new Error('unreachable');
    state = selected.state;
    const ready = applyEvent(state, ctx, { type: 'setReady', playerId, isReady: true });
    expect(ready.ok).toBe(true);
    if (!ready.ok) throw new Error('unreachable');
    state = ready.state;
  }
  // 全员选角并准备后应已自动进入 playing
  expect(state.room.status).toBe('playing');
  expect(state.room.gameplayPhase).toBe('reading');
  expect(state.players.every((player) => !player.isReady)).toBe(true);
  expect(state.me.player.isReady).toBe(false);
  if (!readStory) return state;
  for (const player of state.players) {
    const result = applyEvent(state, ctx, { type: 'confirmStoryRead', playerId: player.id });
    if (!result.ok) throw new Error('story confirmation failed');
    state = result.state;
  }
  expect(state.room.gameplayPhase).toBe('introduction');
  for (const phase of ['search', 'discussion']) {
    const result = applyEvent(state, ctx, { type: 'nextAct', actorPlayerId: 'p1' });
    if (!result.ok) throw new Error('phase transition failed');
    state = result.state;
    expect(state.room.gameplayPhase).toBe(phase);
  }
  return state;
}

/** 当前幕所有玩家确认讨论完成（专业流程：房主必须在全员确认后才能推进）。 */
function confirmAll(state: RoomState): RoomState {
  let next = state;
  for (const player of state.players) {
    const ready = applyEvent(next, ctx, { type: 'setReady', playerId: player.id, isReady: true });
    expect(ready.ok).toBe(true);
    if (!ready.ok) throw new Error('unreachable');
    next = ready.state;
  }
  return next;
}

function advanceToVoting(): RoomState {
  let state = confirmAll(advanceToPlaying());
  const act2 = applyEvent(state, ctx, { type: 'nextAct', actorPlayerId: 'p1' });
  expect(act2.ok).toBe(true);
  if (!act2.ok) throw new Error('unreachable');
  state = act2.state;
  const discussion = applyEvent(state, ctx, { type: 'nextAct', actorPlayerId: 'p1' });
  if (!discussion.ok) throw new Error('phase transition failed');
  state = confirmAll(discussion.state);
  const toVoting = applyEvent(state, ctx, { type: 'nextAct', actorPlayerId: 'p1' });
  expect(toVoting.ok).toBe(true);
  if (!toVoting.ok) throw new Error('unreachable');
  return toVoting.state;
}

// ---------- 正常主路径 ----------

describe('正常全流程推进', () => {
  it('waiting → selecting：房主且人数 >= 2', () => {
    const result = applyEvent(makeState(), ctx, { type: 'start', actorPlayerId: 'p1' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.room.status).toBe('selecting');
  });

  it('全员选角并准备后自动进入 playing，落在第 1 幕', () => {
    const state = advanceToPlaying();
    expect(state.room.status).toBe('playing');
    expect(state.room.currentAct).toBe(1);
    expect(state.currentAct?.id).toBe('act1');
    expect(state.players.map((p) => p.characterName)).toEqual(['管家', '医生', '侄女']);
  });

  it('第 1 幕只解锁第 1 幕线索，且私密线索只看到自己的', () => {
    const state = advanceToPlaying();
    expect(state.me.visibleClues.map((c) => c.id)).toEqual(['k1', 'k2']);
  });

  it('下一幕解锁新公开线索，别人的私密线索不出现', () => {
    const playing = confirmAll(advanceToPlaying());
    const result = applyEvent(playing, ctx, { type: 'nextAct', actorPlayerId: 'p1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.room.currentAct).toBe(2);
      expect(result.state.me.visibleClues.map((c) => c.id)).toEqual(['k1', 'k2', 'k3']);
      expect(result.state.me.visibleClues.some((c) => c.id === 'k4')).toBe(false);
    }
  });

  it('最后一幕结束后进入 voting', () => {
    const voting = advanceToVoting();
    expect(voting.room.status).toBe('voting');
    expect(voting.result).toBeNull();
    expect(voting.players.every((player) => !player.isReady)).toBe(true);
    expect(voting.me.player.isReady).toBe(false);
  });

  it('个人故事必须各自确认，不能用准备或房主推进跳过', () => {
    let state = advanceToPlaying(false);
    expect(canNextAct(state, 'p1')).toBe(false);
    expect(applyEvent(state, ctx, { type: 'nextAct', actorPlayerId: 'p1' })).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
    expect(applyEvent(state, ctx, { type: 'setReady', playerId: 'p1', isReady: true })).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
    for (const playerId of ['p1', 'p1', 'p2', 'p3']) {
      const confirmed = applyEvent(state, ctx, { type: 'confirmStoryRead', playerId });
      if (!confirmed.ok) throw new Error('story confirmation failed');
      state = confirmed.state;
      expect(state.room.gameplayPhase).toBe(playerId === 'p3' ? 'introduction' : 'reading');
    }
    expect(state.room.storyReadPlayerIds).toEqual(['p1', 'p2', 'p3']);
    expect(canNextAct(state, 'p1')).toBe(true);
    expect(canNextAct(state, 'p2')).toBe(false);
    const search = applyEvent(state, ctx, { type: 'nextAct', actorPlayerId: 'p1' });
    if (!search.ok) throw new Error('search transition failed');
    expect(search.state.room.gameplayPhase).toBe('search');
    expect(canNextAct(search.state, 'p1')).toBe(true);
    const staleReady = confirmAll(advanceToPlaying());
    staleReady.room = { ...staleReady.room, gameplayPhase: 'search' };
    const discussion = applyEvent(staleReady, ctx, { type: 'nextAct', actorPlayerId: 'p1' });
    if (!discussion.ok) throw new Error('discussion transition failed');
    expect(discussion.state.room.gameplayPhase).toBe('discussion');
    expect(discussion.state.players.every((player) => !player.isReady)).toBe(true);
    expect(discussion.state.me.player.isReady).toBe(false);
  });

  it('讨论全员确认后才能切幕，切幕后不能沿用前一幕确认', () => {
    const discussion = advanceToPlaying();
    expect(applyEvent(discussion, ctx, { type: 'nextAct', actorPlayerId: 'p1' })).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
    const partial = applyEvent(discussion, ctx, { type: 'setReady', playerId: 'p1', isReady: true });
    if (!partial.ok) throw new Error('discussion confirmation failed');
    expect(partial.state.me.player.isReady).toBe(true);
    expect(canNextAct(partial.state, 'p1')).toBe(false);
    expect(applyEvent(partial.state, ctx, { type: 'nextAct', actorPlayerId: 'p1' }).ok).toBe(false);
    const next = applyEvent(confirmAll(partial.state), ctx, { type: 'nextAct', actorPlayerId: 'p1' });
    if (!next.ok) throw new Error('next act failed');
    expect(next.state.room.gameplayPhase).toBe('search');
    expect(next.state.room.currentAct).toBe(2);
    expect(next.state.players.every((player) => !player.isReady)).toBe(true);
    expect(next.state.me.player.isReady).toBe(false);
    const finalDiscussion = applyEvent(next.state, ctx, { type: 'nextAct', actorPlayerId: 'p1' });
    if (!finalDiscussion.ok) throw new Error('final discussion failed');
    expect(applyEvent(finalDiscussion.state, ctx, { type: 'nextAct', actorPlayerId: 'p1' }).ok).toBe(false);
  });

  it('全员投票后自动 ended，凶手被投出则 isCorrect', () => {
    let state = advanceToVoting();
    const ballots: Array<[string, string]> = [
      ['p1', 'p2'],
      ['p2', 'p1'],
      ['p3', 'p2'],
    ];
    for (const [voter, target] of ballots) {
      const result = applyEvent(state, ctx, { type: 'submitVote', voterPlayerId: voter, targetPlayerId: target });
      expect(result.ok).toBe(true);
      if (result.ok) state = result.state;
    }
    expect(state.room.status).toBe('ended');
    expect(state.result).toEqual({
      murdererCharacterId: 'c_doctor',
      topVotedCharacterId: 'c_doctor',
      isCorrect: true,
    });
  });

  it('ended 状态只读：任何事件都被拒绝', () => {
    let state = advanceToVoting();
    const ballots: Array<[string, string]> = [
      ['p1', 'p2'],
      ['p2', 'p1'],
      ['p3', 'p2'],
    ];
    for (const [voter, target] of ballots) {
      const result = applyEvent(state, ctx, { type: 'submitVote', voterPlayerId: voter, targetPlayerId: target });
      if (result.ok) state = result.state;
    }
    const again = applyEvent(state, ctx, { type: 'start', actorPlayerId: 'p1' });
    expect(again.ok).toBe(false);
  });
});

// ---------- 异常分支 ----------

describe('异常分支', () => {
  it('人数不足 2 不能开始（INVALID_STATE）', () => {
    const state = makeState();
    state.players = state.players.filter((p) => p.id === 'p1');
    const result = applyEvent(state, ctx, { type: 'start', actorPlayerId: 'p1' });
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
  });

  it('非房主开始 / 推进 / 演示推进都是 FORBIDDEN', () => {
    const notHost = applyEvent(makeState(), ctx, { type: 'start', actorPlayerId: 'p2' });
    expect(notHost).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    const playing = advanceToPlaying();
    const actNotHost = applyEvent(playing, ctx, { type: 'nextAct', actorPlayerId: 'p2' });
    expect(actNotHost).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    const demoNotHost = demoAdvance(playing, ctx, 'p2');
    expect(demoNotHost).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('角色被选走后其他玩家不能再选（INVALID_STATE）', () => {
    let state = makeState();
    const started = applyEvent(state, ctx, { type: 'start', actorPlayerId: 'p1' });
    if (!started.ok) throw new Error('unreachable');
    state = started.state;
    const first = applyEvent(state, ctx, { type: 'selectCharacter', playerId: 'p1', characterId: 'c_butler' });
    if (!first.ok) throw new Error('unreachable');
    state = first.state;
    const steal = applyEvent(state, ctx, { type: 'selectCharacter', playerId: 'p2', characterId: 'c_butler' });
    expect(steal).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
    // 选择器里也不该再出现被抢角色
    expect(availableCharacters(state, ctx, 'p2').map((c) => c.id)).toEqual(['c_doctor', 'c_niece']);
  });

  it('未选角不能准备（INVALID_STATE）', () => {
    let state = makeState();
    const started = applyEvent(state, ctx, { type: 'start', actorPlayerId: 'p1' });
    if (!started.ok) throw new Error('unreachable');
    state = started.state;
    const result = applyEvent(state, ctx, { type: 'setReady', playerId: 'p1', isReady: true });
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
    expect(canBeReady(state, 'p1')).toBe(false);
  });

  it('已准备后不能直接换角色（INVALID_STATE）', () => {
    let state = makeState();
    const started = applyEvent(state, ctx, { type: 'start', actorPlayerId: 'p1' });
    if (!started.ok) throw new Error('unreachable');
    state = started.state;
    const selected = applyEvent(state, ctx, { type: 'selectCharacter', playerId: 'p1', characterId: 'c_butler' });
    if (!selected.ok) throw new Error('unreachable');
    state = selected.state;
    const ready = applyEvent(state, ctx, { type: 'setReady', playerId: 'p1', isReady: true });
    if (!ready.ok) throw new Error('unreachable');
    state = ready.state;
    const swap = applyEvent(state, ctx, { type: 'selectCharacter', playerId: 'p1', characterId: 'c_niece' });
    expect(swap).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
    // 取消准备后可以换
    const cancel = applyEvent(state, ctx, { type: 'setReady', playerId: 'p1', isReady: false });
    if (!cancel.ok) throw new Error('unreachable');
    const swapAgain = applyEvent(cancel.state, ctx, { type: 'selectCharacter', playerId: 'p1', characterId: 'c_niece' });
    expect(swapAgain.ok).toBe(true);
  });

  it('waiting 状态不能下一幕（INVALID_STATE）', () => {
    const result = applyEvent(makeState(), ctx, { type: 'nextAct', actorPlayerId: 'p1' });
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
  });

  it('不能投自己（VALIDATION_ERROR）', () => {
    const voting = advanceToVoting();
    const result = applyEvent(voting, ctx, { type: 'submitVote', voterPlayerId: 'p1', targetPlayerId: 'p1' });
    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
  });

  it('重复投票被拒（INVALID_STATE）', () => {
    const voting = advanceToVoting();
    const first = applyEvent(voting, ctx, { type: 'submitVote', voterPlayerId: 'p1', targetPlayerId: 'p2' });
    if (!first.ok) throw new Error('unreachable');
    const dup = applyEvent(first.state, ctx, { type: 'submitVote', voterPlayerId: 'p1', targetPlayerId: 'p3' });
    expect(dup).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
    expect(hasVoted(first.state, 'p1')).toBe(true);
  });

  it('投错凶手时 ended 结算 isCorrect 为 false', () => {
    let state = advanceToVoting();
    const pairs: Array<[string, string]> = [
      ['p1', 'p2'],
      ['p2', 'p1'],
      ['p3', 'p1'],
    ];
    // p1→p2, p2+p3→p1：p1 两票胜出但 p1 不是凶手
    for (const [voter, target] of pairs) {
      const result = applyEvent(state, ctx, { type: 'submitVote', voterPlayerId: voter, targetPlayerId: target });
      if (!result.ok) throw new Error('unreachable');
      state = result.state;
    }
    expect(state.room.status).toBe('ended');
    expect(state.result?.topVotedCharacterId).toBe('c_butler');
    expect(state.result?.isCorrect).toBe(false);
  });

  it('2:2 平票时 topVoted 为 null', () => {
    let state = advanceToVoting();
    state = { ...state, votes: [
      { voterPlayerId: 'p1', targetPlayerId: 'p2' },
      { voterPlayerId: 'p2', targetPlayerId: 'p1' },
    ] };
    expect(tallyVotes(state).topVotedPlayerId).toBeNull();
  });

  it('不存在的玩家 / 角色返回 NOT_FOUND', () => {
    const ghost = applyEvent(makeState(), ctx, { type: 'start', actorPlayerId: 'p999' });
    expect(ghost).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    let state = makeState();
    const started = applyEvent(state, ctx, { type: 'start', actorPlayerId: 'p1' });
    if (!started.ok) throw new Error('unreachable');
    const badChar = applyEvent(started.state, ctx, { type: 'selectCharacter', playerId: 'p1', characterId: 'c999' });
    expect(badChar).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});

// ---------- 演示兜底 ----------

describe('演示推进（demoAdvance）', () => {
  it('waiting 单人也可强制开始选角', () => {
    const state = makeState();
    state.players = state.players.filter((p) => p.id === 'p1');
    const result = demoAdvance(state, ctx, 'p1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.room.status).toBe('selecting');
  });

  it('selecting 不允许跳过', () => {
    let state = makeState();
    const started = applyEvent(state, ctx, { type: 'start', actorPlayerId: 'p1' });
    if (!started.ok) throw new Error('unreachable');
    const result = demoAdvance(started.state, ctx, 'p1');
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_STATE' } });
  });

  it('voting 可强制按已投票数结算', () => {
    let state = advanceToVoting();
    const voted = applyEvent(state, ctx, { type: 'submitVote', voterPlayerId: 'p1', targetPlayerId: 'p2' });
    if (!voted.ok) throw new Error('unreachable');
    const result = demoAdvance(voted.state, ctx, 'p1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.room.status).toBe('ended');
      expect(result.state.result?.topVotedCharacterId).toBe('c_doctor');
    }
  });
});

// ---------- 选择器一致性 ----------

describe('选择器与状态机判定一致', () => {
  it('canStart / startBlockReason', () => {
    const state = makeState();
    expect(canStart(state, 'p1')).toBe(true);
    expect(startBlockReason(state, 'p1')).toBeNull();
    expect(startBlockReason(state, 'p2')).toBe('等待房主开始选角');
    const solo = { ...state, players: state.players.slice(0, 1) };
    expect(canStart(solo, 'p1')).toBe(false);
    expect(startBlockReason(solo, 'p1')).toBe('至少 2 人才能开始');
  });

  it('canNextAct / isFinalAct / isAllSelectedAndReady / voteTargets', () => {
    const playing = advanceToPlaying();
    expect(canNextAct(playing, 'p1')).toBe(false);
    expect(isAllSelectedAndReady(playing)).toBe(false);
    const confirmed = confirmAll(playing);
    expect(canNextAct(confirmed, 'p1')).toBe(true);
    expect(canNextAct(confirmed, 'p2')).toBe(false);
    expect(isFinalAct(confirmed, ctx)).toBe(false);
    const voting = advanceToVoting();
    expect(isFinalAct({ ...voting, room: { ...voting.room, status: 'playing', currentAct: 2 } }, ctx)).toBe(true);
    expect(voteTargets(voting, 'p1').map((p) => p.id)).toEqual(['p2', 'p3']);
    expect(voteTargets(voting, 'p1').some((p) => p.id === 'p1')).toBe(false);
  });

  it('canDemoAdvance 仅在演示模式对房主显示', () => {
    const state = makeState();
    expect(canDemoAdvance(state, 'p1', true)).toBe(true);
    expect(canDemoAdvance(state, 'p1', false)).toBe(false);
    expect(canDemoAdvance(state, 'p2', true)).toBe(false);
  });
});
