/**
 * 种子脚本（C 维护）。
 *
 * 剧本内容**不入库**：服务端和前端都直接读 `data/scripts/*.json`，
 * 所以「新增剧本」不需要跑 seed，丢文件就行。
 *
 * 房间等运行时状态由 `server/store/roomStore.ts` 在首次写入时自动创建。
 *
 * 保留本文件是为了不打断 `npm run db:seed` 的既有约定；
 * 将来把运行时状态迁到 Prisma 时，初始数据写在这里。
 */

console.log(
  '[seed] 剧本内容直接读取 data/scripts/*.json，无需入库。\n' +
    '[seed] 房间状态由 server/store/roomStore.ts 在首次写入时自动创建。',
);
