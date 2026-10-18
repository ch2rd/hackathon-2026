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
| 数据库 | Prisma + SQLite（本地 Demo，部署可切 PostgreSQL） |
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
| `server/**`、`prisma/**`、`data/**` | C | 后端与数据库 |

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
