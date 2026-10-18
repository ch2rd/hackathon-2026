import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ScriptBundle } from '../src/types/models';
import { validateScriptBundle } from '../src/utils/scriptSchema';
import {
  buildAIHint,
  createRoom,
  emptyDb,
  finishRoom,
  joinRoom,
  listScripts,
  nextAct,
  readRoomContext,
  readRoomState,
  readScriptDetail,
  selectCharacter,
  setReady,
  startRoom,
  submitVote,
  toCatalog,
} from '../src/mocks/mockEngine';

const DIR = join(process.cwd(), 'data/scripts');

/**
 * 从 data/scripts 读全部剧本。
 * 校验不通过直接抛错 —— 数据坏了应该让测试红，而不是静默跳过。
 */
function loadBundles(): ScriptBundle[] {
  return readdirSync(DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((file) => {
      const parsed: unknown = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
      const result = validateScriptBundle(parsed, file.replace(/\.json$/, ''));
      if (!result.ok) throw new Error(`${file} 校验失败：${result.errors.join('；')}`);
      return result.bundle;
    });
}

/** 一个现场构造的剧本：用来证明「换一份数据照样能玩」，不落盘。 */
const SYNTHETIC_ID = 'script_synthetic';

function syntheticBundle(): ScriptBundle {
  const raw = {
    script: {
      id: SYNTHETIC_ID,
      title: '合成验证本',
      subtitle: '测试专用',
      coverUrl: '/covers/synthetic.svg',
      genre: '推理',
      playerCount: 3,
      durationMinutes: 30,
      difficulty: 1,
      summary: '用于验证通用性的剧本。',
      description: '在内存中构造，不写入 data/scripts。',
      tags: ['测试'],
      murdererCharacterId: 'char_syn_a',
      createdAt: '2026-10-18T00:00:00.000Z',
    },
    characters: ['a', 'b', 'c'].map((suffix, index) => ({
      id: `char_syn_${suffix}`,
      scriptId: SYNTHETIC_ID,
      name: `${suffix.toUpperCase()} 角色`,
      identity: '测试角色',
      age: 30 + index,
      avatarUrl: `/avatars/syn-${suffix}.svg`,
      publicIntro: `公开介绍 ${suffix.toUpperCase()}。`,
      secret: `${suffix.toUpperCase()} 的秘密。`,
      goals: ['测试目标'],
      sortOrder: index + 1,
    })),
    acts: [
      { id: 'act_syn_1', scriptId: SYNTHETIC_ID, actNumber: 1, title: '第一幕', narration: '旁白。' },
      { id: 'act_syn_2', scriptId: SYNTHETIC_ID, actNumber: 2, title: '第二幕', narration: '旁白。' },
    ],
    clues: [
      {
        id: 'clue_syn_public',
        scriptId: SYNTHETIC_ID,
        actNumber: 1,
        title: '公开线索',
        content: '所有人可见。',
        visibility: 'public',
        ownerCharacterId: null,
      },
      {
        id: 'clue_syn_private',
        scriptId: SYNTHETIC_ID,
        actNumber: 2,
        title: 'A 的私密线索',
        content: '只有 A 可见。',
        visibility: 'private',
        ownerCharacterId: 'char_syn_a',
      },
    ],
  };

  const result = validateScriptBundle(raw, SYNTHETIC_ID);
  if (!result.ok) throw new Error(`合成剧本不合法：${result.errors.join('；')}`);
  return result.bundle;
}

function expectApiError(run: () => unknown, code: string): void {
  try {
    run();
  } catch (error) {
    expect((error as { code?: string }).code).toBe(code);
    return;
  }
  throw new Error(`期望抛出 ${code}，但调用成功了`);
}

const bundles = loadBundles();
const catalog = toCatalog([...bundles, syntheticBundle()]);

const playable = bundles.filter(
  (bundle) => bundle.characters.length >= 3 && bundle.script.murdererCharacterId !== null,
);

describe('剧本数据', () => {
  it('data/scripts 下至少有一个剧本', () => {
    expect(bundles.length).toBeGreaterThan(0);
  });

  it('剧本库包含全部剧本（含新加的合成剧本）', () => {
    const library = listScripts(catalog);
    expect(library.total).toBe(bundles.length + 1);
    expect(library.items.some((item) => item.id === SYNTHETIC_ID)).toBe(true);
  });

  it('关键字段齐全，能直接渲染卡片', () => {
    for (const item of listScripts(catalog).items) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.summary.length).toBeGreaterThan(0);
      expect(item.playerCount).toBeGreaterThanOrEqual(2);
      expect(item.difficulty).toBeGreaterThanOrEqual(1);
      expect(item.difficulty).toBeLessThanOrEqual(5);
    }
  });

  it('支持按类型筛选与关键词搜索', () => {
    expect(listScripts(catalog, { genre: '推理' }).items.every((s) => s.genre === '推理')).toBe(true);
    expect(listScripts(catalog, { keyword: '合成验证' }).total).toBe(1);
    expect(listScripts(catalog, { keyword: '绝不可能匹配的关键词' }).total).toBe(0);
  });

  it('数据没录完的剧本能看详情，但不能开局', () => {
    const db = emptyDb();
    const drafts = bundles.filter((bundle) => bundle.characters.length === 0);
    for (const draft of drafts) {
      const detail = readScriptDetail(catalog, draft.script.id);
      expect(detail.characters).toHaveLength(0);
      expect(detail.description.length).toBeGreaterThan(0);
      expectApiError(() => createRoom(db, catalog, '甲', draft.script.id), 'INVALID_STATE');
    }
  });

  it('不存在的剧本返回 NOT_FOUND', () => {
    const db = emptyDb();
    expectApiError(() => createRoom(db, catalog, '甲', 'script_none'), 'NOT_FOUND');
  });
});

