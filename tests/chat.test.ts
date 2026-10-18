import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ScriptBundle } from '../src/types/models';
import { confirmStoryRead, finishRoom, readRoomContext, readScriptDetail, createRoom, emptyDb, joinRoom, nextAct, readRoomState, selectCharacter, sendMessage, setReady, startRoom, toCatalog } from '../src/mocks/mockEngine';

function setup(hasRead = true) {
  const bundle = JSON.parse(readFileSync('data/scripts/script_wuye.json', 'utf8')) as ScriptBundle;
  const catalog = toCatalog([bundle]);
  const db = emptyDb();
  const host = createRoom(db, catalog, '甲', bundle.script.id);
  const b = joinRoom(db, catalog, host.room.code, '乙');
  const c = joinRoom(db, catalog, host.room.code, '丙');
  startRoom(db, catalog, host.room.id, host.player.id);
  [host, b, c].forEach((session, index) => {
    selectCharacter(db, catalog, host.room.id, session.player.id, bundle.characters[index].id);
    setReady(db, catalog, host.room.id, session.player.id, true);
  });
  if (hasRead) for (const session of [host, b, c]) confirmStoryRead(db, catalog, host.room.id, session.player.id);
  const advance = () => nextAct(db, catalog, host.room.id, host.player.id);
  const send = (input: Parameters<typeof sendMessage>[4]) => sendMessage(db, catalog, host.room.id, host.player.id, input);
  return { bundle, db, catalog, host, b, c, advance, send };
}

describe('出场与搜证后讨论', () => {
  it('出场允许公聊介绍，禁止私聊；搜证后开启两种讨论', () => {
    const { send, b, advance } = setup();
    expect(send({ channel: 'public', content: '我是管家，大家怎么称呼？' }).messages).toHaveLength(1);
    expect(() => send({ channel: 'direct', receiverPlayerId: b.player.id, content: '私聊' })).toThrow();
    expect(advance().room.gameplayPhase).toBe('search');
    expect(() => send({ channel: 'public', content: '搜证中' })).toThrow();
    expect(advance().room.gameplayPhase).toBe('discussion');
    expect(send({ channel: 'direct', receiverPlayerId: b.player.id, content: '你看到了什么？' }).messages).toHaveLength(2);
  });

  it('私聊仅双方可见，公聊全员可见，序列化恢复仍正确过滤', () => {
    const { send, b, c, db, catalog, host, advance } = setup();
    advance(); advance();
    send({ channel: 'public', content: '公开讨论' });
    send({ channel: 'direct', receiverPlayerId: b.player.id, content: '只有甲乙知道' });
    const restored = JSON.parse(JSON.stringify(db)) as typeof db;
    expect(readRoomState(restored, catalog, host.room.id, b.player.id).messages).toHaveLength(2);
    const third = readRoomState(restored, catalog, host.room.id, c.player.id);
    expect(third.messages).toHaveLength(1);
    expect(JSON.stringify(third)).not.toContain('只有甲乙知道');
  });

  it('禁止自聊、跨房私聊、空白超长消息和未解锁线索；线索原文由引擎读取', () => {
    const { send, host, advance, db, catalog, bundle } = setup();
    advance(); advance();
    const outsider = createRoom(db, catalog, '外人', bundle.script.id);
    for (const receiverPlayerId of [host.player.id, outsider.player.id]) {
      expect(() => send({ channel: 'direct', receiverPlayerId, content: '越权' })).toThrow();
    }
    for (const content of ['   ', '字'.repeat(1001)]) expect(() => send({ channel: 'public', content })).toThrow();
    const state = readRoomState(db, catalog, host.room.id, host.player.id);
    const hidden = bundle.clues.find((clue) => !state.me.visibleClues.some((visible) => visible.id === clue.id));
    expect(hidden).toBeDefined();
    expect(() => send({ channel: 'public', content: '', clueId: hidden!.id })).toThrow();
    const clue = state.me.visibleClues[0];
    const result = send({ channel: 'public', content: '伪造内容', clueId: clue.id });
    expect(result.messages.at(-1)?.content).toBe(clue.content);
  });

  it('旧存档没有消息和环节也可以恢复，并且非房主不能推进', () => {
    const { db, catalog, host, b } = setup();
    delete db.messages;
    delete host.room.gameplayPhase;
    expect(readRoomState(db, catalog, host.room.id, b.player.id).messages).toEqual([]);
    expect(() => nextAct(db, catalog, host.room.id, b.player.id)).toThrow();
    expect(nextAct(db, catalog, host.room.id, host.player.id).room.gameplayPhase).toBe('discussion');
  });
});

describe('个人故事在公聊之前', () => {
  it('必须全员确认已读；房主不能跳过阅读；重复确认不增加人数', () => {
    const { db, catalog, host, b, c, advance, send } = setup(false);
    const confirm = (id: string) => confirmStoryRead(db, catalog, host.room.id, id);
    expect(host.room.gameplayPhase).toBe('reading');
    expect(() => advance()).toThrow();
    expect(() => send({ channel: 'public', content: '提前介绍' })).toThrow();
    expect(() => finishRoom(db, catalog, host.room.id, host.player.id)).toThrow();
    expect(() => confirm('outside-player')).toThrow();
    confirm(host.player.id); confirm(host.player.id);
    expect(host.room.storyReadPlayerIds).toHaveLength(1);
    confirm(b.player.id);
    const restored = JSON.parse(JSON.stringify(db)) as typeof db;
    expect(readRoomState(restored, catalog, host.room.id, c.player.id).room.gameplayPhase).toBe('reading');
    expect(confirm(c.player.id).room.gameplayPhase).toBe('introduction');
    expect(confirm(c.player.id).room.gameplayPhase).toBe('introduction');
    expect(send({ channel: 'public', content: '读完故事再介绍' }).messages).toHaveLength(1);
  });

  it('个人背景只随自己的角色返回，公开人物和其他玩家状态不含故事', () => {
    const { db, catalog, bundle, host, b } = setup(false);
    const mine = readRoomState(db, catalog, host.room.id, host.player.id);
    const other = readRoomState(db, catalog, host.room.id, b.player.id);
    const story = mine.me.character?.backgroundStory;
    expect(story?.length).toBeGreaterThan(100);
    expect(JSON.stringify(other)).not.toContain(story);
    expect(JSON.stringify(readScriptDetail(catalog, bundle.script.id))).not.toContain('backgroundStory');
    expect(JSON.stringify(readRoomContext(db, catalog, host.room.id, b.player.id).characters)).not.toContain('backgroundStory');
  });
});
