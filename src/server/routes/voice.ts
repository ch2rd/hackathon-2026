/**
 * 玩家语音信令接口（C 维护）。
 *
 * POST /api/voice/signals  { roomId, fromPlayerId, toPlayerId, kind, payload } → { data: { ok: true } }
 * GET  /api/voice/signals?roomId=&playerId=                                  → { data: VoiceSignal[] }
 *
 * 服务端在这里只做三件事：校验、排队、按收件人投递。
 * 它**不理解** payload（SDP / ICE 的 JSON 字符串）—— 这样信令层不随 WebRTC 演进而改。
 * 音频是 P2P 直连，不经过本服务。
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, parseInput } from '../middleware/errorHandler';
import { drainSignals, enqueueSignal } from '../services/voiceSignalService';

const sendSchema = z.object({
  roomId: z.string().min(1),
  fromPlayerId: z.string().min(1),
  toPlayerId: z.string().min(1),
  kind: z.enum(['hello', 'offer', 'answer', 'ice']),
  // SDP 一般 2～8KB，留足余量但仍设上限，避免被塞垃圾
  payload: z.string().min(1).max(20_000),
});

const pollSchema = z.object({
  roomId: z.string().min(1),
  playerId: z.string().min(1),
});

export const voiceRouter = Router();

voiceRouter.post(
  '/signals',
  asyncHandler(async (req, res) => {
    const input = parseInput(sendSchema, req.body);
    enqueueSignal({
      id: `sig_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      ...input,
      createdAt: new Date().toISOString(),
    });
    res.json({ data: { ok: true } });
  }),
);

voiceRouter.get(
  '/signals',
  asyncHandler(async (req, res) => {
    const { roomId, playerId } = parseInput(pollSchema, req.query);
    res.json({ data: drainSignals(roomId, playerId) });
  }),
);