/**
 * 核心回归：任何一份剧本数据都能跑完整局。
 * 只要有人往 data/scripts 丢新剧本，这一组会自动覆盖到它。
 */
describe.each([
  ...playable.map((bundle) => [`data/scripts/${bundle.script.id}《${bundle.script.title}》`, bundle] as const),
  ['内存合成剧本', syntheticBundle()] as const,
])('%s 全流程', (_label, bundle) => {
  const murdererId = bundle.script.murdererCharacterId as string;

  it('从建房到结算整局可玩，且不泄露敏感信息', () => {
    const db = emptyDb();
    const others = bundle.characters.map((c) => c.id).filter((id) => id !== murdererId);
    const [y, z] = others;

    const host = createRoom(db, catalog, '甲', bundle.script.id);
    expect(host.room.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(host.player.isHost).toBe(true);

    // 单人房开不了局；开局前也不能选角
    expectApiError(() => startRoom(db, catalog, host.room.id, host.player.id), 'INVALID_STATE');
    expectApiError(
      () => selectCharacter(db, catalog, host.room.id, host.player.id, murdererId),
      'INVALID_STATE',
    );

    const p2 = joinRoom(db, catalog, host.room.code, '乙');
    const p3 = joinRoom(db, catalog, host.room.code, '丙');

    expectApiError(() => startRoom(db, catalog, host.room.id, p2.player.id), 'FORBIDDEN');
    expect(startRoom(db, catalog, host.room.id, host.player.id).room.status).toBe('selecting');

    // 没选角不能准备；开过局不能再开
    expectApiError(() => setReady(db, catalog, host.room.id, host.player.id, true), 'VALIDATION_ERROR');
    expectApiError(() => startRoom(db, catalog, host.room.id, host.player.id), 'INVALID_STATE');

    selectCharacter(db, catalog, host.room.id, host.player.id, murdererId);
    expectApiError(
      () => selectCharacter(db, catalog, host.room.id, p2.player.id, murdererId),
      'INVALID_STATE',
    );

    selectCharacter(db, catalog, host.room.id, p2.player.id, y);
    selectCharacter(db, catalog, host.room.id, p3.player.id, z);

    setReady(db, catalog, host.room.id, p2.player.id, true);
    expectApiError(() => selectCharacter(db, catalog, host.room.id, p2.player.id, z), 'INVALID_STATE');

    setReady(db, catalog, host.room.id, p3.player.id, true);
    const playing = setReady(db, catalog, host.room.id, host.player.id, true);
    expect(playing.room.status).toBe('playing');
    expect(playing.room.currentAct).toBe(1);

    // 幕数由数据决定，不写死；每幕都要全员确认后才能推进
    const lastAct = bundle.acts.reduce((max, act) => Math.max(max, act.actNumber), 0);
    const playerIds = [host.player.id, p2.player.id, p3.player.id];
    for (let act = 1; act < lastAct; act += 1) {
      for (const playerId of playerIds) {
        setReady(db, catalog, host.room.id, playerId, true);
      }
      nextAct(db, catalog, host.room.id, host.player.id);
    }
    expectApiError(() => nextAct(db, catalog, host.room.id, p2.player.id), 'FORBIDDEN');
    for (const playerId of playerIds) {
      setReady(db, catalog, host.room.id, playerId, true);
    }
    expect(nextAct(db, catalog, host.room.id, host.player.id).room.status).toBe('voting');

    // 揭晓前不泄露凶手
    expect(JSON.stringify(readRoomState(db, catalog, host.room.id, p2.player.id))).not.toContain(
      'murdererCharacterId',
    );

    expectApiError(
      () => submitVote(db, catalog, host.room.id, host.player.id, host.player.id),
      'VALIDATION_ERROR',
    );
    submitVote(db, catalog, host.room.id, host.player.id, p2.player.id);
    expectApiError(
      () => submitVote(db, catalog, host.room.id, host.player.id, p2.player.id),
      'INVALID_STATE',
    );
    submitVote(db, catalog, host.room.id, p2.player.id, host.player.id);
    expect(submitVote(db, catalog, host.room.id, p3.player.id, host.player.id).room.status).toBe('ended');

    const ended = readRoomState(db, catalog, host.room.id, host.player.id);
    expect(ended.result?.murdererCharacterId).toBe(murdererId);
    expect(ended.result?.isCorrect).toBe(true);

    // 越权：公开列表不带 secret，context 线索按人过滤
    const p2State = readRoomState(db, catalog, host.room.id, p2.player.id);
    expect(JSON.stringify(p2State.players)).not.toContain('secret');

    const context = readRoomContext(db, catalog, host.room.id, p2.player.id);
    expect(JSON.stringify(context.characters)).not.toContain('secret');
    expect(
      context.clues.every((clue) => clue.visibility === 'public' || clue.ownerCharacterId === y),
    ).toBe(true);

    // AI 不得点名凶手
    const hint = buildAIHint(db, catalog, host.room.id, host.player.id);
    expect(hint.source).toBe('mock');
    expect(JSON.stringify(hint)).not.toContain(murdererId);
    expect(hint.suspects.length).toBe(2);
  });

  it('演示推进不能跳过选角', () => {
    const db = emptyDb();
    const host = createRoom(db, catalog, '戊', bundle.script.id);
    const guest = joinRoom(db, catalog, host.room.code, '己');

    expectApiError(() => finishRoom(db, catalog, host.room.id, host.player.id), 'INVALID_STATE');

    startRoom(db, catalog, host.room.id, host.player.id);
    expectApiError(() => finishRoom(db, catalog, host.room.id, guest.player.id), 'FORBIDDEN');
  });
});
