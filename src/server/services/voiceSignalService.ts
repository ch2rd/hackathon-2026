/**
 * 语音信令队列（C 维护）。
 *
 * 纯内存、按房间隔离、带 TTL —— 信令是**转瞬即逝的传输数据**，不是业务数据：
 * 进程重启后重连一次就行，没必要落盘（落盘反而会让每个 ICE candidate 都写一次文件）。
 *
 * 语义是「取走即删除」：同一条信令绝不能被投递两次，
 * 否则接收方会对同一个 candidate 反复调用 addIceCandidate。
 */

import type { VoiceSignal } from '../../types/models';

/** 超过这个时长还没被取走的信令就作废（WebRTC 握手早已超时）。 */
const SIGNAL_TTL_MS = 60_000;
/** 单房间队列上限，防止某个玩家掉线后堆积。 */
const SIGNAL_MAX_PER_ROOM = 200;

const queues = new Map<string, VoiceSignal[]>();

function prune(signals: VoiceSignal[]): VoiceSignal[] {
  const now = Date.now();
  return signals.filter((signal) => now - Date.parse(signal.createdAt) < SIGNAL_TTL_MS);
}

/** 入队一条信令。 */
export function enqueueSignal(signal: VoiceSignal): void {
  const list = prune(queues.get(signal.roomId) ?? []);
  list.push(signal);
  queues.set(signal.roomId, list.slice(-SIGNAL_MAX_PER_ROOM));
}

/** 取走投递给 `playerId` 的全部信令，其余留在队列里。 */
export function drainSignals(roomId: string, playerId: string): VoiceSignal[] {
  const list = prune(queues.get(roomId) ?? []);
  const mine = list.filter((signal) => signal.toPlayerId === playerId);
  const rest = list.filter((signal) => signal.toPlayerId !== playerId);

  if (rest.length > 0) queues.set(roomId, rest);
  else queues.delete(roomId);

  return mine;
}

/** 仅供测试/排查：当前队列里的信令总数。 */
export function queueSize(roomId: string): number {
  return queues.get(roomId)?.length ?? 0;
}

/** 仅供测试：清空所有队列（模块级状态，用例之间必须重置）。 */
export function resetSignalQueues(): void {
  queues.clear();
}
