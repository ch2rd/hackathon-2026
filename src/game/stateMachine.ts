/**
 * 《真相局》前端游戏状态机（B 维护）。
 *
 * 纯函数，不依赖 React、不依赖网络。规则唯一来源是 AGENTS.md §4.10。
 * 服务端（或 Mock 适配器）是最终权威；本状态机负责：
 *   1. Mock 模式下驱动房间状态流转；
 *   2. 真实模式下做本地校验与乐观更新，冲突时以服务端返回为准。
 *
 * 错误码复用 AGENTS.md §5.2 的子集，保证前后端语义一致。
 */

import type {
  Character,
  CharacterPublic,
  Clue,
  PublicPlayer,
  RoomState,
  ScriptAct,
} from '../types/models';

// ---------- 错误 ----------

/** AGENTS.md §5.2 中与状态机相关的错误码子集。 */
export type GameErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INVALID_STATE' | 'FORBIDDEN';

export interface GameError {
  code: GameErrorCode;
  message: string;
}

export type TransitionResult =
  | { ok: true; state: RoomState }
  | { ok: false; error: GameError };

// ---------- 上下文 ----------

/**
 * 状态机运转所需的剧本静态数据（由 src/api 提供，B 不在组件里写死）。
 * - acts / characters / clues 均为公开数据；
 * - resolveCharacter：按 id 查完整角色（含 secret）。调用方（gameStore）
 *   必须保证只解析「当前玩家自己的角色」，别人的 secret 不进 store（§3.3）；
 *   真实模式下服务端已在 RoomState.me.character 里给好，可传 undefined。
 * - murdererCharacterId：Mock 模式结算结局用；真实模式由服务端计算，
 *   结局前服务端不会下发（§3.4 验收标准）。
 */
export interface GameContext {
  /** 按 actNumber 升序 */
  acts: ScriptAct[];
  characters: CharacterPublic[];
  clues: Clue[];
  murdererCharacterId: string | null;
  resolveCharacter?: (characterId: string) => Character | null;
}

// ---------- 事件（与 §5.3 P0 接口一一对应） ----------

export type GameEvent =
  | { type: 'start'; actorPlayerId: string }
  | { type: 'selectCharacter'; playerId: string; characterId: string }
  | { type: 'setReady'; playerId: string; isReady: boolean }
  | { type: 'confirmStoryRead'; playerId: string }
  | { type: 'nextAct'; actorPlayerId: string }
  | { type: 'submitVote'; voterPlayerId: string; targetPlayerId: string }
  /** 演示兜底：房主强制推进（只在 VITE_DEMO_MODE=true 时由 UI 暴露） */
  | { type: 'demoAdvance'; actorPlayerId: string };

// ---------- 常量与内部工具 ----------

const MIN_PLAYERS_TO_START = 2;

function fail(code: GameErrorCode, message: string): TransitionResult {
  return { ok: false, error: { code, message } };
}

function findPlayer(state: RoomState, playerId: string): PublicPlayer | undefined {
  return state.players.find((p) => p.id === playerId);
}

function findCharacter(ctx: GameContext, characterId: string): CharacterPublic | undefined {
  return ctx.characters.find((c) => c.id === characterId);
}

function characterName(ctx: GameContext, characterId: string | null): string | null {
  if (!characterId) return null;
  return findCharacter(ctx, characterId)?.name ?? null;
}

function actByNumber(ctx: GameContext, actNumber: number): ScriptAct | null {
  return ctx.acts.find((a) => a.actNumber === actNumber) ?? null;
}

function lastActNumber(ctx: GameContext): number {
  return ctx.acts.length > 0 ? Math.max(...ctx.acts.map((a) => a.actNumber)) : 0;
}

/** 当前幕及之前幕中，玩家有权看到的线索（§4.11：只包含有权内容）。 */
export function computeVisibleClues(
  ctx: GameContext,
  characterId: string | null,
  actNumber: number
): Clue[] {
  return ctx.clues.filter((clue) => {
    if (clue.actNumber > actNumber) return false;
    if (clue.visibility === 'public') return true;
    return characterId !== null && clue.ownerCharacterId === characterId;
  });
}

/** 所有玩家都已选角且已准备（selecting 自动进入 playing 的条件）。 */
export function isAllSelectedAndReady(state: RoomState): boolean {
  return (
    state.players.length > 0 &&
    state.players.every((p) => p.characterId !== null && p.isReady)
  );
}

