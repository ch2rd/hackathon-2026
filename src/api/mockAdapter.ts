/**
 * Mock 适配器（C 维护）—— Mock-first 策略的落地。
 *
 * 为什么要有它：前端不能等后端（AGENTS.md §1.2）。这里用 localStorage
 * 保存房间/玩家/投票，让 `VITE_USE_MOCK=true` 时不启动任何后端也能完整演示。
 *
 * **对剧本零假设**：所有剧本数据都从 `data/scripts/*.json` 读，
 * 按 id 查表，不写死任何一个剧本。新增剧本不需要改本文件。
 *
 * 与真实接口的一致性：
 * - 实现同一份 `ApiAdapter`，签名/返回类型由 typecheck 强制对齐；
 * - 错误统一抛 `ApiError`，错误码取自 AGENTS.md §5.2，语义与真实模式一致；
 * - 状态流转严格照 AGENTS.md §4.10。
 *
 * 多标签页：每次调用都重新读取 localStorage（不做内存缓存），
 * 因此 A/B 的 2 秒轮询天然能看到其它标签页写入的新状态。
 */

import type { RoomContext, RoomSession } from '../types/api';
import type {
  Character,
  CharacterPublic,
  Clue,
  Player,
  PublicPlayer,
  Room,
  ScriptBundle,
  ScriptDetail,
  ScriptMeta,
  ScriptSummary,
  Vote,
} from '../types/models';
import { isPlayableBundle } from '../utils/scriptSchema';
import type { ApiAdapter } from './adapter';
import { ApiError } from './client';
import { findScriptBundle, loadScriptBundles } from '../mocks/scriptCatalog';

// ---------- 本地存储 ----------

interface MockDb {
  rooms: Room[];
  players: Player[];
  votes: Vote[];
}

const STORAGE_KEY = 'truth-bureau/mock-state/v1';

function emptyDb(): MockDb {
  return { rooms: [], players: [], votes: [] };
}

function readDb(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw) as Partial<MockDb> | null;
    if (!parsed || typeof parsed !== 'object') return emptyDb();
    return {
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
      players: Array.isArray(parsed.players) ? parsed.players : [],
      votes: Array.isArray(parsed.votes) ? parsed.votes : [],
    };
  } catch {
    // 存储被禁用或数据损坏时，宁可开一个干净房间，也不要白屏
    return emptyDb();
  }
}

function writeDb(db: MockDb): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    throw new ApiError('INTERNAL_ERROR', '本地存储不可用，Mock 模式无法保存房间');
  }
}

// ---------- 工具 ----------

/** 6 位房间号，大写，去掉容易混淆的 0/O/1/I（AGENTS.md §4.6）。 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function newRoomCode(rooms: Room[]): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!rooms.some((room) => room.code === code)) return code;
  }
}

/** 稳定散列：同样的输入永远得到同样的置信度，保证 Mock 结果可复现。 */
function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 100003;
  }
  return hash;
}

function toSummary(meta: ScriptMeta): ScriptSummary {
  return {
    id: meta.id,
    title: meta.title,
    subtitle: meta.subtitle,
    coverUrl: meta.coverUrl,
    genre: meta.genre,
    playerCount: meta.playerCount,
    durationMinutes: meta.durationMinutes,
    difficulty: meta.difficulty,
    summary: meta.summary,
    tags: meta.tags,
  };
}

function toPublicCharacter(character: Character): CharacterPublic {
  const { id, scriptId, name, identity, age, avatarUrl, publicIntro, sortOrder } = character;
  return { id, scriptId, name, identity, age, avatarUrl, publicIntro, sortOrder };
}

function requireRoom(db: MockDb, roomId: string): Room {
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) throw new ApiError('NOT_FOUND', '房间不存在，可能已被清理');
  return room;
}

function requirePlayer(db: MockDb, room: Room, playerId: string): Player {
  const player = db.players.find((item) => item.id === playerId && item.roomId === room.id);
  if (!player) throw new ApiError('NOT_FOUND', '你不在这个房间里，请重新加入');
  return player;
}

/** 按房间的 scriptId 取剧本包；剧本不存在或还没录入数据都会在这里拦下。 */
async function requireBundle(scriptId: string): Promise<ScriptBundle> {
  const bundle = await findScriptBundle(scriptId);
  if (!bundle) throw new ApiError('NOT_FOUND', '剧本不存在');
  if (!isPlayableBundle(bundle)) {
    throw new ApiError('INVALID_STATE', '这个剧本还没开放，数据尚未录入');
  }
  return bundle;
}

function playersOf(db: MockDb, room: Room): Player[] {
  return db.players.filter((player) => player.roomId === room.id);
}

