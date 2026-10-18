/**
 * 剧本接口（C 维护）—— A/B 只 import 这里的函数。
 *
 * Mock / 真实模式由 `VITE_USE_MOCK` 决定，调用方不需要关心底层是哪个适配器。
 */

import type { ApiAdapter, ScriptQuery } from './adapter';
import { isMockMode } from './client';
import { httpAdapter } from './httpAdapter';
import { mockAdapter } from './mockAdapter';

const adapter: ApiAdapter = isMockMode() ? mockAdapter : httpAdapter;

/** 剧本列表，支持按类型筛选与关键词搜索。 */
export function getScripts(params?: ScriptQuery) {
  return adapter.getScripts(params);
}

/** 剧本详情。**不含**凶手 id 和任何角色秘密。 */
export function getScriptDetail(scriptId: string) {
  return adapter.getScriptDetail(scriptId);
}
