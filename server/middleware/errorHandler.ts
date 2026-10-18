/**
 * 统一错误处理与参数校验（C 维护）。
 *
 * 所有错误出口都在这里，HTTP 状态码与 AGENTS.md §5.2 的错误码一一对应，
 * 保证前端 `src/api/client.ts` 能统一解析成 `ApiError`。
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import type { ApiErrorCode } from '../../src/types/api';
import { ApiError } from '../../src/utils/apiError';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  ROOM_FULL: 409,
  INVALID_STATE: 409,
  RATE_LIMITED: 429,
  AI_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
  NETWORK_ERROR: 502,
  TIMEOUT: 504,
};

/** 包装 async 路由，把 reject 交给错误中间件（Express 4 不会自动捕获）。 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** 统一错误响应：`{ error: { code, message } }`。 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    const status = STATUS_BY_CODE[error.code] ?? 500;
    res.status(status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  console.error('[api] 未捕获异常：', error);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: '服务异常，请稍后重试' },
  });
}

/** 未匹配路由。 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在' } });
}

/** Zod 校验，失败转成 VALIDATION_ERROR。 */
export function parseInput<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue.path.join('.') || '参数';
    throw new ApiError('VALIDATION_ERROR', `${path}：${issue.message}`);
  }
  return result.data;
}