/** 当前玩家有权看到的线索：公开的 + 自己角色的私密线索，且不超过当前幕。 */
function visibleCluesFor(bundle: ScriptBundle, me: Player, upToAct: number): Clue[] {
  return bundle.clues.filter((clue) => {
    if (clue.actNumber > upToAct) return false;
    if (clue.visibility === 'public') return true;
    return me.characterId !== null && clue.ownerCharacterId === me.characterId;
  });
}

function buildResult(db: MockDb, room: Room, bundle: ScriptBundle) {
  const counts = new Map<string, number>();
  for (const vote of db.votes) {
    if (vote.roomId !== room.id) continue;
    counts.set(vote.targetPlayerId, (counts.get(vote.targetPlayerId) ?? 0) + 1);
  }

  // 先找最高票；**平票时不给「最高票角色」**，避免把并列当成定论
  let topCount = 0;
  let topTargets: string[] = [];
  for (const [targetPlayerId, count] of counts) {
    if (count > topCount) {
      topCount = count;
      topTargets = [targetPlayerId];
    } else if (count === topCount) {
      topTargets.push(targetPlayerId);
    }
  }

  const topTarget = topTargets.length === 1 ? topTargets[0] : null;
  const topPlayer =
    topTarget === null ? null : db.players.find((player) => player.id === topTarget) ?? null;
  const topVotedCharacterId = topPlayer?.characterId ?? null;

  const murdererCharacterId = bundle.script.murdererCharacterId ?? '';
  return {
    murdererCharacterId,
    topVotedCharacterId,
    isCorrect: topVotedCharacterId !== null && topVotedCharacterId === murdererCharacterId,
  };
}

function buildRoomState(db: MockDb, room: Room, playerId: string, bundle: ScriptBundle) {
  const players = playersOf(db, room);
  const me = requirePlayer(db, room, playerId);

  const myCharacter =
    me.characterId === null
      ? null
      : bundle.characters.find((character) => character.id === me.characterId) ?? null;

  const publicPlayers: PublicPlayer[] = players.map((player) => ({
    id: player.id,
    nickname: player.nickname,
    characterId: player.characterId,
    characterName:
      player.characterId === null
        ? null
        : bundle.characters.find((character) => character.id === player.characterId)?.name ?? null,
    isHost: player.isHost,
    isReady: player.isReady,
  }));

  return {
    room,
    players: publicPlayers,
    currentAct: bundle.acts.find((act) => act.actNumber === room.currentAct) ?? null,
    me: {
      player: me,
      character: myCharacter,
      visibleClues: visibleCluesFor(bundle, me, room.currentAct),
    },
    votes: db.votes
      .filter((vote) => vote.roomId === room.id)
      .map((vote) => ({
        voterPlayerId: vote.voterPlayerId,
        targetPlayerId: vote.targetPlayerId,
      })),
    result: room.status === 'ended' ? buildResult(db, room, bundle) : null,
  };
}

/** 全部玩家都选好角色并准备 → 自动进入 playing（§4.10）。 */
function maybeEnterPlaying(db: MockDb, room: Room): void {
  if (room.status !== 'selecting') return;
  const players = playersOf(db, room);
  if (players.length < 2) return;
  if (!players.every((player) => player.characterId !== null && player.isReady)) return;
  room.status = 'playing';
  room.currentAct = 1;
}

// ---------- 适配器实现 ----------

