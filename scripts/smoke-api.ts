/**
 * 真实后端端到端冒烟（C 维护）。
 *
 * 为什么要有它：AGENTS.md §9.4 合并检查清单里写着
 * 「`VITE_USE_MOCK=false` 主流程通过（至少 C 验证）」——
 * 口头保证不算数，跑过这条命令才算。
 *
 * 用法：
 *   1) 另开一个终端起后端：npm run dev:api
 *   2) npm run smoke:api
 *
 * 换地址（默认 http://localhost:3001）：
 *   PowerShell: $env:SMOKE_BASE='http://localhost:3001'; npm run smoke:api
 *
 * 本脚本对剧本零假设：从 `/api/scripts` 里挑第一本「角色数 ≥ 3」的本来跑，
 * 所以新增剧本后不用改这里。
 */

const BASE = (process.env.SMOKE_BASE ?? 'http://localhost:3001').replace(/\/+$/, '');

interface Json {
  [key: string]: unknown;
}

interface Reply {
  status: number;
  body: Json | null;
}

const fails: string[] = [];

function check(name: string, ok: boolean, detail?: unknown): void {
  if (ok) return;
  fails.push(detail === undefined ? name : `${name} → ${JSON.stringify(detail)}`);
}

async function call(path: string, init?: RequestInit): Promise<Reply> {
  const response = await fetch(`${BASE}${path}`, {
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

/** @returns 后端是否在线 */
async function waitForServer(): Promise<boolean> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return true;
    } catch {
      // 还没起来
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  return false;
}

async function main(): Promise<void> {
  if (!(await waitForServer())) {
    console.error(`连不上 ${BASE}/api/health`);
    console.error('先把后端起起来：npm run dev:api');
    process.exitCode = 1;
    return;
  }

  console.log(`目标：${BASE}\n`);

  // ---------- 1) 健康检查 ----------
  const health = await call('/api/health');
  check('健康检查返回 { data: { ok: true } }', health.status === 200 && data(health).ok === true);

  // ---------- 2) 剧本库：不得泄露凶手与秘密 ----------
  const list = await call('/api/scripts');
  const summaries = data(list);
  const scripts = Array.isArray(summaries) ? (summaries as Json[]) : [];
  check('剧本列表 200 且有内容', list.status === 200 && scripts.length > 0, list.status);
  check('剧本列表不含 murdererCharacterId', !JSON.stringify(list.body).includes('murdererCharacterId'));
  check('剧本列表不含 secret', !JSON.stringify(list.body).includes('"secret"'));

  // ---------- 3) 每一本详情都不得泄露，并挑一本能玩的 ----------
  let chosen: Json | null = null;
  for (const summary of scripts) {
    const id = String(summary.id ?? '');
    const detail = await call(`/api/scripts/${encodeURIComponent(id)}`);
    const payload = data(detail);
    const characters = (payload.characters ?? []) as Json[];

    check(`《${String(summary.title)}》详情可读`, detail.status === 200, detail.status);
    check(`《${String(summary.title)}》详情不含 secret`, !JSON.stringify(detail.body).includes('"secret"'));
    check(
      `《${String(summary.title)}》详情不含 murdererCharacterId`,
      !JSON.stringify(detail.body).includes('murdererCharacterId'),
    );
    check(`《${String(summary.title)}》角色数等于声明人数`, characters.length === summary.playerCount || characters.length === 0, {
      characters: characters.length,
      playerCount: summary.playerCount,
    });

    if (chosen === null && characters.length >= 3) chosen = payload;
  }

  check('存在一本角色数 ≥ 3 的可玩剧本', chosen !== null);
  if (chosen === null) {
    report();
    return;
  }

  const scriptTitle = String(chosen.title);
  const scriptId = String(chosen.id);
  const characters = (chosen.characters ?? []) as Json[];
  const [c1, c2, c3] = characters.map((character) => String(character.id));
  console.log(`用《${scriptTitle}》跑完整一局（角色 ${characters.length} 人）\n`);

  // ---------- 4) 错误分支 ----------
  const ghostScript = await post('/api/rooms', { scriptId: 'script_does_not_exist', nickname: '甲' });
  check(
    '不存在的剧本 → 404 NOT_FOUND',
    ghostScript.status === 404 && errorCode(ghostScript) === 'NOT_FOUND',
    errorCode(ghostScript),
  );

  const missingField = await post('/api/rooms', { scriptId });
  check(
    '缺昵称 → 400 VALIDATION_ERROR',
    missingField.status === 400 && errorCode(missingField) === 'VALIDATION_ERROR',
    errorCode(missingField),
  );

  const unknownRoute = await call('/api/definitely-not-exist');
  check('未知接口 → 404', unknownRoute.status === 404, unknownRoute.status);

  // ---------- 5) 建房与加入 ----------
  const host = await post('/api/rooms', { scriptId, nickname: '甲' });
  const room = data(host).room as Json;
  const hostPlayer = data(host).player as Json;
  check('建房 201', host.status === 201, host.status);
  check('房间号 6 位且不含易混字符', /^[A-HJ-NP-Z2-9]{6}$/.test(String(room?.code)), room?.code);
  check('创建者是房主', hostPlayer?.isHost === true);

  const code = String(room?.code);
  const roomId = String(room?.id);
  const hostId = String(hostPlayer?.id);

  const p2 = await post('/api/rooms/join', { code, nickname: '乙' });
  const p3 = await post('/api/rooms/join', { code, nickname: '丙' });
  check('两人成功加入', p2.status === 200 && p3.status === 200);
  const p2Id = String((data(p2).player as Json)?.id);
  const p3Id = String((data(p3).player as Json)?.id);

  const badCode = await post('/api/rooms/join', { code: 'ZZZZZZ', nickname: '丁' });
  check('错误房间号 → 404', badCode.status === 404 && errorCode(badCode) === 'NOT_FOUND');

  // ---------- 6) 开局前的状态与权限 ----------
  const initial = await call(`/api/rooms/${roomId}/state?playerId=${hostId}`);
  check('建房后状态为 waiting', (data(initial).room as Json)?.status === 'waiting');
  check('waiting 状态不含凶手字段', !JSON.stringify(initial.body).includes('murdererCharacterId'));

  const guestStart = await post(`/api/rooms/${roomId}/start`, { playerId: p2Id });
  check(
    '非房主开局 → 403 FORBIDDEN',
    guestStart.status === 403 && errorCode(guestStart) === 'FORBIDDEN',
    errorCode(guestStart),
  );

  const started = await post(`/api/rooms/${roomId}/start`, { playerId: hostId });
  check('房主开局 → selecting', (data(started).room as Json)?.status === 'selecting');

  // ---------- 7) 选角（规则由数据决定，不假设哪个是凶手）----------
  const picked = await post(`/api/rooms/${roomId}/select-character`, {
    playerId: hostId,
    characterId: c1,
  });
  check('选角成功', ((data(picked).me as Json)?.character as Json)?.id === c1);

  const stolen = await post(`/api/rooms/${roomId}/select-character`, {
    playerId: p2Id,
    characterId: c1,
  });
  check(
    '抢已被选角色 → 409 INVALID_STATE',
    stolen.status === 409 && errorCode(stolen) === 'INVALID_STATE',
    errorCode(stolen),
  );

  await post(`/api/rooms/${roomId}/select-character`, { playerId: p2Id, characterId: c2 });
  await post(`/api/rooms/${roomId}/select-character`, { playerId: p3Id, characterId: c3 });

  const readyTooEarly = await post(`/api/rooms/${roomId}/ready`, { playerId: p2Id, isReady: true });
  check('准备成功', readyTooEarly.status === 200);
  await post(`/api/rooms/${roomId}/ready`, { playerId: p3Id, isReady: true });
  const allReady = await post(`/api/rooms/${roomId}/ready`, { playerId: hostId, isReady: true });
  check(
    '全员准备后自动开局，并停在第 1 幕',
    (data(allReady).room as Json)?.status === 'playing' && (data(allReady).room as Json)?.currentAct === 1,
    data(allReady).room,
  );

  // ---------- 8) 一路推进到投票（幕数由剧本数据决定，这里只看状态）----------
  let current = allReady;
  let guard = 0;
  while ((data(current).room as Json)?.status === 'playing' && guard < 50) {
    current = await post(`/api/rooms/${roomId}/next-act`, { playerId: hostId });
    guard += 1;
  }
  check('推进若干幕后进入 voting', (data(current).room as Json)?.status === 'voting', data(current).room);
  check('推进过程没有死循环', guard < 50, guard);
  check('揭晓前不下发凶手', !JSON.stringify(current.body).includes('murdererCharacterId'));

  // ---------- 9) 投票与结算 ----------
  const firstVote = await post(`/api/rooms/${roomId}/votes`, {
    voterPlayerId: hostId,
    targetPlayerId: p2Id,
  });
  check('第一票成功', firstVote.status === 200, firstVote.status);

  const duplicate = await post(`/api/rooms/${roomId}/votes`, {
    voterPlayerId: hostId,
    targetPlayerId: p3Id,
  });
  check(
    '重复投票 → 409 INVALID_STATE',
    duplicate.status === 409 && errorCode(duplicate) === 'INVALID_STATE',
    errorCode(duplicate),
  );

  const selfVote = await post(`/api/rooms/${roomId}/votes`, {
    voterPlayerId: p2Id,
    targetPlayerId: p2Id,
  });
  check(
    '投自己 → 400 VALIDATION_ERROR',
    selfVote.status === 400 && errorCode(selfVote) === 'VALIDATION_ERROR',
    errorCode(selfVote),
  );

  await post(`/api/rooms/${roomId}/votes`, { voterPlayerId: p2Id, targetPlayerId: hostId });
  const endedReply = await post(`/api/rooms/${roomId}/votes`, {
    voterPlayerId: p3Id,
    targetPlayerId: hostId,
  });

  const room2 = data(endedReply).room as Json;
  check('全员投完 → ended', room2?.status === 'ended', room2);
  const result = data(endedReply).result as Json;
  const murdererId = String(result?.murdererCharacterId ?? '');
  check('结局揭晓了凶手', murdererId.length > 0, result);
  check(
    '命中判定自洽（isCorrect 与最高票一致）',
    result?.isCorrect === (result?.topVotedCharacterId === result?.murdererCharacterId),
    result,
  );

  // ---------- 10) 房间上下文：真实模式安全红线 ----------
  const context = await call(`/api/rooms/${roomId}/context?playerId=${p2Id}`);
  const contextData = data(context);
  check('context 200', context.status === 200, context.status);
  check('context 真实模式凶手恒为 null', contextData.murdererCharacterId === null, contextData.murdererCharacterId);
  check('context 不含 secret', !JSON.stringify(context.body).includes('"secret"'));
  const contextClues = (contextData.clues ?? []) as Json[];
  check(
    'context 线索只含公开或本人私密',
    contextClues.every(
      (clue) => clue.visibility === 'public' || clue.ownerCharacterId === c2,
    ),
  );

  // ---------- 11) AI 推理：可降级，且绝不点名凶手 ----------
  const hint = await post('/api/ai/hint', { roomId, playerId: hostId });
  const hintData = data(hint);
  check('AI hint 200', hint.status === 200, hint.status);
  check('AI 来源是 llm 或 mock', hintData.source === 'llm' || hintData.source === 'mock', hintData.source);
  check('AI 有嫌疑列表', Array.isArray(hintData.suspects), hintData.suspects);
  check('AI 不泄露凶手 id', !JSON.stringify(hint.body).includes(murdererId));

  // ---------- 12) 未知房间 ----------
  const ghostRoom = await call(`/api/rooms/room_does_not_exist/state?playerId=${hostId}`);
  check(
    '不存在的房间 → 404',
    ghostRoom.status === 404 && errorCode(ghostRoom) === 'NOT_FOUND',
    errorCode(ghostRoom),
  );

  console.log(`（剧本 ${scriptId}，共推进 ${guard} 次到投票）`);
  report();
}

function report(): void {
  console.log('');
  if (fails.length === 0) {
    console.log('通过：真实后端端到端主流程全部成立');
    return;
  }
  console.log(`失败 ${fails.length} 项：`);
  for (const failure of fails) console.log(`  - ${failure}`);
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error('冒烟脚本自身出错：', error);
  process.exitCode = 1;
});
