/**
 * 房间状态派生选择器（B 维护）。
 *
 * 纯函数：从 RoomState / GameContext 推导 UI 需要的布尔值与列表，
 * 页面组件不重复实现规则。判定逻辑与 stateMachine.ts 保持一致。
 */

import type { CharacterPublic, PublicPlayer, RoomState } from '../types/models';
import { computeVisibleClues, tallyVotes, type GameContext } from './stateMachine';

/** 按 id 找公开玩家信息。 */
export function findPublicPlayer(state: RoomState, playerId: string): PublicPlayer | undefined {
  return state.players.find((p) => p.id === playerId);
}

/** 当前玩家是否是房主。 */
export function isHostPlayer(state: RoomState, playerId: string): boolean {
  const player = findPublicPlayer(state, playerId);
  return player?.isHost === true && state.room.hostPlayerId === playerId;
}

/** 房主可否点「开始选角」（waiting 且人数 >= 2）。 */
export function canStart(state: RoomState, playerId: string): boolean {
  return (
    state.room.status === 'waiting' &&
    isHostPlayer(state, playerId) &&
    state.players.length >= 2
  );
}

/** waiting 时「开始选角」按钮的置灰原因文案；可开始则返回 null。 */
export function startBlockReason(state: RoomState, playerId: string): string | null {
  if (state.room.status !== 'waiting') return null;
  if (!isHostPlayer(state, playerId)) return '等待房主开始选角';
  if (state.players.length < 2) return '至少 2 人才能开始';
  return null;
}

/** selecting 阶段可选的角色（未被别人选走；自己已选的保留为可选）。 */
export function availableCharacters(state: RoomState, ctx: GameContext, playerId: string): CharacterPublic[] {
  if (state.room.status !== 'selecting') return [];
  const myPlayer = findPublicPlayer(state, playerId);
  return [...ctx.characters]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(
      (c) =>
        !state.players.some((p) => p.characterId === c.id && p.id !== playerId) &&
        (myPlayer?.isReady !== true || myPlayer?.characterId === c.id)
    );
}

/** 某玩家当前选中的角色（公开信息）。 */
export function playerCharacter(state: RoomState, ctx: GameContext, playerId: string): CharacterPublic | null {
  const characterId = findPublicPlayer(state, playerId)?.characterId ?? null;
  if (!characterId) return null;
  return ctx.characters.find((c) => c.id === characterId) ?? null;
}

/** 当前玩家是否已选角。 */
export function hasSelectedCharacter(state: RoomState, playerId: string): boolean {
  return findPublicPlayer(state, playerId)?.characterId != null;
}

/** 当前玩家可否点准备（selecting 且已选角）。 */
export function canBeReady(state: RoomState, playerId: string): boolean {
  return state.room.status === 'selecting' && hasSelectedCharacter(state, playerId);
}

/** 等待中的玩家数（selecting 阶段提示用）。 */
export function readyCount(state: RoomState): number {
  return state.players.filter((p) => p.characterId !== null && p.isReady).length;
}

/** 当前幕是否所有玩家都已确认讨论完成。 */
export function allPlayersReady(state: RoomState): boolean {
  return state.players.length > 0 && state.players.every((player) => player.isReady);
}

/** 当前幕确认进度。 */
export function readyProgress(state: RoomState): { confirmed: number; total: number } {
  return {
    confirmed: state.players.filter((player) => player.isReady).length,
    total: state.players.length,
  };
}

/** 房主可否点「下一幕」（playing、房主且全员确认本幕讨论完成）。 */
export function canNextAct(state: RoomState, playerId: string): boolean {
  return (
    state.room.status === 'playing' &&
    isHostPlayer(state, playerId) &&
    allPlayersReady(state)
  );
}

/** 当前是否最后一幕（按钮文案「进入投票」用）。 */
export function isFinalAct(state: RoomState, ctx: GameContext): boolean {
  if (state.room.status !== 'playing') return false;
  const lastActNumber = ctx.acts.length > 0 ? Math.max(...ctx.acts.map((a) => a.actNumber)) : 0;
  return state.room.currentAct >= lastActNumber;
}

/** 当前幕已解锁的全部可见线索（等价于 me.visibleClues，供非本人视角的测试/兜底）。 */
export function cluesUpToNow(state: RoomState, ctx: GameContext, playerId: string): ReturnType<typeof computeVisibleClues> {
  const characterId = findPublicPlayer(state, playerId)?.characterId ?? null;
  return computeVisibleClues(ctx, characterId, state.room.currentAct);
}

/** 当前玩家是否已投票。 */
export function hasVoted(state: RoomState, playerId: string): boolean {
  return state.votes.some((v) => v.voterPlayerId === playerId);
}

/** 可被投的玩家（voting 阶段：除自己外的所有玩家）。 */
export function voteTargets(state: RoomState, playerId: string): PublicPlayer[] {
  if (state.room.status !== 'voting') return [];
  return state.players.filter((p) => p.id !== playerId);
}

/** 投票进度：已投人数 / 应投人数。 */
export function voteProgress(state: RoomState): { voted: number; total: number } {
  return { voted: state.votes.length, total: state.players.length };
}

/** 票数统计（结果页展示用；与结算逻辑同一实现）。 */
export function voteCountsByPlayer(state: RoomState): Record<string, number> {
  return tallyVotes(state).counts;
}

/** 是否显示「演示推进」按钮（§4.10：仅 VITE_DEMO_MODE 且房主且未到 ended）。 */
export function canDemoAdvance(state: RoomState, playerId: string, isDemoMode: boolean): boolean {
  return (
    isDemoMode &&
    state.room.status !== 'ended' &&
    state.room.status !== 'selecting' &&
    isHostPlayer(state, playerId)
  );
}
