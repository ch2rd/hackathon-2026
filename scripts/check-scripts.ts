/**
 * 剧本数据校验 CLI（C 维护）。
 *
 * 用法：
 *   npm run check:scripts
 *
 * 和浏览器侧 `src/mocks/scriptCatalog.ts` 复用**同一套校验规则**
 * （`src/utils/scriptSchema.ts`），所以这里过了，前端就不会因为数据问题白屏。
 *
 * 本文件不参与 tsc 检查，直接用 Node 的类型擦除运行。
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateScriptBundle } from '../src/utils/scriptSchema.ts';

const DIR = 'data/scripts';

let files: string[];
try {
  files = readdirSync(DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
} catch {
  console.error(`找不到剧本目录：${DIR}`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`${DIR} 下没有任何剧本 JSON，剧本库会是空的`);
  process.exit(1);
}

const problems: string[] = [];

for (const file of files) {
  const expectedId = file.replace(/\.json$/, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  } catch (error) {
    problems.push(`${file}：JSON 解析失败 → ${(error as Error).message}`);
    continue;
  }

  const result = validateScriptBundle(parsed, expectedId);
  if (!result.ok) {
    for (const error of result.errors) problems.push(`${file}：${error}`);
    continue;
  }

  const { script, characters, acts, clues } = result.bundle;
  const privateCount = clues.filter((clue) => clue.visibility === 'private').length;
  const status = characters.length > 0 ? '可玩' : '即将开放';
  console.log(
    `[通过] ${file}  《${script.title}》 ${status}｜角色 ${characters.length} 幕 ${acts.length} 线索 ${clues.length}（公开 ${clues.length - privateCount} 私密 ${privateCount}）`,
  );
}

if (problems.length > 0) {
  console.error(`\n剧本数据校验未通过，共 ${problems.length} 个问题：`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\n格式说明见 docs/script-format.md');
  process.exit(1);
}

console.log(`\n全部合规：${files.length} 个剧本`);
