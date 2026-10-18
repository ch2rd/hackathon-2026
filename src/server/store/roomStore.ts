/**
 * 房间运行时状态存储（C 维护）。
 *
 * 为什么先不用数据库：Prisma 的引擎是独立子进程，在当前环境里起不来
 * （`spawn EPERM`），没法验证的持久化层不能当成品交。这里落一个零依赖的
 * JSON 文件实现，接口形状与 `MockDb` 完全一致，换成 Prisma 时只需要替换本文件
 * （`prisma/schema.prisma` 已按 AGENTS.md §4 建好）。
 *
 * 并发：所有「读-改-写」串行排队，避免两个请求同时读到旧快照互相覆盖。
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { emptyDb, type MockDb } from '../../mocks/mockEngine';
import { ApiError } from '../../utils/apiError';

const storePath = process.env.STORE_FILE ?? join(process.cwd(), '.data', 'rooms.json');

let writeQueue: Promise<unknown> = Promise.resolve();

async function load(): Promise<MockDb> {
  try {
    const raw = await readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<MockDb> | null;
    if (!parsed || typeof parsed !== 'object') return emptyDb();
    return {
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
      players: Array.isArray(parsed.players) ? parsed.players : [],
      votes: Array.isArray(parsed.votes) ? parsed.votes : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyDb();
    throw new ApiError('INTERNAL_ERROR', '房间数据文件损坏，请检查 .data/rooms.json');
  }
}

async function save(db: MockDb): Promise<void> {
  await mkdir(dirname(storePath), { recursive: true });
  const tmp = `${storePath}.tmp`;
  // 先写临时文件再 rename：中途崩了也不会留下半个 JSON
  await writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
  await rename(tmp, storePath);
}

/** 只读操作。 */
export async function read<T>(fn: (db: MockDb) => T): Promise<T> {
  return fn(await load());
}

/**
 * 读-改-写。`fn` 抛错（比如状态机拒绝）时**不落盘**，
 * 这样非法请求不会把半截状态写进文件。
 */
export async function mutate<T>(fn: (db: MockDb) => T): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await load();
    const result = fn(db);
    await save(db);
    return result;
  });

  // 队列本身不因为某次失败而断掉
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

export function storeFilePath(): string {
  return storePath;
}
