// @vitest-environment node
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it('复制环境模板后，空的存储和剧本路径使用项目默认值', async () => {
  vi.stubEnv('STORE_FILE', '');
  vi.stubEnv('SCRIPTS_DIR', '');
  vi.resetModules();
  const { storeFilePath } = await import('../src/server/store/roomStore');
  const { getCatalog } = await import('../src/server/services/scriptService');
  expect(storeFilePath()).toBe(join(process.cwd(), '.data', 'rooms.json'));
  expect((await getCatalog()).size).toBeGreaterThan(0);
});