export const mockAdapter: ApiAdapter = {
  async getScripts(params) {
    const keyword = params?.keyword?.trim().toLowerCase() ?? '';
    const bundles = await loadScriptBundles();

    const items = bundles
      .map((bundle) => toSummary(bundle.script))
      .filter((script) => {
        if (params?.genre && script.genre !== params.genre) return false;
        if (!keyword) return true;
        return (
          script.title.toLowerCase().includes(keyword) ||
          script.subtitle.toLowerCase().includes(keyword) ||
          script.summary.toLowerCase().includes(keyword) ||
          script.tags.some((tag) => tag.toLowerCase().includes(keyword))
        );
      });

    return { items, total: items.length };
  },

  async getScriptDetail(scriptId) {
    const bundle = await findScriptBundle(scriptId);
    if (!bundle) throw new ApiError('NOT_FOUND', '剧本不存在');

    // 数据没录入完的剧本仍然可以看详情，只是没有角色可选
    const detail: ScriptDetail = {
      ...toSummary(bundle.script),
      description: bundle.script.description,
      characters: bundle.characters.map(toPublicCharacter),
    };
    return detail;
  },

  async createRoom(input) {
    const nickname = input.nickname.trim();
    if (!nickname) throw new ApiError('VALIDATION_ERROR', '昵称不能为空');

    const bundle = await requireBundle(input.scriptId);

    const db = readDb();
    const createdAt = new Date().toISOString();
    const room: Room = {
      id: newId('room'),
      code: newRoomCode(db.rooms),
      scriptId: bundle.script.id,
      hostPlayerId: '',
      status: 'waiting',
      currentAct: 0,
      createdAt,
    };
    const player: Player = {
      id: newId('player'),
      roomId: room.id,
      nickname,
      characterId: null,
      isHost: true,
      isReady: false,
      joinedAt: createdAt,
    };
    room.hostPlayerId = player.id;

    db.rooms.push(room);
    db.players.push(player);
    writeDb(db);

    const session: RoomSession = { room, player };
    return session;
  },

  async joinRoom(input) {
    const nickname = input.nickname.trim();
    if (!nickname) throw new ApiError('VALIDATION_ERROR', '昵称不能为空');
    const code = input.code.trim().toUpperCase();
    if (code.length !== 6) throw new ApiError('VALIDATION_ERROR', '房间号是 6 位字符');

    const db = readDb();
    const room = db.rooms.find((item) => item.code === code);
    if (!room) throw new ApiError('NOT_FOUND', '房间不存在，请核对房间号');
    if (room.status !== 'waiting') throw new ApiError('INVALID_STATE', '该房间已经开局，无法加入');

    const bundle = await requireBundle(room.scriptId);
    if (playersOf(db, room).length >= bundle.script.playerCount) {
      throw new ApiError('ROOM_FULL', '房间人数已满');
    }

    const player: Player = {
      id: newId('player'),
      roomId: room.id,
      nickname,
      characterId: null,
      isHost: false,
      isReady: false,
      joinedAt: new Date().toISOString(),
    };
    db.players.push(player);
    writeDb(db);

    const session: RoomSession = { room, player };
    return session;
  },

  async getRoomState(roomId, playerId) {
    const db = readDb();
    const room = requireRoom(db, roomId);
    const bundle = await requireBundle(room.scriptId);
    return buildRoomState(db, room, playerId, bundle);
  },

  async getRoomContext(roomId, playerId): Promise<RoomContext> {
    const db = readDb();
    const room = requireRoom(db, roomId);
    const bundle = await requireBundle(room.scriptId);
    const me = requirePlayer(db, room, playerId);

    // Mock 模式下玩家手里就有完整数据（同一浏览器），
    // 但仍按「公开 + 自己私密」过滤，保持与真实模式同构。
    return {
      acts: bundle.acts,
      characters: bundle.characters.map(toPublicCharacter),
      clues: visibleCluesFor(bundle, me, Number.MAX_SAFE_INTEGER),
      murdererCharacterId: bundle.script.murdererCharacterId,
    };
  },

  async selectCharacter(roomId, playerId, characterId) {
    const db = readDb();
    const room = requireRoom(db, roomId);
    const bundle = await requireBundle(room.scriptId);
    const me = requirePlayer(db, room, playerId);

    if (room.status !== 'selecting') throw new ApiError('INVALID_STATE', '当前不是选角阶段');
    // game-flow §6 保守约定：取消准备才能更换角色
    if (me.isReady) throw new ApiError('INVALID_STATE', '请先取消准备，再更换角色');

    const target = bundle.characters.find((character) => character.id === characterId);
    if (!target) throw new ApiError('NOT_FOUND', '角色不存在');

    const taken = playersOf(db, room).some(
      (player) => player.characterId === characterId && player.id !== me.id,
    );
    if (taken) throw new ApiError('INVALID_STATE', '该角色已被其他玩家选走');

    me.characterId = characterId;
    writeDb(db);
    return buildRoomState(db, room, playerId, bundle);
  },

  async setReady(roomId, playerId, isReady) {
    const db = readDb();
    const room = requireRoom(db, roomId);
    const bundle = await requireBundle(room.scriptId);
    const me = requirePlayer(db, room, playerId);

    if (room.status !== 'selecting') throw new ApiError('INVALID_STATE', '当前不是选角阶段');
    if (isReady && me.characterId === null) {
      throw new ApiError('VALIDATION_ERROR', '请先选择角色，再点准备');
    }

    me.isReady = isReady;
    maybeEnterPlaying(db, room);
    writeDb(db);
    return buildRoomState(db, room, playerId, bundle);
  },

  async startRoom(roomId, playerId) {
    const db = readDb();
    const room = requireRoom(db, roomId);
    const bundle = await requireBundle(room.scriptId);
    const me = requirePlayer(db, room, playerId);

    if (room.hostPlayerId !== me.id) throw new ApiError('FORBIDDEN', '只有房主可以开始游戏');
    if (room.status !== 'waiting') throw new ApiError('INVALID_STATE', '游戏已经开始过了');
    if (playersOf(db, room).length < 2) {
      throw new ApiError('INVALID_STATE', '至少需要 2 名玩家才能开始');
    }

    room.status = 'selecting';
    writeDb(db);
    return buildRoomState(db, room, playerId, bundle);
  },

  async nextAct(roomId, playerId) {
    const db = readDb();
    const room = requireRoom(db, roomId);
    const bundle = await requireBundle(room.scriptId);
    const me = requirePlayer(db, room, playerId);

    if (room.hostPlayerId !== me.id) throw new ApiError('FORBIDDEN', '只有房主可以推进剧情');
    if (room.status !== 'playing') throw new ApiError('INVALID_STATE', '当前不在剧情阶段');

    const lastAct = bundle.acts.reduce((max, act) => Math.max(max, act.actNumber), 0);
    if (room.currentAct >= lastAct) {
      room.status = 'voting';
    } else {
      room.currentAct += 1;
    }

    writeDb(db);
    return buildRoomState(db, room, playerId, bundle);
  },

  async submitVote(roomId, voterPlayerId, targetPlayerId) {
    const db = readDb();
    const room = requireRoom(db, roomId);
    const bundle = await requireBundle(room.scriptId);
    requirePlayer(db, room, voterPlayerId);

    if (room.status !== 'voting') throw new ApiError('INVALID_STATE', '当前不是投票阶段');
    if (voterPlayerId === targetPlayerId) throw new ApiError('VALIDATION_ERROR', '不能投给自己');

    const target = db.players.find(
      (player) => player.id === targetPlayerId && player.roomId === room.id,
    );
    if (!target) throw new ApiError('NOT_FOUND', '被投票的玩家不在房间中');

    const alreadyVoted = db.votes.some(
      (vote) => vote.roomId === room.id && vote.voterPlayerId === voterPlayerId,
    );
    if (alreadyVoted) throw new ApiError('INVALID_STATE', '每位玩家只能投一次');

    db.votes.push({
      id: newId('vote'),
      roomId: room.id,
      voterPlayerId,
      targetPlayerId,
      createdAt: new Date().toISOString(),
    });

    // 全部投完 → 自动进入 ended（§4.10）
    if (db.votes.filter((vote) => vote.roomId === room.id).length >= playersOf(db, room).length) {
      room.status = 'ended';
    }

    writeDb(db);
    return buildRoomState(db, room, voterPlayerId, bundle);
  },

  async finishRoom(roomId, playerId) {
    const db = readDb();
    const room = requireRoom(db, roomId);
    const bundle = await requireBundle(room.scriptId);
    const me = requirePlayer(db, room, playerId);

    if (room.hostPlayerId !== me.id) throw new ApiError('FORBIDDEN', '只有房主可以强制结束');
    // game-flow §6 保守约定：演示推进不跳选角
    if (room.status === 'waiting' || room.status === 'selecting') {
      throw new ApiError('INVALID_STATE', '演示推进不能跳过选角阶段');
    }

    room.status = 'ended';
    writeDb(db);
    return buildRoomState(db, room, playerId, bundle);
  },

  async getAIHint(roomId, playerId) {
    const db = readDb();
    const room = requireRoom(db, roomId);
    const bundle = await requireBundle(room.scriptId);
    const me = requirePlayer(db, room, playerId);

    const clues = visibleCluesFor(bundle, me, room.currentAct);
    const others = playersOf(db, room).filter(
      (player) => player.id !== me.id && player.characterId !== null,
    );

    const REASONS = [
      '在停电前后的说法存在出入，时间线对不上',
      '与死者有过未公开的私下接触，动机尚不明确',
      '对案发现场的描述与已知线索相互矛盾',
      '在关键时间段的行动缺少旁证',
      '对某件物品的来历解释含糊',
    ];

    const suspects = others
      .map((player) => {
        const character = bundle.characters.find((item) => item.id === player.characterId);
        const seed = stableHash(player.id);
        return {
          playerId: player.id,
          name: character?.name ?? player.nickname,
          confidence: 45 + (seed % 45),
          reason: REASONS[seed % REASONS.length],
        };
      })
      .sort((left, right) => right.confidence - left.confidence);

    return {
      summary:
        clues.length === 0
          ? '你目前还没有拿到任何线索，先把剧情推下去，我再帮你梳理。'
          : `根据你现在掌握的 ${clues.length} 条线索，可梳理出 ${suspects.length} 名值得留意的对象，注意他们在时间线上的矛盾。`,
      suspects,
      disclaimer: 'AI 仅根据你已获得的线索推测，不代表真相。',
      source: 'mock' as const,
    };
  },
};
