/**
 * 真实 HTTP 适配器（C 维护）。
 *
 * 只做「拼路径 + 调用 client」这一件事，不含任何业务逻辑；
 * 所有校验与状态流转都由服务端负责（AGENTS.md §3.4）。
 */

import type { RoomContext, RoomSession } from '../types/api';
import type {
  AIHint,
  RoomState,
  ScriptDetail,
  ScriptSummary,
} from '../types/models';
import type { ApiAdapter } from './adapter';
import { listRequest, post, request, withQuery } from './client';

function roomPath(roomId: string, suffix = ''): string {
  return `/api/rooms/${encodeURIComponent(roomId)}${suffix}`;
}

export const httpAdapter: ApiAdapter = {
  getScripts(params) {
    return listRequest<ScriptSummary>(
      withQuery('/api/scripts', {
        genre: params?.genre,
        keyword: params?.keyword,
      }),
    );
  },

  getScriptDetail(scriptId) {
    return request<ScriptDetail>(`/api/scripts/${encodeURIComponent(scriptId)}`);
  },

  createRoom(input) {
    return post<RoomSession>('/api/rooms', input);
  },

  joinRoom(input) {
    return post<RoomSession>('/api/rooms/join', input);
  },

  getRoomState(roomId, playerId) {
    return request<RoomState>(withQuery(roomPath(roomId, '/state'), { playerId }));
  },

  getRoomContext(roomId, playerId) {
    return request<RoomContext>(withQuery(roomPath(roomId, '/context'), { playerId }));
  },

  selectCharacter(roomId, playerId, characterId) {
    return post<RoomState>(roomPath(roomId, '/select-character'), { playerId, characterId });
  },

  setReady(roomId, playerId, isReady) {
    return post<RoomState>(roomPath(roomId, '/ready'), { playerId, isReady });
  },

  startRoom(roomId, playerId) {
    return post<RoomState>(roomPath(roomId, '/start'), { playerId });
  },

  nextAct(roomId, playerId) {
    return post<RoomState>(roomPath(roomId, '/next-act'), { playerId });
  },

  submitVote(roomId, voterPlayerId, targetPlayerId) {
    return post<RoomState>(roomPath(roomId, '/votes'), { voterPlayerId, targetPlayerId });
  },

  finishRoom(roomId, playerId) {
    return post<RoomState>(roomPath(roomId, '/finish'), { playerId });
  },

  confirmStoryRead(roomId, playerId) {
    return post<RoomState>(roomPath(roomId, '/confirm-story-read'), { playerId });
  },
  sendMessage(roomId, playerId, input) {
    return post<RoomState>(roomPath(roomId, '/messages'), { playerId, ...input });
  },
  getAIHint(roomId, playerId) {
    return post<AIHint>('/api/ai/hint', { roomId, playerId });
  },
};
