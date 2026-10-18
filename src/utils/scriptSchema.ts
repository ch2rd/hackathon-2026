/**
 * 剧本数据校验器（C 维护）—— 前后端**共用同一套规则**。
 *
 * 用途：
 * - 浏览器侧：`src/mocks/scriptCatalog.ts` 加载 data/scripts/*.json 时立即校验；
 * - 命令行：`npm run check:scripts`（scripts/check-scripts.ts）在提交前拦错数据；
 * - 以后后端 seed 时也复用同一份逻辑，避免「前端能跑、后端炸」。
 *
 * 设计约束：本文件**没有任何运行时 import**（只 import type），
 * 这样 Node 可以直接用 `--experimental-strip-types` 跑它，不需要构建步骤。
 */

import type { Difficulty, Genre, ScriptBundle } from '../types/models';

export type BundleValidation =
  | { ok: true; bundle: ScriptBundle }
  | { ok: false; errors: string[] };

const GENRES: readonly Genre[] = ['推理', '情感', '恐怖', '欢乐', '硬核'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isGenre(value: unknown): value is Genre {
  return typeof value === 'string' && (GENRES as readonly string[]).includes(value);
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * 校验一个剧本包。
 *
 * @param raw        从 JSON 解析出来的原始值（unknown，不做任何信任）
 * @param expectedId 期望的剧本 id（通常取自文件名），用于拦截「文件名与 id 对不上」
 */
export function validateScriptBundle(raw: unknown, expectedId?: string): BundleValidation {
  const errors: string[] = [];

  if (!isRecord(raw)) return { ok: false, errors: ['顶层必须是一个对象'] };

  // ---------- script 元信息 ----------
  const rawScript = raw.script;
  if (!isRecord(rawScript)) return { ok: false, errors: ['缺少 script 对象'] };

  const scriptId = rawScript.id;
  if (!isText(scriptId)) errors.push('script.id 缺失');
  else if (expectedId !== undefined && scriptId !== expectedId) {
    errors.push(`文件名为 ${expectedId}.json，但 script.id 是 ${scriptId}（二者必须一致）`);
  }

  if (!isText(rawScript.title)) errors.push('script.title 缺失');
  if (!isText(rawScript.subtitle)) errors.push('script.subtitle 缺失');
  if (!isText(rawScript.coverUrl)) errors.push('script.coverUrl 缺失');
  if (!isText(rawScript.summary)) errors.push('script.summary 缺失');
  if (!isText(rawScript.description)) errors.push('script.description 缺失');
  if (!isText(rawScript.createdAt)) errors.push('script.createdAt 缺失');

  if (!isGenre(rawScript.genre)) errors.push(`script.genre 只能是 ${GENRES.join(' / ')}`);
  if (!isDifficulty(rawScript.difficulty)) errors.push('script.difficulty 必须是 1~5 的整数');

  const playerCount = rawScript.playerCount;
  if (!isNumber(playerCount) || !Number.isInteger(playerCount) || playerCount < 2) {
    errors.push('script.playerCount 必须是不小于 2 的整数');
  }
  const duration = rawScript.durationMinutes;
  if (!isNumber(duration) || duration <= 0) errors.push('script.durationMinutes 必须是正数');

  if (!Array.isArray(rawScript.tags) || !rawScript.tags.every((tag) => typeof tag === 'string')) {
    errors.push('script.tags 必须是字符串数组');
  }

  const murderer = rawScript.murdererCharacterId;
  if (murderer !== null && !isText(murderer)) {
    errors.push('script.murdererCharacterId 必须是字符串或 null');
  }

  const characters = Array.isArray(raw.characters) ? raw.characters : [];
  const acts = Array.isArray(raw.acts) ? raw.acts : [];
  const clues = Array.isArray(raw.clues) ? raw.clues : [];

  if (!Array.isArray(raw.characters)) errors.push('characters 必须是数组（没有就写 []）');
  if (!Array.isArray(raw.acts)) errors.push('acts 必须是数组（没有就写 []）');
  if (!Array.isArray(raw.clues)) errors.push('clues 必须是数组（没有就写 []）');

  // ---------- 角色 ----------
  const characterIds = new Set<string>();
  characters.forEach((item, index) => {
    const where = `characters[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${where} 不是对象`);
      return;
    }

    const charId = item.id;
    if (!isText(charId)) errors.push(`${where}.id 缺失`);
    else {
      if (characterIds.has(charId)) errors.push(`${where}.id 重复：${charId}`);
      characterIds.add(charId);
    }

    if (!isText(item.name)) errors.push(`${where}.name 缺失`);
    if (!isText(item.identity)) errors.push(`${where}.identity 缺失`);
    if (!isText(item.avatarUrl)) errors.push(`${where}.avatarUrl 缺失`);
    if (item.backgroundStory !== undefined && !isText(item.backgroundStory)) errors.push(`${where}.backgroundStory 必须是非空文本`);
    if (!isText(item.publicIntro)) errors.push(`${where}.publicIntro 缺失`);
    if (!isText(item.secret)) errors.push(`${where}.secret 缺失（这是玩家的底牌，不能留空）`);
    if (!isNumber(item.age)) errors.push(`${where}.age 必须是数字`);
    if (!isNumber(item.sortOrder)) errors.push(`${where}.sortOrder 必须是数字`);
    if (!Array.isArray(item.goals) || item.goals.length === 0) {
      errors.push(`${where}.goals 至少要有 1 条`);
    }
    if (isText(item.scriptId) && isText(scriptId) && item.scriptId !== scriptId) {
      errors.push(`${where}.scriptId=${item.scriptId} 与 script.id=${scriptId} 不一致`);
    }
  });

  // ---------- 幕 ----------
  const actNumbers = new Set<number>();
  acts.forEach((item, index) => {
    const where = `acts[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${where} 不是对象`);
      return;
    }

    const actNumber = item.actNumber;
    if (!isNumber(actNumber) || !Number.isInteger(actNumber) || actNumber < 1) {
      errors.push(`${where}.actNumber 必须是不小于 1 的整数`);
    } else {
      if (actNumbers.has(actNumber)) errors.push(`${where}.actNumber 重复：${actNumber}`);
      actNumbers.add(actNumber);
    }

    if (!isText(item.title)) errors.push(`${where}.title 缺失`);
    if (!isText(item.narration)) errors.push(`${where}.narration 缺失`);
    if (isText(item.scriptId) && isText(scriptId) && item.scriptId !== scriptId) {
      errors.push(`${where}.scriptId=${item.scriptId} 与 script.id=${scriptId} 不一致`);
    }
  });

  if (acts.length > 0) {
    for (let n = 1; n <= acts.length; n += 1) {
      if (!actNumbers.has(n)) errors.push(`幕号不连续：缺少第 ${n} 幕`);
    }
  }

  // ---------- 线索 ----------
  const clueIds = new Set<string>();
  clues.forEach((item, index) => {
    const where = `clues[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${where} 不是对象`);
      return;
    }

    const clueId = item.id;
    if (!isText(clueId)) errors.push(`${where}.id 缺失`);
    else {
      if (clueIds.has(clueId)) errors.push(`${where}.id 重复：${clueId}`);
      clueIds.add(clueId);
    }

    if (!isText(item.title)) errors.push(`${where}.title 缺失`);
    if (!isText(item.content)) errors.push(`${where}.content 缺失`);

    const actNumber = item.actNumber;
    if (!isNumber(actNumber) || !actNumbers.has(actNumber)) {
      errors.push(`${where}.actNumber=${String(actNumber)} 找不到对应的幕`);
    }

    const visibility = item.visibility;
    const owner = item.ownerCharacterId;

    if (visibility === 'private') {
      if (!isText(owner)) errors.push(`${where} 是私密线索，必须填 ownerCharacterId`);
      else if (!characterIds.has(owner)) {
        errors.push(`${where}.ownerCharacterId=${owner} 不是本剧本的角色`);
      }
    } else if (visibility === 'public') {
      if (owner !== null) errors.push(`${where} 是公开线索，ownerCharacterId 必须是 null`);
    } else {
      errors.push(`${where}.visibility 只能是 public 或 private`);
    }

    if (isText(item.scriptId) && isText(scriptId) && item.scriptId !== scriptId) {
      errors.push(`${where}.scriptId=${item.scriptId} 与 script.id=${scriptId} 不一致`);
    }
  });

  // ---------- 可玩性与自洽 ----------
  const hasCharacters = characters.length > 0;
  if (hasCharacters) {
    if (acts.length === 0) errors.push('有角色却没有幕（acts 为空），这个剧本开不了局');
    if (clues.length === 0) errors.push('有角色却没有线索（clues 为空），这个剧本开不了局');
    if (!isText(murderer)) {
      errors.push('有角色的剧本必须指定 murdererCharacterId');
    } else if (!characterIds.has(murderer)) {
      errors.push(`murdererCharacterId=${murderer} 不在角色列表里`);
    }
  } else {
    if (acts.length > 0 || clues.length > 0) {
      errors.push('还没录入角色，却出现了幕或线索，数据不完整');
    }
    if (isText(murderer)) errors.push('还没录入角色，不应指定 murdererCharacterId');
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, bundle: raw as unknown as ScriptBundle };
}

/** 剧本是否已经能开局（数据齐全）。 */
export function isPlayableBundle(bundle: ScriptBundle): boolean {
  return (
    bundle.characters.length > 0 &&
    bundle.acts.length > 0 &&
    bundle.clues.length > 0 &&
    bundle.script.murdererCharacterId !== null
  );
}