/** 同步玩家列表里的 characterName（选角后的展示字段）。 */
function withCharacterNames(players: PublicPlayer[], ctx: GameContext): PublicPlayer[] {
  return players.map((p) => ({ ...p, characterName: characterName(ctx, p.characterId) }));
}

/** 当前玩家自己的角色：若本人刚选角而 me.character 尚未填充，用上下文补全。 */
function resolveMyCharacter(ctx: GameContext, characterId: string | null): Character | null {
  if (!characterId) return null;
  if (ctx.resolveCharacter) return ctx.resolveCharacter(characterId);
  return null;
}

/**
 * selecting 阶段的自动流转：全员选角且准备后进入 playing（第 1 幕）。
 * 不满足条件时原样返回。
 */
function maybeEnterPlaying(state: RoomState, ctx: GameContext): RoomState {
  if (state.room.status !== 'selecting' || !isAllSelectedAndReady(state)) return state;
  const players = withCharacterNames(state.players, ctx).map((player) => ({
    ...player,
    isReady: false,
  }));
  const myCharId = players.find((p) => p.id === state.me.player.id)?.characterId ?? null;
  const firstAct = ctx.acts[0] ?? null;
  return {
    ...state,
    room: { ...state.room, status: 'playing', currentAct: firstAct?.actNumber ?? 1, gameplayPhase: 'reading', storyReadPlayerIds: [] },
    players,
    currentAct: firstAct,
    me: {
      player: { ...state.me.player, characterId: myCharId, isReady: false },
      character: state.me.character ?? resolveMyCharacter(ctx, myCharId),
      visibleClues: computeVisibleClues(ctx, myCharId, firstAct?.actNumber ?? 1),
    },
    votes: [],
    result: null,
  };
}

// ---------- 各转移（§4.10 规则逐条实现） ----------

/** waiting → selecting：仅房主，且玩家数 >= 2。 */
export function startRoom(state: RoomState, _ctx: GameContext, actorPlayerId: string): TransitionResult {
  const actor = findPlayer(state, actorPlayerId);
  if (!actor) return fail('NOT_FOUND', '玩家不存在');
  if (state.room.status !== 'waiting') return fail('INVALID_STATE', '当前状态无法开始选角');
  if (!actor.isHost || state.room.hostPlayerId !== actorPlayerId) {
    return fail('FORBIDDEN', '只有房主可以开始选角');
  }
  if (state.players.length < MIN_PLAYERS_TO_START) {
    return fail('INVALID_STATE', `至少 ${MIN_PLAYERS_TO_START} 人才能开始`);
  }
  return { ok: true, state: { ...state, room: { ...state.room, status: 'selecting' } } };
}

/**
 * selecting 阶段选角：角色未被别人选走；已准备的玩家需先取消准备（§3.3：
 * 「角色被选走后其他玩家不能再选」；换角色须未准备，是本机对未明说处的
 * 保守约定，已在 docs/game-flow.md 登记，待群里确认）。
 * 全员选角并准备后自动进入 playing。
 */
export function selectCharacter(
  state: RoomState,
  ctx: GameContext,
  playerId: string,
  characterId: string
): TransitionResult {
  if (state.room.status !== 'selecting') return fail('INVALID_STATE', '当前状态不能选角');
  const player = findPlayer(state, playerId);
  if (!player) return fail('NOT_FOUND', '玩家不存在');
  const character = findCharacter(ctx, characterId);
  if (!character) return fail('NOT_FOUND', '角色不存在');
  if (player.isReady) return fail('INVALID_STATE', '已准备，请先取消准备再换角色');
  const takenBy = state.players.find((p) => p.characterId === characterId && p.id !== playerId);
  if (takenBy) return fail('INVALID_STATE', `角色「${character.name}」已被 ${takenBy.nickname} 选走`);

  const players = withCharacterNames(
    state.players.map((p) => (p.id === playerId ? { ...p, characterId } : p)),
    ctx
  );
  const isMe = playerId === state.me.player.id;
  const next: RoomState = {
    ...state,
    players,
    me: {
      ...state.me,
      player: isMe ? { ...state.me.player, characterId } : state.me.player,
      character: isMe ? resolveMyCharacter(ctx, characterId) : state.me.character,
    },
  };
  return { ok: true, state: maybeEnterPlaying(next, ctx) };
}

