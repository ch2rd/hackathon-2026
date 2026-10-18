/**
 * 剧本接口（C 维护）。
 *
 * 只做「校验入参 → 调 service → 套统一响应壳」，业务逻辑在 services/。
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, parseInput } from '../middleware/errorHandler';
import { getScriptDetail, getScripts } from '../services/roomService';

const listQuerySchema = z.object({
  genre: z.string().optional(),
  keyword: z.string().optional(),
});

export const scriptRouter = Router();

/** GET /api/scripts?genre=&keyword= → { data: ScriptSummary[], total } */
scriptRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseInput(listQuerySchema, req.query);
    const result = await getScripts({ genre: query.genre, keyword: query.keyword });
    res.json({ data: result.items, total: result.total });
  }),
);

/** GET /api/scripts/:scriptId → { data: ScriptDetail } */
scriptRouter.get(
  '/:scriptId',
  asyncHandler(async (req, res) => {
    res.json({ data: await getScriptDetail(req.params.scriptId) });
  }),
);
