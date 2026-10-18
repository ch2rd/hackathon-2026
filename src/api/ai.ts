/**
 * AI 推理接口（C 维护）—— A/B 只 import 这里的函数。
 *
 * 服务端约束见 AGENTS.md §5.5：只用当前玩家可见的线索、绝不返回凶手，
 * 失败或无 Key 时降级为 `source: 'mock'` 的确定性结果，不阻塞主流程。
 */

import type { ApiAdapter } from './adapter';
import { isMockMode } from './client';
import { httpAdapter } from './httpAdapter';
import { mockAdapter } from './mockAdapter';

const adapter: ApiAdapter = isMockMode() ? mockAdapter : httpAdapter;

/** 获取 AI 推理提示。注意：它只给嫌疑排序和理由，不会公布真相。 */
export function getAIHint(roomId: string, playerId: string) {
  return adapter.getAIHint(roomId, playerId);
}