/** 选角准备，或讨论完成确认；个人故事通过独立的阅读确认推进。 */
export function setReady(
  state: RoomState,
  ctx: GameContext,
  playerId: string,
  isReady: boolean
): TransitionResult {
  if (state.room.status !== 'selecting' && !(state.room.status === 'playing' && state.room.gameplayPhase === 'discussion')) {
    return fail('INVALID_STATE', '当前阶段不能确认');
  }
  const player = findPlayer(state, playerId);
  if (!player) return fail('NOT_FOUND', '玩家不存在');
  if (state.room.status === 'selecting' && isReady && player.characterId === null) {
    return fail('INVALID_STATE', '请先选择角色再准备');
  }
  const players = state.players.map((p) => (p.id === playerId ? { ...p, isReady } : p));
  const next: RoomState = {
    ...state,
    players,
    me: {
      ...state.me,
      player:
        playerId === state.me.player.id
          ? { ...state.me.player, isReady }
          : state.me.player,
    },
  };
  return {
    ok: true,
    state: state.room.status === 'selecting' ? maybeEnterPlaying(next, ctx) : next,
  };
}

function enterVoting(state: RoomState): RoomState {
  return {
    ...state,
    room: { ...state.room, status: 'voting' },
    players: state.players.map((player) => ({ ...player, isReady: false })),
    me: { ...state.me, player: { ...state.me.player, isReady: false } },
    result: null,
  };
}

/** playing 阶段下一幕：仅房主；最后一幕结束后进入 voting。 */
export function nextAct(state: RoomState, ctx: GameContext, actorPlayerId: string): TransitionResult {
  const actor = findPlayer(state, actorPlayerId);
  if (!actor) return fail('NOT_FOUND', '玩家不存在');
  if (state.room.status !== 'playing') return fail('INVALID_STATE', '当前状态不能推进剧情');
  if (!actor.isHost) return fail('FORBIDDEN', '只有房主可以推进剧情');
  const phase = state.room.gameplayPhase ?? 'search';
  if (phase === 'reading') return fail('INVALID_STATE', '请等待全员读完个人故事');
  if (phase !== 'discussion') {
    const enteringDiscussion = phase === 'search';
    return {
      ok: true,
      state: {
        ...state,
        room: { ...state.room, gameplayPhase: enteringDiscussion ? 'discussion' : 'search' },
        players: enteringDiscussion ? state.players.map((player) => ({ ...player, isReady: false })) : state.players,
        me: enteringDiscussion ? { ...state.me, player: { ...state.me.player, isReady: false } } : state.me,
      },
    };
  }
  if (!state.players.every((player) => player.isReady)) {
    return fail('INVALID_STATE', '还有玩家未确认本幕讨论完成');
  }
  const current = state.room.currentAct;
  if (current >= lastActNumber(ctx)) {
    return { ok: true, state: enterVoting(state) };
  }
  const actNumber = current + 1;
  return {
    ok: true,
    state: {
      ...state,
      room: { ...state.room, currentAct: actNumber, gameplayPhase: 'search' },
      currentAct: actByNumber(ctx, actNumber),
      players: state.players.map((player) => ({ ...player, isReady: false })),
      me: {
        ...state.me,
        player: { ...state.me.player, isReady: false },
        visibleClues: computeVisibleClues(ctx, state.me.player.characterId, actNumber),
      },
    },
  };
}

/** voting 阶段投票：一人一票，不能投自己；全部投完自动进入 ended。 */
export function submitVote(
  state: RoomState,
  ctx: GameContext,
  voterPlayerId: string,
  targetPlayerId: string
): TransitionResult {
  if (state.room.status !== 'voting') return fail('INVALID_STATE', '当前状态不能投票');
  const voter = findPlayer(state, voterPlayerId);
  const target = findPlayer(state, targetPlayerId);
  if (!voter || !target) return fail('NOT_FOUND', '玩家不存在');
  if (voterPlayerId === targetPlayerId) return fail('VALIDATION_ERROR', '不能投自己');
  if (state.votes.some((v) => v.voterPlayerId === voterPlayerId)) {
    return fail('INVALID_STATE', '你已经投过票了');
  }
  const votes = [...state.votes, { voterPlayerId, targetPlayerId }];
  const nextState: RoomState = { ...state, votes };
  const allVoted = state.players.every((p) => votes.some((v) => v.voterPlayerId === p.id));
  return { ok: true, state: allVoted ? buildEnding(nextState, ctx) : nextState };
}

