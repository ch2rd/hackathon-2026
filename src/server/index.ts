/**
 * 《真相局》后端入口（C 维护）。
 *
 * 分层：routes（校验入参）→ services（业务，复用 mockEngine 的规则）→ store（持久化）。
 * 剧本内容是静态文件（data/scripts/*.json），房间状态走 store。
 *
 * 启动：npm run dev:api    （默认 http://localhost:3001）
 *
 * 为什么拆成 createApp / startServer：
 * `tests/api.e2e.test.ts` 要在一个随机端口上起一份真实后端来跑主流程，
 * 如果本文件一 import 就 listen，测试就没法在进程内复用路由与中间件。
 * 直接执行本文件时才监听端口，被 import 时只导出工厂。
 */

import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { pathToFileURL } from 'node:url';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { aiRouter } from './routes/ai';
import { roomRouter } from './routes/rooms';
import { scriptRouter } from './routes/scripts';
import { voiceRouter } from './routes/voice';
import { storeFilePath } from './store/roomStore';

/** 组装 Express 应用但**不监听端口**。测试直接复用。 */
export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ data: { ok: true } });
  });

  app.use('/api/scripts', scriptRouter);
  app.use('/api/rooms', roomRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/voice', voiceRouter);

  // 兜底：未知路由 → NOT_FOUND；所有异常 → 统一错误体
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/** 起服务并打印启动信息。`port` 省略时读 `PORT`，再退回 3001。 */
export function startServer(port = Number(process.env.PORT ?? 3001)) {
  const app = createApp();

  return app.listen(port, () => {
    console.log(`[api] 真相局后端已启动：http://localhost:${port}`);
    console.log(`[api] 剧本目录：${process.env.SCRIPTS_DIR ?? 'data/scripts'}`);
    console.log(`[api] 房间数据文件：${storeFilePath()}`);
  });
}

/** 只有被直接执行（不是被 import）时才监听端口。 */
const isDirectRun = (() => {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  startServer();
}
