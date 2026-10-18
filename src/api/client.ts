/**
 * HTTP 出口与模式开关（C 维护）。
 *
 * 只有这里允许调用 `fetch`。A/B 一律调用 `src/api/{scripts,rooms,ai}.ts`
 * 里的函数，不关心当前是 Mock 还是真实接口（AGENTS.md §1.2）。
 */

import type { ApiErrorBody, ApiErrorCode } from '../types/api';
import type { ListResult } from '../types/models';

/** 普通接口超时（毫秒）。AI 接口有独立超时，见 AGENTS.md §5.5。 */
export const REQUEST_TIMEOUT_MS = 8000;

/** Mock 开关：true 走 Mock 适配器（localStorage 持久化）。 */
export function isMockMode(): boolean {
  return import.meta.env.VITE_USE_MOCK === 'true';
}

/** 演示兜底开关：只控制 UI 是否显示「演示推进」按钮，不改变服务端规则。 */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

/**
 * 统一错误对象。Mock、真实模式、后端服务层抛出的都是它，
 * 所以 A/B 只需要 catch 一种错误（AGENTS.md §1.2 第 2 条）。
 * 定义在 `src/utils/apiError.ts`，这里只做再导出。
 */
import { ApiError } from '../utils/apiError';

export { ApiError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorBody(body: unknown): ApiErrorBody | null {
  if (!isRecord(body) || !isRecord(body.error)) return null;
  const { code, message } = body.error;
  if (typeof code !== 'string' || typeof message !== 'string') return null;
  return { code: code as ApiErrorCode, message };
}

async function send(path: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(
      aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
      aborted ? '请求超时，请稍后重试' : '连不上后端服务，请确认 API 是否已启动',
    );
  } finally {
    clearTimeout(timer);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = readErrorBody(body);
    throw new ApiError(
      parsed?.code ?? 'INTERNAL_ERROR',
      parsed?.message ?? '服务异常，请稍后重试',
      response.status,
    );
  }

  return body;
}

/** 单个对象接口：`{ data: T }` → `T` */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const body = await send(path, init);
  if (!isRecord(body) || !('data' in body)) {
    throw new ApiError('INTERNAL_ERROR', '返回格式不符合契约：缺少 data');
  }
  return body.data as T;
}

/** 列表接口：`{ data: T[], total }` → `ListResult<T>` */
export async function listRequest<T>(path: string, init?: RequestInit): Promise<ListResult<T>> {
  const body = await send(path, init);
  if (!isRecord(body) || !Array.isArray(body.data)) {
    throw new ApiError('INTERNAL_ERROR', '返回格式不符合契约：data 不是数组');
  }
  return {
    items: body.data as T[],
    total: typeof body.total === 'number' ? body.total : body.data.length,
  };
}

/** 拼查询参数，空值自动丢弃，保持 URL 干净。 */
export function withQuery(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/** POST 便捷封装。 */
export function post<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(payload) });
}
