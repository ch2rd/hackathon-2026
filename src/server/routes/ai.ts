/**
 * AI 推理接口（C 维护）。
 *
 * POST /api/ai/hint  { roomId, playerId } → { data: AIHint }
 * 无 Key / 超时 / 解析失败一律返回 source: "mock" 的确定性结果（§5.5）。
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, parseInput } from '../middleware/errorHandler';
import { generateHint } from '../services/aiService';

const hintSchema = z.object({
  roomId: z.string().min(1),
  playerId: z.string().min(1),
});

export const aiRouter = Router();

aiRouter.post(
  '/hint',
  asyncHandler(async (req, res) => {
    const { roomId, playerId } = parseInput(hintSchema, req.body);
    res.json({ data: await generateHint(roomId, playerId) });
  }),
);
