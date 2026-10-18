/**
 * 《真相局》共享类型 —— 全项目唯一类型来源。
 *
 * 本文件 owner 是 C。当前内容逐字来自 AGENTS.md §4（已冻结契约），
 * B 仅因项目初始化需要先行落盘，任何修改必须走 §3.6 变更流程。
 */

// ---------- §4.1 枚举 ----------

export type Genre = '推理' | '情感' | '恐怖' | '欢乐' | '硬核';
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type RoomStatus = 'waiting' | 'selecting' | 'playing' | 'voting' | 'ended';
export type ClueVisibility = 'public' | 'private';

// ---------- §4.2 Script（剧本） ----------

/** 含 murdererCharacterId，仅允许存在于服务端。 */
export interface Script {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  genre: Genre;
  playerCount: number;
  durationMinutes: number;
  difficulty: Difficulty;
  summary: string;
  description: string;
  tags: string[];
  /** 仅服务端可见，凶手角色 id */
  murdererCharacterId: string;
  createdAt: string;
}

export interface ScriptSummary {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  genre: Genre;
  playerCount: number;
  durationMinutes: number;
  difficulty: Difficulty;
  summary: string;
  tags: string[];
}

// ---------- §4.3 Character（角色） ----------

/** 含 secret 与 goals，secret 仅本人可见。 */
export interface Character {
  id: string;
  scriptId: string;
  name: string;
  identity: string;
  age: number;
  avatarUrl: string;
  publicIntro: string;
  /** 仅本人可见的秘密 */
  secret: string;
  goals: string[];
  sortOrder: number;
}

export interface CharacterPublic {
  id: string;
  scriptId: string;
  name: string;
  identity: string;
  age: number;
  avatarUrl: string;
  publicIntro: string;
  sortOrder: number;
}

// ---------- §4.4 ScriptAct（幕） ----------

export interface ScriptDetail extends ScriptSummary {
  description: string;
  characters: CharacterPublic[];
}

export interface ScriptAct {
  id: string;
  scriptId: string;
  /** 第几幕，从 1 开始 */
  actNumber: number;
  title: string;
  narration: string;
}

// ---------- §4.5 Clue（线索） ----------

export interface Clue {
  id: string;
  scriptId: string;
  /** 第几幕出现 */
  actNumber: number;
  title: string;
  content: string;
  visibility: ClueVisibility;
  /** 私密线索归属角色；公开为 null */
  ownerCharacterId: string | null;
}

// ---------- §4.6 Room（房间） ----------

export interface Room {
  id: string;
  /** 6 位房间号，大写，去掉 0/O/1/I */
  code: string;
  scriptId: string;
  /** 房主 Player.id */
  hostPlayerId: string;
  status: RoomStatus;
  /** 当前幕；0 表示未开始 */
  currentAct: number;
  createdAt: string;
}

// ---------- §4.7 Player（玩家） ----------

export interface Player {
  id: string;
  roomId: string;
  nickname: string;
  /** 选择的角色 */
  characterId: string | null;
  isHost: boolean;
  isReady: boolean;
  joinedAt: string;
}

// ---------- §4.8 Vote（投票） ----------

export interface Vote {
  id: string;
  roomId: string;
  voterPlayerId: string;
  targetPlayerId: string;
  createdAt: string;
}

// ---------- §4.11 RoomState（B 的主数据源） ----------

export interface PublicPlayer {
  id: string;
  nickname: string;
  characterId: string | null;
  characterName: string | null;
  isHost: boolean;
  isReady: boolean;
}

export interface RoomState {
  room: Room;
  players: PublicPlayer[];
  currentAct: ScriptAct | null;
  me: {
    player: Player;
    character: Character | null;
    visibleClues: Clue[];
  };
  votes: Array<{ voterPlayerId: string; targetPlayerId: string }>;
  /** 只在 status === 'ended' 时非空 */
  result: {
    murdererCharacterId: string;
    topVotedCharacterId: string | null;
    isCorrect: boolean;
  } | null;
}

// ---------- §5.4 / §5.5 API 相关类型 ----------

export interface ListResult<T> {
  items: T[];
  total: number;
}

export interface AISuspect {
  playerId: string;
  name: string;
  confidence: number;
  reason: string;
}

export interface AIHint {
  summary: string;
  suspects: AISuspect[];
  disclaimer: string;
  source: 'llm' | 'mock';
}
