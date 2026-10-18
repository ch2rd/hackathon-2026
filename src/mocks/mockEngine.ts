/**
 * Mock 游戏引擎（C 维护）—— **纯逻辑，不碰浏览器 API**。
 *
 * 为什么要单独拆一层：
 * - 规则（AGENTS.md §4.10）不该和 localStorage / Vite 的 JSON 加载搅在一起；
 * - 拆出来之后，任何剧本的数据都能直接丢进来跑测试，不需要浏览器环境；
 * - 以后真实后端实现 services 层时，这份规则可以直接对照移植。
 *
 * 约束：本文件不 import 任何 Vite 专属 API（`import.meta.glob` 等），
 * 剧本数据一律通过 `catalog` 参数注入。
 */

import type { RoomContext, RoomSession } from '../types/api';
import type {
  Character,
  CharacterPublic,
  Clue,
  Player,
  PublicPlayer,
  Room,
  RoomState,
  ScriptBundle,
  ScriptDetail,
  ScriptMeta,
  ScriptSummary,
  Vote,
} from '../types/models';
import { isPlayableBundle } from '../utils/scriptSchema';
import { ApiError } from '../utils/apiError';

/** Mock 模式的持久化结构。 */
export interface MockDb {
  rooms: Room[];
  players: Player[];
  votes: Vote[];
}

/** 剧本目录：scriptId → 剧本包。 */
export type ScriptCatalog = Map<string, ScriptBundle>;

export function emptyDb(): MockDb {
  return { rooms: [], players: [], votes: [] };
}

export function toCatalog(bundles: ScriptBundle[]): ScriptCatalog {
  return new Map(bundles.map((bundle) => [bundle.script.id, bundle]));
}

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

/** 稳定散列：同样输入永远得到同样置信度，保证 Mock 结果可复现。 */
function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 100003;
  }
  return hash;
}