/** 票数统计；平票时 topVotedPlayerId 为 null（无人被推出，判定不中）。 */
export function tallyVotes(state: RoomState): {
  topVotedPlayerId: string | null;
  counts: Record<string, number>;
} {
  const counts: Record<string, number> = {};
  for (const vote of state.votes) {
    counts[vote.targetPlayerId] = (counts[vote.targetPlayerId] ?? 0) + 1;
  }
  let topVotedPlayerId: string | null = null;
  let topCount = 0;
  let hasTie = false;
  for (const [playerId, count] of Object.entries(counts)) {
    if (count > topCount) {
      topCount = count;
      topVotedPlayerId = playerId;
      hasTie = false;
    } else if (count === topCount) {
      hasTie = true;
    }
  }
  if (hasTie) topVotedPlayerId = null;
  return { topVotedPlayerId, counts };
}

/** ended：揭晓 result（§4.11：仅 ended 时非空）。真实模式由服务端算好下发。 */
function buildEnding(state: RoomState, ctx: GameContext): RoomState {
  const { topVotedPlayerId } = tallyVotes(state);
  const topPlayer = topVotedPlayerId ? findPlayer(state, topVotedPlayerId) : null;
  const topVotedCharacterId = topPlayer?.characterId ?? null;
  return {
    ...state,
    room: { ...state.room, status: 'ended' },
    result: {
      murdererCharacterId: ctx.murdererCharacterId ?? '',
      topVotedCharacterId,
      isCorrect:
        topVotedCharacterId !== null &&
        ctx.murdererCharacterId !== null &&
        topVotedCharacterId === ctx.murdererCharacterId,
    },
  };
}

/**
 * 演示兜底（§4.10）：房主强制推进，UI 必须二次确认且仅在 VITE_DEMO_MODE=true 显示。
 * - waiting → selecting（绕过人数下限，供单人彩排）
 * - playing → 下一幕 / voting
 * - voting → ended（按已投出的票结算）
 * - selecting / ended：不允许演示推进。
 */
export function demoAdvance(state: RoomState, ctx: GameContext, actorPlayerId: string): TransitionResult {
  const actor = findPlayer(state, actorPlayerId);
  if (!actor) return fail('NOT_FOUND', '玩家不存在');
  if (!actor.isHost) return fail('FORBIDDEN', '只有房主可以演示推进');
  switch (state.room.status) {
    case 'waiting':
      return { ok: true, state: { ...state, room: { ...state.room, status: 'selecting' } } };
    case 'selecting':
      return fail('INVALID_STATE', '演示推进不能跳过选角，请全员选角并准备');
    case 'playing':
      return nextAct(state, ctx, actorPlayerId);
    case 'voting':
      return { ok: true, state: buildEnding(state, ctx) };
    case 'ended':
      return fail('INVALID_STATE', '游戏已结束，请创建新房间再来一局');
  }
}

// ---------- 统一入口 ----------

export function applyEvent(state: RoomState, ctx: GameContext, event: GameEvent): TransitionResult {
  switch (event.type) {
    case 'start':
      return startRoom(state, ctx, event.actorPlayerId);
    case 'selectCharacter':
      return selectCharacter(state, ctx, event.playerId, event.characterId);
    case 'setReady':
      return setReady(state, ctx, event.playerId, event.isReady);
    case 'confirmStoryRead':
      return confirmStoryRead(state, ctx, event.playerId);
    case 'nextAct':
      return nextAct(state, ctx, event.actorPlayerId);
    case 'submitVote':
      return submitVote(state, ctx, event.voterPlayerId, event.targetPlayerId);
    case 'demoAdvance':
      return demoAdvance(state, ctx, event.actorPlayerId);
  }
}

export function confirmStoryRead(state: RoomState, _ctx: GameContext, playerId: string): TransitionResult {
  if (!findPlayer(state, playerId)) return fail('NOT_FOUND', '玩家不存在');
  if (state.room.status === 'playing' && state.room.storyReadPlayerIds?.includes(playerId)) return { ok: true, state };
  if (state.room.status !== 'playing' || state.room.gameplayPhase !== 'reading') return fail('INVALID_STATE', '当前不在个人故事阅读环节');
  const readers = new Set(state.room.storyReadPlayerIds ?? []);
  readers.add(playerId);
  return { ok: true, state: { ...state, room: { ...state.room, storyReadPlayerIds: [...readers],
    gameplayPhase: state.players.every((player) => readers.has(player.id)) ? 'introduction' : 'reading' } } };
}
