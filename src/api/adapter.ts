/**
 * 适配器契约（C 维护）。
 *
 * Mock 与真实 HTTP 必须实现**同一个接口**，保证 A/B 切换模式时
 * 函数签名、返回类型、错误行为完全一致（AGENTS.md §1.2 第 2 条）。
 * 任何一侧少实现一个方法，typecheck 就会拦下来。
 */

import type {
  AIChatReply,
  AIHint,
  Genre,
  ListResult,
  RoomState,
  ScriptDetail,
  ScriptSummary,
  VoiceSignal,
  VoiceSignalKind,
} from '../types/models';
import type { RoomContext, RoomSession, SendMessageInput } from '../types/api';

export interface CreateRoomInput {
  scriptId: string;
  nickname: string;
}

export interface JoinRoomInput {
  code: string;
  nickname: string;
}

export interface ScriptQuery {
  genre?: Genre;
  keyword?: string;
}

/** 发一条语音信令（SDP / ICE 的盲转发）。 */
export interface SendSignalInput {
  roomId: string;
  fromPlayerId: string;
  toPlayerId: string;
  kind: VoiceSignalKind;
  payload: string;
}

export interface ApiAdapter {
  // ---- 剧本 ----
  getScripts(params?: ScriptQuery): Promise<ListResult<ScriptSummary>>;
  getScriptDetail(scriptId: string): Promise<ScriptDetail>;

  // ---- 房间 ----
  createRoom(input: CreateRoomInput): Promise<RoomSession>;
  joinRoom(input: JoinRoomInput): Promise<RoomSession>;
  getRoomState(roomId: string, playerId: string): Promise<RoomState>;
  getRoomContext(roomId: string, playerId: string): Promise<RoomContext>;

  // ---- 房间内的操作 ----
  selectCharacter(roomId: string, playerId: string, characterId: string): Promise<RoomState>;
  setReady(roomId: string, playerId: string, isReady: boolean): Promise<RoomState>;
  startRoom(roomId: string, playerId: string): Promise<RoomState>;
  nextAct(roomId: string, playerId: string): Promise<RoomState>;
  submitVote(roomId: string, voterPlayerId: string, targetPlayerId: string): Promise<RoomState>;
  finishRoom(roomId: string, playerId: string): Promise<RoomState>;

  confirmStoryRead(roomId: string, playerId: string): Promise<RoomState>;
  sendMessage(roomId: string, playerId: string, input: SendMessageInput): Promise<RoomState>;

  // ---- AI ----
  getAIHint(roomId: string, playerId: string): Promise<AIHint>;
  askAiDm(question: string): Promise<AIChatReply>;

  // ---- 玩家语音信令（音频本身走 WebRTC P2P，不经过这里）----
  sendSignal(input: SendSignalInput): Promise<void>;
  /** 取走「投递给我」的全部信令（取走即删除，不重复投递）。 */
  pollSignals(roomId: string, playerId: string): Promise<VoiceSignal[]>;
}
