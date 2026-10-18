/**
 * 语音信令队列测试。
 *
 * 重点盯死两条不变量：
 * 1. **取走即删除** —— 同一条信令绝不能投递两次，否则接收方会对同一个 ICE candidate
 *    反复 addIceCandidate，握手直接乱掉；
 * 2. **只投给收件人** —— 别人的信令不能被顺手取走（否则两个玩家互相把对方的
 *    offer 吃掉，谁都连不上）。
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { VoiceSignal } from '../../types/models';
import { drainSignals, enqueueSignal, queueSize, resetSignalQueues } from './voiceSignalService';

function makeSignal(overrides: Partial<VoiceSignal> = {}): VoiceSignal {
  return {
    id: `sig_${Math.random().toString(36).slice(2)}`,
    roomId: 'room_1',
    fromPlayerId: 'p1',
    toPlayerId: 'p2',
    kind: 'hello',
    payload: '{}',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('语音信令队列', () => {
  beforeEach(() => {
    resetSignalQueues();
  });

  it('只投给收件人，且取走即删除（不会重复投递）', () => {
    enqueueSignal(makeSignal({ id: 'a', toPlayerId: 'p2' }));
    enqueueSignal(makeSignal({ id: 'b', toPlayerId: 'p3' }));

    expect(drainSignals('room_1', 'p2').map((signal) => signal.id)).toEqual(['a']);
    // 第二次取：已投递过的不再出现
    expect(drainSignals('room_1', 'p2')).toEqual([]);
    // 别人的信令仍然在
    expect(drainSignals('room_1', 'p3').map((signal) => signal.id)).toEqual(['b']);
    expect(queueSize('room_1')).toBe(0);
  });

  it('按房间隔离，不同房间互不串台', () => {
    enqueueSignal(makeSignal({ id: 'in-room-1', roomId: 'room_1', toPlayerId: 'p2' }));
    enqueueSignal(makeSignal({ id: 'in-room-2', roomId: 'room_2', toPlayerId: 'p2' }));

    expect(drainSignals('room_1', 'p2').map((signal) => signal.id)).toEqual(['in-room-1']);
    expect(drainSignals('room_2', 'p2').map((signal) => signal.id)).toEqual(['in-room-2']);
  });

  it('过期信令（超过 60 秒）不再投递，避免迟到的手握数据污染新会话', () => {
    enqueueSignal(
      makeSignal({ id: 'stale', toPlayerId: 'p2', createdAt: new Date(Date.now() - 61_000).toISOString() }),
    );
    expect(drainSignals('room_1', 'p2')).toEqual([]);
  });
});
