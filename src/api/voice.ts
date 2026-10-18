/**
 * 玩家语音信令接口（C 维护）—— B 只 import 这里的函数。
 *
 * 音频**不走这里**：真正的说话声由浏览器之间的 WebRTC 直连传输，
 * 本模块只负责在两边之间递送 SDP / ICE candidate 这些小纸条。
 *
 * 为什么用轮询而不是 WebSocket：AGENTS.md §0.1 把 WebSocket 实时同步列为 MVP 非目标，
 * 信令因此走现有轮询通道；Mock 模式用 localStorage 队列，真实模式走后端内存队列。
 */

import type { SendSignalInput } from './adapter';
import { isMockMode } from './client';
import { httpAdapter } from './httpAdapter';
import { mockAdapter } from './mockAdapter';

const adapter = isMockMode() ? mockAdapter : httpAdapter;

/** 发一条信令（盲转发，服务端不解析 payload）。 */
export function sendVoiceSignal(input: SendSignalInput) {
  return adapter.sendSignal(input);
}

/** 取走投递给我的全部信令（取走即删除，不会重复投递）。 */
export function pollVoiceSignals(roomId: string, playerId: string) {
  return adapter.pollSignals(roomId, playerId);
}
