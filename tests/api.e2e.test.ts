/**
 * 真实后端端到端测试（C 维护）。
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
  });

  it('推进到投票，且揭晓前不下发凶手', async () => {
    let current = await post(`/api/rooms/${flow.roomId}/next-act`, { playerId: flow.hostId });
    let guard = 0;

    while (asObject(data(current).room).status === 'playing' && guard < 50) {
      current = await post(`/api/rooms/${flow.roomId}/next-act`, { playerId: flow.hostId });
      guard += 1;
    }

    expect(guard).toBeLessThan(50);
    expect(asObject(data(current).room).status).toBe('voting');
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

  it('不存在的房间 → 404', async () => {
    const reply = await call(`/api/rooms/room_does_not_exist/state?playerId=${flow.hostId}`);
    expect(reply.status).toBe(404);
    expect(errorCode(reply)).toBe('NOT_FOUND');
  });
});
