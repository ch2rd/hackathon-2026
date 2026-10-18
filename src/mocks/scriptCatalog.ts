/**
 * 剧本目录（浏览器侧，C 维护）。
 *
 * 数据源：`data/scripts/*.json` —— 与后端 seed 读的是**同一批文件**，
 * 所以「新增剧本」只需要丢一个 JSON 进去，前端一行代码都不用改。
 *
 * 用 `import.meta.glob` 惰性加载，而不是 eager：
 * 剧本数据里含 murdererCharacterId 这类敏感字段，惰性加载能让它不进主 bundle，
 * 只有真正走 Mock 模式时才会被拉取。
 */

import { ApiError } from '../api/client';
import type { ScriptBundle } from '../types/models';
import { validateScriptBundle } from '../utils/scriptSchema';

const modules = import.meta.glob('../../data/scripts/*.json');

let cached: Promise<ScriptBundle[]> | null = null;

async function loadAll(): Promise<ScriptBundle[]> {
  const entries = Object.entries(modules).sort(([left], [right]) => left.localeCompare(right));
  const bundles: ScriptBundle[] = [];
  const problems: string[] = [];

  for (const [path, load] of entries) {
    const expectedId = path.split('/').pop()?.replace(/\.json$/, '') ?? '';
    const loaded = (await load()) as { default?: unknown };
    const result = validateScriptBundle(loaded.default, expectedId);

    if (result.ok) bundles.push(result.bundle);
    else problems.push(`${expectedId} → ${result.errors.join('；')}`);
  }

  if (problems.length > 0) {
    throw new ApiError('INTERNAL_ERROR', `剧本数据校验失败：${problems.join(' ｜ ')}`);
  }

  return bundles;
}

/** 加载全部剧本包（进程内只读一次）。 */
export function loadScriptBundles(): Promise<ScriptBundle[]> {
  cached ??= loadAll();
  return cached;
}

/** 按 id 查剧本包，找不到返回 null。 */
export async function findScriptBundle(scriptId: string): Promise<ScriptBundle | null> {
  const bundles = await loadScriptBundles();
  return bundles.find((bundle) => bundle.script.id === scriptId) ?? null;
}
