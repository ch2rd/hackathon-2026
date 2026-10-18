// @vitest-environment node
/**
 * 真实后端端到端测试（C 维护）。
 *
 * 环境钉死为 node：B 的 vitest.config.ts 把 `environment` 全局设成 jsdom，
 * 而本用例要真起 HTTP 服务、调 fetch、写临时文件，不该跑在 jsdom 里。
 * 这条指令只影响本文件，不动 B 的配置。
 *
 * 从 `scripts/smoke-api.ts` 升级而来：那个脚本要先手动起服务，进不了 CI；
 * 这里在进程内用随机端口起一份真实 Express（同一个 createApp 工厂），
 * 于是「剧本秘密不外泄」「错误码契约」「完整一局」每次提交都会被验证。
 *
 * 两个刻意的隔离：
 * - `STORE_FILE` 指向临时目录，不会污染开发时的 `.data/rooms.json`；
 * - `OPENAI_API_KEY` 置空，强制走 Mock 分支，CI 无网络也能过。
 */

import { mkdtemp, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface Json {
  [key: string]: unknown;
}

interface Reply {
  status: number;
  body: Json | null;
}

let server: Server | undefined;
let base = '';
let tempDir = '';

async function call(path: string, init?: RequestInit): Promise<Reply> {
  const response = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  let body: Json | null = null;
  try {
    body = (await response.json()) as Json;
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

function post(path: string, payload: unknown): Promise<Reply> {
  return call(path, { method: 'POST', body: JSON.stringify(payload) });
}

function data(reply: Reply): Json {
  return (reply.body?.data ?? {}) as Json;
}

function errorCode(reply: Reply): unknown {
  return ((reply.body?.error ?? {}) as Json).code;
}

function asArray(value: unknown): Json[] {
  return Array.isArray(value) ? (value as Json[]) : [];
}

function asObject(value: unknown): Json {
  return (value ?? {}) as Json;
}

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'zhenxiangju-e2e-'));
  process.env.STORE_FILE = join(tempDir, 'rooms.json');
  process.env.OPENAI_API_KEY = '';

  const { createApp } = await import('../src/server/index');
  const app = createApp();

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('未能取得监听端口');
  }
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (server !== undefined) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }
  if (tempDir !== '') {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe('健康检查', () => {
  it('GET /api/health 返回 { data: { ok: true } }', async () => {
    const reply = await call('/api/health');
    expect(reply.status).toBe(200);
    expect(data(reply).ok).toBe(true);
  });
});

describe('安全红线：剧本数据不得外泄', () => {
  let summaries: Json[] = [];

  it('剧本列表可用且不含凶手字段', async () => {
    const reply = await call('/api/scripts');
    expect(reply.status).toBe(200);
    summaries = asArray(data(reply));
    expect(summaries.length).toBeGreaterThan(0);
    expect(JSON.stringify(reply.body)).not.toContain('murdererCharacterId');
    expect(JSON.stringify(reply.body)).not.toContain('"secret"');
  });

  it('每本剧本详情都不含凶手与角色秘密', async () => {
    for (const summary of summaries) {
      const id = String(summary.id ?? '');
      const reply = await call(`/api/scripts/${encodeURIComponent(id)}`);
      expect(reply.status).toBe(200);

      const raw = JSON.stringify(reply.body);
      expect(raw).not.toContain('murdererCharacterId');
      expect(raw).not.toContain('"secret"');

      const characters = asArray(data(reply).characters);
      const declared = Number(summary.playerCount ?? 0);
      // 允许「即将开放」的剧本没有角色数据，有数据则必须与声明人数一致
      expect(characters.length === declared || characters.length === 0).toBe(true);
    }
  });
});

describe('错误码契约', () => {
  it('不存在的剧本 → 404 NOT_FOUND', async () => {
    const reply = await post('/api/rooms', { scriptId: 'script_does_not_exist', nickname: '甲' });
    expect(reply.status).toBe(404);
    expect(errorCode(reply)).toBe('NOT_FOUND');
  });

  it('缺昵称 → 400 VALIDATION_ERROR', async () => {
    const reply = await post('/api/rooms', { scriptId: 'script_wuye' });
    expect(reply.status).toBe(400);
    expect(errorCode(reply)).toBe('VALIDATION_ERROR');
  });

  it('未知路由 → 404', async () => {
    const reply = await call('/api/definitely-not-exist');
    expect(reply.status).toBe(404);
  });
});

describe('完整一局（真实 HTTP，不假设哪本是凶手）', () => {
  // 跨 it 共享的一局状态；vitest 同一文件内按声明顺序串行执行
  const flow: {
    scriptId: string;
    characterIds: string[];
    code: string;
    roomId: string;
    hostId: string;
    guestId: string;
    thirdId: string;
    murdererId: string;
  } = {
    scriptId: '',
    characterIds: [],
    code: '',
    roomId: '',
    hostId: '',
    guestId: '',
    thirdId: '',
    murdererId: '',
  };

  it('挑一本角色数 ≥ 3 的可玩剧本', async () => {
    const list = await call('/api/scripts');
    const summaries = asArray(data(list));

    for (const summary of summaries) {
      const id = String(summary.id ?? '');
      const detail = await call(`/api/scripts/${encodeURIComponent(id)}`);
      const characters = asArray(data(detail).characters);
      if (characters.length >= 3) {
        flow.scriptId = id;
        flow.characterIds = characters.slice(0, 3).map((character) => String(character.id));
        break;
      }
    }

    expect(flow.scriptId).not.toBe('');
    expect(flow.characterIds.length).toBe(3);
  });

  it('建房：201、6 位房间号、创建者是房主', async () => {
    const reply = await post('/api/rooms', { scriptId: flow.scriptId, nickname: '甲' });
    expect(reply.status).toBe(201);

    const room = asObject(data(reply).room);
    const player = asObject(data(reply).player);

    flow.roomId = String(room.id ?? '');
    flow.code = String(room.code ?? '');
    flow.hostId = String(player.id ?? '');

    expect(flow.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(player.isHost).toBe(true);
  });

  it('两人用房间号加入；错误房间号 → 404', async () => {
    const guest = await post('/api/rooms/join', { code: flow.code, nickname: '乙' });
    const third = await post('/api/rooms/join', { code: flow.code, nickname: '丙' });
    expect(guest.status).toBe(200);
    expect(third.status).toBe(200);

    flow.guestId = String(asObject(data(guest).player).id ?? '');
    flow.thirdId = String(asObject(data(third).player).id ?? '');

    const bad = await post('/api/rooms/join', { code: 'ZZZZZZ', nickname: '丁' });
    expect(bad.status).toBe(404);
    expect(errorCode(bad)).toBe('NOT_FOUND');
  });

  it('非房主开局 → 403 FORBIDDEN；房主开局 → selecting', async () => {
    const guestStart = await post(`/api/rooms/${flow.roomId}/start`, { playerId: flow.guestId });
    expect(guestStart.status).toBe(403);
    expect(errorCode(guestStart)).toBe('FORBIDDEN');

    const started = await post(`/api/rooms/${flow.roomId}/start`, { playerId: flow.hostId });
    expect(asObject(data(started).room).status).toBe('selecting');
  });

  it('选角：抢已被选的角色 → 409 INVALID_STATE', async () => {
    const picked = await post(`/api/rooms/${flow.roomId}/select-character`, {
      playerId: flow.hostId,
      characterId: flow.characterIds[0],
    });
    expect(asObject(asObject(data(picked).me).character).id).toBe(flow.characterIds[0]);

    const stolen = await post(`/api/rooms/${flow.roomId}/select-character`, {
      playerId: flow.guestId,
      characterId: flow.characterIds[0],
    });
    expect(stolen.status).toBe(409);
    expect(errorCode(stolen)).toBe('INVALID_STATE');
  });

  it('全员选角并准备后自动开局，停在第 1 幕', async () => {
    await post(`/api/rooms/${flow.roomId}/select-character`, {
      playerId: flow.guestId,
      characterId: flow.characterIds[1],
    });
    await post(`/api/rooms/${flow.roomId}/select-character`, {
      playerId: flow.thirdId,
      characterId: flow.characterIds[2],
    });

    await post(`/api/rooms/${flow.roomId}/ready`, { playerId: flow.guestId, isReady: true });
    await post(`/api/rooms/${flow.roomId}/ready`, { playerId: flow.thirdId, isReady: true });
    const allReady = await post(`/api/rooms/${flow.roomId}/ready`, {
      playerId: flow.hostId,
      isReady: true,
    });

    const room = asObject(data(allReady).room);
    expect(room.status).toBe('playing');
    expect(room.currentAct).toBe(1);
    expect(asArray(data(allReady).players).every((player) => player.isReady === false)).toBe(true);
  });

  it('个人故事阅读：进度持久化，全员确认后才进入介绍', async () => {
    const path = `/api/rooms/${flow.roomId}`;
    const before = await call(`${path}/state?playerId=${flow.hostId}`);
    expect(asObject(data(before).room).gameplayPhase).toBe('reading');
    const myCharacter = asObject(asObject(data(before).me).character);
    expect(String(myCharacter.backgroundStory).length).toBeGreaterThan(100);
    const third = await call(`${path}/state?playerId=${flow.thirdId}`);
    expect(JSON.stringify(third.body)).not.toContain(myCharacter.backgroundStory);
    expect(errorCode(await post(`${path}/next-act`, { playerId: flow.hostId }))).toBe('INVALID_STATE');
    expect(errorCode(await post(`${path}/ready`, { playerId: flow.hostId, isReady: true }))).toBe('INVALID_STATE');
    expect(errorCode(await post(`${path}/messages`, { playerId: flow.hostId, channel: 'public', content: '还不能介绍' }))).toBe('INVALID_STATE');
    await post(`${path}/confirm-story-read`, { playerId: flow.hostId });
    const duplicate = await post(`${path}/confirm-story-read`, { playerId: flow.hostId });
    expect(asArray(data(duplicate).room && asObject(data(duplicate).room).storyReadPlayerIds)).toHaveLength(1);
    await post(`${path}/confirm-story-read`, { playerId: flow.guestId });
    const final = await post(`${path}/confirm-story-read`, { playerId: flow.thirdId });
    expect(asObject(data(final).room).gameplayPhase).toBe('introduction');
    expect((await post(`${path}/confirm-story-read`, { playerId: flow.thirdId })).status).toBe(200);
  });

  it('聊天接口：出场公聊、搜证禁言、讨论私聊仅双方可见', async () => {
    const path = `/api/rooms/${flow.roomId}`;
    const intro = await post(`${path}/messages`, { playerId: flow.hostId, channel: 'public', content: '大家好，我来介绍自己。' });
    expect(intro.status).toBe(200);
    const introDirect = await post(`${path}/messages`, { playerId: flow.hostId, channel: 'direct', receiverPlayerId: flow.guestId, content: '密谈' });
    expect(errorCode(introDirect)).toBe('INVALID_STATE');
    const search = await post(`${path}/next-act`, { playerId: flow.hostId });
    expect(asObject(data(search).room).gameplayPhase).toBe('search');
    const blocked = await post(`${path}/messages`, { playerId: flow.hostId, channel: 'public', content: '正在搜证' });
    expect(errorCode(blocked)).toBe('INVALID_STATE');
    const discussion = await post(`${path}/next-act`, { playerId: flow.hostId });
    expect(asObject(data(discussion).room).gameplayPhase).toBe('discussion');
    expect(asArray(data(discussion).players).every((player) => player.isReady === false)).toBe(true);
    const direct = await post(`${path}/messages`, { playerId: flow.hostId, channel: 'direct', receiverPlayerId: flow.guestId, content: '仅双方可见的证词' });
    expect(direct.status).toBe(200);
    const recipient = await call(`${path}/state?playerId=${flow.guestId}`);
    const third = await call(`${path}/state?playerId=${flow.thirdId}`);
    expect(asArray(data(recipient).messages).some((message) => message.content === '仅双方可见的证词')).toBe(true);
    expect(JSON.stringify(third.body)).not.toContain('仅双方可见的证词');
    const malformed = await post(`${path}/messages`, { playerId: flow.hostId, channel: 'wrong', content: '无效' });
    expect(malformed.status).toBe(400);
  });

  it('推进到投票，且揭晓前不下发凶手', async () => {
    const playerIds = [flow.hostId, flow.guestId, flow.thirdId];
    const confirmCurrentAct = async () => {
      for (const playerId of playerIds) {
        await post(`/api/rooms/${flow.roomId}/ready`, { playerId, isReady: true });
      }
    };

    // 第 1 幕：全员确认讨论完成后，房主推进
    const premature = await post(`/api/rooms/${flow.roomId}/next-act`, { playerId: flow.hostId });
    expect(errorCode(premature)).toBe('INVALID_STATE');
    await confirmCurrentAct();
    let current = await post(`/api/rooms/${flow.roomId}/next-act`, { playerId: flow.hostId });
    let guard = 0;

    while (asObject(data(current).room).status === 'playing' && guard < 50) {
      if (asObject(data(current).room).gameplayPhase === 'discussion') {
        const blocked = await post(`/api/rooms/${flow.roomId}/next-act`, { playerId: flow.hostId });
        expect(errorCode(blocked)).toBe('INVALID_STATE');
        await confirmCurrentAct();
      }
      current = await post(`/api/rooms/${flow.roomId}/next-act`, { playerId: flow.hostId });
      expect(current.status).toBe(200);
      guard += 1;
    }

    expect(guard).toBeLessThan(50);
    expect(asObject(data(current).room).status).toBe('voting');
    expect(asArray(data(current).players).every((player) => player.isReady === false)).toBe(true);
    expect(JSON.stringify(current.body)).not.toContain('murdererCharacterId');
  });

  it('投票：重复 → 409，投自己 → 400', async () => {
    const first = await post(`/api/rooms/${flow.roomId}/votes`, {
      voterPlayerId: flow.hostId,
      targetPlayerId: flow.guestId,
    });
    expect(first.status).toBe(200);

    const duplicate = await post(`/api/rooms/${flow.roomId}/votes`, {
      voterPlayerId: flow.hostId,
      targetPlayerId: flow.thirdId,
    });
    expect(duplicate.status).toBe(409);
    expect(errorCode(duplicate)).toBe('INVALID_STATE');

    const selfVote = await post(`/api/rooms/${flow.roomId}/votes`, {
      voterPlayerId: flow.guestId,
      targetPlayerId: flow.guestId,
    });
    expect(selfVote.status).toBe(400);
    expect(errorCode(selfVote)).toBe('VALIDATION_ERROR');
  });

  it('全员投完 → ended，且 isCorrect 与最高票一致', async () => {
    await post(`/api/rooms/${flow.roomId}/votes`, {
      voterPlayerId: flow.guestId,
      targetPlayerId: flow.hostId,
    });
    const ended = await post(`/api/rooms/${flow.roomId}/votes`, {
      voterPlayerId: flow.thirdId,
      targetPlayerId: flow.hostId,
    });

    expect(asObject(data(ended).room).status).toBe('ended');

    const result = asObject(data(ended).result);
    flow.murdererId = String(result.murdererCharacterId ?? '');

    expect(flow.murdererId).not.toBe('');
    expect(result.isCorrect).toBe(result.topVotedCharacterId === result.murdererCharacterId);
  });

  it('房间上下文：真实模式凶手恒为 null，线索只含公开或本人私密', async () => {
    const reply = await call(`/api/rooms/${flow.roomId}/context?playerId=${flow.guestId}`);
    expect(reply.status).toBe(200);

    const context = data(reply);
    expect(context.murdererCharacterId).toBeNull();
    expect(JSON.stringify(reply.body)).not.toContain('"secret"');

    const ownCharacterId = flow.characterIds[1];
    for (const clue of asArray(context.clues)) {
      const visible = clue.visibility === 'public' || clue.ownerCharacterId === ownCharacterId;
      expect(visible).toBe(true);
    }
  });

  it('AI 无 Key 时降级为 mock，且不泄露凶手', async () => {
    const reply = await post('/api/ai/hint', { roomId: flow.roomId, playerId: flow.hostId });
    expect(reply.status).toBe(200);

    const hint = data(reply);
    expect(hint.source).toBe('mock');
    expect(Array.isArray(hint.suspects)).toBe(true);
    expect(JSON.stringify(reply.body)).not.toContain(flow.murdererId);
  });

  it('首页 AI DM 问答：无 Key 降级 mock，空问题 400', async () => {
    const reply = await post('/api/ai/chat', { question: '怎么推理更高效？' });
    expect(reply.status).toBe(200);
    expect(data(reply).source).toBe('mock');
    expect(typeof data(reply).answer).toBe('string');

    const bad = await post('/api/ai/chat', { question: '   ' });
    expect(bad.status).toBe(400);
    expect(errorCode(bad)).toBe('VALIDATION_ERROR');
  });

  it('不存在的房间 → 404', async () => {
    const reply = await call(`/api/rooms/room_does_not_exist/state?playerId=${flow.hostId}`);
    expect(reply.status).toBe(404);
    expect(errorCode(reply)).toBe('NOT_FOUND');
  });
});
