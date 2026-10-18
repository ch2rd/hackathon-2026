/**
 * 剧本内容服务（C 维护）。
 *
 * 剧本是**静态内容**，直接读 `data/scripts/*.json` —— 和前端 Mock 读的是同一批文件。
 * 好处：新增剧本不用 seed、不用改代码、前后端同时生效。
 *
 * 校验用 `src/utils/scriptSchema.ts`，与 `npm run check:scripts`、前端加载器是同一套规则。
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ScriptBundle } from '../../types/models';
import { toCatalog, type ScriptCatalog } from '../../mocks/mockEngine';
import { ApiError } from '../../utils/apiError';
import { validateScriptBundle } from '../../utils/scriptSchema';

const scriptsDir = process.env.SCRIPTS_DIR?.trim() || join(process.cwd(), 'data', 'scripts');

let cached: ScriptCatalog | null = null;

async function buildCatalog(): Promise<ScriptCatalog> {
  let files: string[];
  try {
    files = (await readdir(scriptsDir)).filter((name) => name.endsWith('.json')).sort();
  } catch {
    throw new ApiError('INTERNAL_ERROR', `找不到剧本目录：${scriptsDir}`);
  }

  const bundles: ScriptBundle[] = [];
  const problems: string[] = [];

  for (const file of files) {
    const expectedId = file.replace(/\.json$/, '');
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(join(scriptsDir, file), 'utf8'));
    } catch (error) {
      problems.push(`${file}：JSON 解析失败 → ${(error as Error).message}`);
      continue;
    }

    const result = validateScriptBundle(parsed, expectedId);
    if (result.ok) bundles.push(result.bundle);
    else problems.push(`${file}：${result.errors.join('；')}`);
  }

  if (problems.length > 0) {
    throw new ApiError('INTERNAL_ERROR', `剧本数据校验失败：${problems.join(' ｜ ')}`);
  }

  return toCatalog(bundles);
}

/** 获取剧本目录（进程内缓存）。 */
export async function getCatalog(): Promise<ScriptCatalog> {
  cached ??= await buildCatalog();
  return cached;
}

/** 开发期热更新剧本用（改完 JSON 不用重启进程）。 */
export function resetCatalogCache(): void {
  cached = null;
}
