/**
 * 《真相局》后端入口（C 维护）。
 *
 * 分层：routes（校验入参）→ services（业务，复用 mockEngine 的规则）→ store（持久化）。
 * 剧本内容是静态文件（data/scripts/*.json），房间状态走 store。
 *
 * 启动：npm run dev:api    （默认 http://localhost:3001）
 */

import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { aiRouter } from './routes/ai';
import { roomRouter } from './routes/rooms';
import { scriptRouter } from './routes/scripts';
import { storeFilePath } from './store/roomStore';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ data: { ok: true } });
});

app.use('/api/scripts', scriptRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/ai', aiRouter);

// 兜底：未知路由 → NOT_FOUND；所有异常 → 统一错误体
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`[api] 真相局后端已启动：http://localhost:${port}`);
  console.log(`[api] 剧本目录：${process.env.SCRIPTS_DIR ?? 'data/scripts'}`);
  console.log(`[api] 房间数据文件：${storeFilePath()}`);
});
