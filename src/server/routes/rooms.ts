/**
 * 房间接口（C 维护）。
 *
 * 路径与请求体必须和 `src/api/httpAdapter.ts` 严格一致，
 * 否则前端切到真实模式就会挂 —— 两边由 typecheck + 冒烟测试共同保证。
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, parseInput } from '../middleware/errorHandler';
import {
  acknowledgeStory,
  postMessage,
  advanceAct,
  beginGame,
  chooseCharacter,
  createRoomSession,
  endGame,
  getRoomContext,
  getRoomState,
  joinRoomSession,
  updateReady,
  vote,
} from '../services/roomService';

const nickname = z.string().trim().min(1, '昵称不能为空').max(20, '昵称最多 20 个字');

const createSchema = z.object({ scriptId: z.string().min(1), nickname });
const joinSchema = z.object({ code: z.string().trim().min(6).max(6), nickname });
const playerQuerySchema = z.object({ playerId: z.string().min(1) });
const selectSchema = z.object({ playerId: z.string().min(1), characterId: z.string().min(1) });
const readySchema = z.object({ playerId: z.string().min(1), isReady: z.boolean() });
const voteSchema = z.object({
  voterPlayerId: z.string().min(1),
  targetPlayerId: z.string().min(1),
});

export const roomRouter = Router();

/** POST /api/rooms → { data: { room, player } } */
roomRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parseInput(createSchema, req.body);
    res.status(201).json({ data: await createRoomSession(input) });
  }),
);

/** POST /api/rooms/join → { data: { room, player } } */
roomRouter.post(
  '/join',
  asyncHandler(async (req, res) => {
    const input = parseInput(joinSchema, req.body);
    res.json({ data: await joinRoomSession(input) });
  }),
);

/** GET /api/rooms/:roomId/state?playerId= → { data: RoomState } */
roomRouter.get(
  '/:roomId/state',
  asyncHandler(async (req, res) => {
    const { playerId } = parseInput(playerQuerySchema, req.query);
    res.json({ data: await getRoomState(req.params.roomId, playerId) });
  }),
);

/** GET /api/rooms/:roomId/context?playerId= → { data: RoomContext } */
roomRouter.get(
  '/:roomId/context',
  asyncHandler(async (req, res) => {
    const { playerId } = parseInput(playerQuerySchema, req.query);
    res.json({ data: await getRoomContext(req.params.roomId, playerId) });
  }),
);

/** POST /api/rooms/:roomId/select-character */
roomRouter.post(
  '/:roomId/select-character',
  asyncHandler(async (req, res) => {
    const { playerId, characterId } = parseInput(selectSchema, req.body);
    res.json({ data: await chooseCharacter(req.params.roomId, playerId, characterId) });
  }),
);

/** POST /api/rooms/:roomId/ready */
roomRouter.post(
  '/:roomId/ready',
  asyncHandler(async (req, res) => {
    const { playerId, isReady } = parseInput(readySchema, req.body);
    res.json({ data: await updateReady(req.params.roomId, playerId, isReady) });
  }),
);

/** POST /api/rooms/:roomId/start */
roomRouter.post(
  '/:roomId/start',
  asyncHandler(async (req, res) => {
    const { playerId } = parseInput(readySchema.pick({ playerId: true }), req.body);
    res.json({ data: await beginGame(req.params.roomId, playerId) });
  }),
);

/** POST /api/rooms/:roomId/next-act */
roomRouter.post(
  '/:roomId/next-act',
  asyncHandler(async (req, res) => {
    const { playerId } = parseInput(readySchema.pick({ playerId: true }), req.body);
    res.json({ data: await advanceAct(req.params.roomId, playerId) });
  }),
);

/** POST /api/rooms/:roomId/votes */
roomRouter.post(
  '/:roomId/votes',
  asyncHandler(async (req, res) => {
    const { voterPlayerId, targetPlayerId } = parseInput(voteSchema, req.body);
    res.json({ data: await vote(req.params.roomId, voterPlayerId, targetPlayerId) });
  }),
);

/** POST /api/rooms/:roomId/finish */
roomRouter.post(
  '/:roomId/finish',
  asyncHandler(async (req, res) => {
    const { playerId } = parseInput(readySchema.pick({ playerId: true }), req.body);
    res.json({ data: await endGame(req.params.roomId, playerId) });
  }),
);

const messageSchema = z.object({
  playerId: z.string().min(1), channel: z.enum(['public', 'direct']),
  receiverPlayerId: z.string().min(1).optional(), content: z.string().max(1000), clueId: z.string().min(1).optional(),
});
roomRouter.post('/:roomId/messages', asyncHandler(async (req, res) => {
  const { playerId, ...input } = parseInput(messageSchema, req.body);
  res.json({ data: await postMessage(req.params.roomId, playerId, input) });
}));

roomRouter.post('/:roomId/confirm-story-read', asyncHandler(async (req, res) => {
  const { playerId } = parseInput(playerQuerySchema, req.body);
  res.json({ data: await acknowledgeStory(req.params.roomId, playerId) });
}));
