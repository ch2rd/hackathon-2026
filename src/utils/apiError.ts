/**
 * 统一错误对象（C 维护）。
 *
 * 放在 `utils` 而不是 `api/client`：前端 Mock、前端真实模式、**后端服务层**
 * 抛的都是同一个类，而 `api/client` 依赖浏览器环境（`import.meta.env`），
 * 后端不能引。A/B 仍然从 `src/api/client` 拿到它（那边做了再导出）。
 */

import type { ApiErrorCode } from '../types/api';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}
