# 技术架构（补充说明）

> 技术栈与目录结构以 [AGENTS.md](../AGENTS.md) 第 1、6 节为准，本文档做展开。

## 一、技术栈（AGENTS.md §1）

| 层 | 选型 |
| --- | --- |
| 前端 | React 18 + TypeScript + Vite 5 |
| 路由 | React Router 6（统一在 `src/router.tsx`） |
| 状态 | Zustand |
| 样式 | Tailwind CSS 3 + lucide-react |
| 后端 | Node.js 20 + Express 4 + TypeScript |
| 校验 | Zod（仅后端） |
| 数据库 | Prisma + SQLite（schema 已建；**运行时暂用 JSON 文件**，见 §六 6.1） |
| AI | OpenAI API（服务端调用，无 Key 自动降级 Mock） |
| 请求 | 原生 fetch 封装（不引入 axios） |

## 二、Mock-first（AGENTS.md §1.2）

```text
VITE_USE_MOCK=true   → src/api 走 Mock 适配器（localStorage 持久化）
VITE_USE_MOCK=false  → src/api 走真实 HTTP / Express
```

- A/B 只 import `src/api` 的函数，不关心当前是 Mock 还是真实接口。
- Mock 与真实接口的函数签名、返回类型、错误行为一致。
- Mock 用 `localStorage` 保存房间状态，监听 `storage` 事件，支持多标签页演示。

## 三、端口与代理（AGENTS.md §1.3）

| 服务 | 端口 |
| --- | --- |
| Vite 前端 | `5173` |
| Express API | `3001` |

Vite 把 `/api` 代理到 `http://localhost:3001`，前端不写死 `localhost:3001`。

## 四、模块边界（AGENTS.md §3）

| 目录 | Owner | 职责 |
| --- | --- | --- |
| `src/pages/**` | A/B 分页 | 页面组件 |
| `src/components/ui/**`、`layout/**`、`styles/**` | A | 设计系统 |
| `src/components/game/**`、`stores/**`、`game/**` | B | 游戏交互与状态机 |
| `src/api/**`、`mocks/**`、`types/**`、`utils/**` | C | 数据层与契约 |
| `src/server/**`、`prisma/**`、`data/**` | C | 后端与数据库 |

跨区修改先问 owner，只做最小改动。

## 五、本地运行与部署

```bash
npm install
npm run dev          # 同时启动前端 + API
npm run db:push && npm run db:seed
npm run typecheck
```

- 部署：待定（P2 才上公网）。
- 演示环境：Mock 模式即可完整跑通主流程。

## 六、已知技术债

诚实记录赛程中的妥协，赛后再改。

### 6.1 Prisma 已建模，但未接入运行时

`prisma/schema.prisma` 已按 AGENTS.md §4 建好 `Room` / `Player` / `Vote` 三张表，
`npm run db:push` 能成功生成 `prisma/dev.db`；但**服务端运行时并不读它**。

实际在用：`src/server/store/roomStore.ts` —— 零依赖的 JSON 文件实现，
落盘在 `.data/rooms.json`（已 gitignore），读-改-写串行排队，先写 `.tmp` 再 `rename`，
失败不落半截状态。

**为什么不直接用 Prisma**：query engine 是独立子进程，在本机沙箱环境下 `spawn EPERM` 起不来。
一个无法验证的持久化层不能当成品交付，所以先用接口等价的 JSON 实现顶上。
`roomStore` 的接口形状与 `src/mocks/mockEngine.ts` 的 `MockDb` 完全一致，
换回 Prisma 只需替换这一个文件。

**代价**：单机单进程可用，不支持多实例并发。演示场景（同机 3 个标签页）完全够用。

### 6.2 数据来源：剧本是文件，房间是运行时状态

| 数据 | 存放位置 | 是否入库 |
| --- | --- | --- |
| 剧本 / 角色 / 幕 / 线索 | `data/scripts/*.json` | 否 |
| 房间 / 玩家 / 投票 | `.data/rooms.json` | 否 |
| Prisma 表结构 | `prisma/schema.prisma` | 仅预留 |

剧本是**唯一来源文件**：前端 Mock 与真实后端读同一批 JSON，
新增剧本 = 丢一个文件、零代码改动，格式见 `docs/script-format.md`，
由 `scripts/check-scripts.ts` 在 `npm run build` 阶段校验契约。

### 6.3 AI 真实调用尚未验证

`OPENAI_BASE_URL` 可指向兼容网关，留空则走官方地址。
当前 `.env` 的 `OPENAI_API_KEY` 为空，**AI 全程走 Mock 降级**。

已实测：无 Key → `source: "mock"`；无线索 → 直接返回确定性结果；
超时/异常/Zod 校验失败 → 一律降级，接口不挂。降级链路有 e2e 测试覆盖。
**未实测：带真实 Key 的 LLM 调用路径**（需要真 Key 才能验）。

### 6.4 SQLite 相对路径的坑（已修）

`DATABASE_URL` 里 SQLite 的相对路径是相对 **`prisma/schema.prisma` 所在目录**解析的。
原来写成 `file:./prisma/dev.db`，实际落到 `prisma/prisma/dev.db`。
现统一为 `file:./dev.db`，落点为 `prisma/dev.db`。

### 6.5 前端页面尚未落地

7 个 P0 页面中只有 `/rooms/:roomId`（RoomPage，B 负责）已实现，其余待 A/B 补。
后端与 Mock 层不依赖页面，可独立验证（`npm test` / `npm run smoke:api`）。