export function toSummary(meta: ScriptMeta): ScriptSummary {
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

export function toPublicCharacter(character: Character): CharacterPublic {
  const { id, scriptId, name, identity, age, avatarUrl, publicIntro, sortOrder } = character;
  return { id, scriptId, name, identity, age, avatarUrl, publicIntro, sortOrder };
}

function findRoom(db: MockDb, roomId: string): Room {
  const room = db.rooms.find((item) => item.id === roomId);
  if (!room) throw new ApiError('NOT_FOUND', '房间不存在，可能已被清理');
  return room;
}

function requirePlayer(db: MockDb, room: Room, playerId: string): Player {
  const player = db.players.find((item) => item.id === playerId && item.roomId === room.id);
  if (!player) throw new ApiError('NOT_FOUND', '你不在这个房间里，请重新加入');
  return player;
}

/** 取剧本包：不存在 → NOT_FOUND；数据没录完 → INVALID_STATE。 */
export function requireBundle(catalog: ScriptCatalog, scriptId: string): ScriptBundle {
  const bundle = catalog.get(scriptId);
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
export function visibleCluesFor(bundle: ScriptBundle, me: Player, upToAct: number): Clue[] {
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

export function buildRoomState(
  db: MockDb,
  room: Room,
  playerId: string,
  bundle: ScriptBundle,
): RoomState {
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

// ---------- 剧本库（纯查表，与存储无关）----------

export function listScripts(catalog: ScriptCatalog, params?: { genre?: string; keyword?: string }) {
  const keyword = params?.keyword?.trim().toLowerCase() ?? '';
  const items = [...catalog.values()]
    .map((bundle) => toSummary(bundle.script))
    .sort((left, right) => left.id.localeCompare(right.id))
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
}

export function readScriptDetail(catalog: ScriptCatalog, scriptId: string): ScriptDetail {
  const bundle = catalog.get(scriptId);
  if (!bundle) throw new ApiError('NOT_FOUND', '剧本不存在');
  // 数据没录完的剧本仍可看详情，只是没有角色可选
  return {
    ...toSummary(bundle.script),
    description: bundle.script.description,
    characters: bundle.characters.map(toPublicCharacter),
  };
}

// ---------- 房间操作（就地修改 db，调用方负责落盘）----------

export function createRoom(db: MockDb, catalog: ScriptCatalog, nickname: string, scriptId: string): RoomSession {
  const name = nickname.trim();
  if (!name) throw new ApiError('VALIDATION_ERROR', '昵称不能为空');

  const bundle = requireBundle(catalog, scriptId);
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
    nickname: name,
    characterId: null,
    isHost: true,
    isReady: false,
    joinedAt: createdAt,
  };
  room.hostPlayerId = player.id;

  db.rooms.push(room);
  db.players.push(player);
  return { room, player };
}

export function joinRoom(db: MockDb, catalog: ScriptCatalog, code: string, nickname: string): RoomSession {
  const name = nickname.trim();
  if (!name) throw new ApiError('VALIDATION_ERROR', '昵称不能为空');
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 6) throw new ApiError('VALIDATION_ERROR', '房间号是 6 位字符');

  const room = db.rooms.find((item) => item.code === normalized);
  if (!room) throw new ApiError('NOT_FOUND', '房间不存在，请核对房间号');
  if (room.status !== 'waiting') throw new ApiError('INVALID_STATE', '该房间已经开局，无法加入');

  const bundle = requireBundle(catalog, room.scriptId);
  if (playersOf(db, room).length >= bundle.script.playerCount) {
    throw new ApiError('ROOM_FULL', '房间人数已满');
  }

  const player: Player = {
    id: newId('player'),
    roomId: room.id,
    nickname: name,
    characterId: null,
    isHost: false,
    isReady: false,
    joinedAt: new Date().toISOString(),
  };
  db.players.push(player);
  return { room, player };
}

export function readRoomState(
  db: MockDb,
  catalog: ScriptCatalog,
  roomId: string,
  playerId: string,
): RoomState {
  const room = findRoom(db, roomId);
  const bundle = requireBundle(catalog, room.scriptId);
  return buildRoomState(db, room, playerId, bundle);
}

export function readRoomContext(
  db: MockDb,
  catalog: ScriptCatalog,
  roomId: string,
  playerId: string,
): RoomContext {
  const room = findRoom(db, roomId);
  const bundle = requireBundle(catalog, room.scriptId);
  const me = requirePlayer(db, room, playerId);

  return {
    acts: bundle.acts,
    characters: bundle.characters.map(toPublicCharacter),
    // 按「公开 + 自己私密」过滤，保持与真实模式同构（不因为是 Mock 就全给）
    clues: visibleCluesFor(bundle, me, Number.MAX_SAFE_INTEGER),
    murdererCharacterId: bundle.script.murdererCharacterId,
  };
}

export function selectCharacter(
  db: MockDb,
  catalog: ScriptCatalog,
  roomId: string,
  playerId: string,
  characterId: string,
): RoomState {
  const room = findRoom(db, roomId);
  const bundle = requireBundle(catalog, room.scriptId);
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
  return buildRoomState(db, room, playerId, bundle);
}

export function setReady(
  db: MockDb,
  catalog: ScriptCatalog,
  roomId: string,
  playerId: string,
  isReady: boolean,
): RoomState {
  const room = findRoom(db, roomId);
  const bundle = requireBundle(catalog, room.scriptId);
  const me = requirePlayer(db, room, playerId);

  if (room.status !== 'selecting') throw new ApiError('INVALID_STATE', '当前不是选角阶段');
  if (isReady && me.characterId === null) {
    throw new ApiError('VALIDATION_ERROR', '请先选择角色，再点准备');
  }

  me.isReady = isReady;
  maybeEnterPlaying(db, room);
  return buildRoomState(db, room, playerId, bundle);
}

export function startRoom(
  db: MockDb,
  catalog: ScriptCatalog,
  roomId: string,
  playerId: string,
): RoomState {
  const room = findRoom(db, roomId);
  const bundle = requireBundle(catalog, room.scriptId);
  const me = requirePlayer(db, room, playerId);

  if (room.hostPlayerId !== me.id) throw new ApiError('FORBIDDEN', '只有房主可以开始游戏');
  if (room.status !== 'waiting') throw new ApiError('INVALID_STATE', '游戏已经开始过了');
  if (playersOf(db, room).length < 2) {
    throw new ApiError('INVALID_STATE', '至少需要 2 名玩家才能开始');
  }

  room.status = 'selecting';
  return buildRoomState(db, room, playerId, bundle);
}

export function nextAct(
  db: MockDb,
  catalog: ScriptCatalog,
  roomId: string,
  playerId: string,
): RoomState {
  const room = findRoom(db, roomId);
  const bundle = requireBundle(catalog, room.scriptId);
  const me = requirePlayer(db, room, playerId);

  if (room.hostPlayerId !== me.id) throw new ApiError('FORBIDDEN', '只有房主可以推进剧情');
  if (room.status !== 'playing') throw new ApiError('INVALID_STATE', '当前不在剧情阶段');

  // 最后几幕由数据决定，不写死幕数
  const lastAct = bundle.acts.reduce((max, act) => Math.max(max, act.actNumber), 0);
  if (room.currentAct >= lastAct) {
    room.status = 'voting';
  } else {
    room.currentAct += 1;
  }

  return buildRoomState(db, room, playerId, bundle);
}

export function submitVote(
  db: MockDb,
  catalog: ScriptCatalog,
  roomId: string,
  voterPlayerId: string,
  targetPlayerId: string,
): RoomState {
  const room = findRoom(db, roomId);
  const bundle = requireBundle(catalog, room.scriptId);
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

  return buildRoomState(db, room, voterPlayerId, bundle);
}

export function finishRoom(
  db: MockDb,
  catalog: ScriptCatalog,
  roomId: string,
  playerId: string,
): RoomState {
  const room = findRoom(db, roomId);
  const bundle = requireBundle(catalog, room.scriptId);
  const me = requirePlayer(db, room, playerId);

  if (room.hostPlayerId !== me.id) throw new ApiError('FORBIDDEN', '只有房主可以强制结束');
  // game-flow §6 保守约定：演示推进不跳选角
  if (room.status === 'waiting' || room.status === 'selecting') {
    throw new ApiError('INVALID_STATE', '演示推进不能跳过选角阶段');
  }

  room.status = 'ended';
  return buildRoomState(db, room, playerId, bundle);
}

export function buildAIHint(db: MockDb, catalog: ScriptCatalog, roomId: string, playerId: string) {
  const room = findRoom(db, roomId);
  const bundle = requireBundle(catalog, room.scriptId);
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
}
