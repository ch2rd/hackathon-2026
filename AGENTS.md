# AGENTS.md — 《真相局》项目协作说明书

> 本文件是本项目**唯一的事实源**。A/B/C 三个人每次让 AI 生成或修改代码前，
> 都必须把本文件作为上下文一起发给 AI。
>
> 规则冲突时，以本文件为准；本文件没写到的事，先在群里确认，再写回本文件。

---

## 30 秒版

- **A**：产品 + UI。负责首页、剧本库、剧本详情、角色档案、设计系统、演示脚本。
- **B**：游戏交互。负责房间、选角、剧情推进、线索、投票、结局、Zustand 状态机。
- **C**：数据 + 后端 + 集成 + AI。负责类型、API、Mock、Express、Prisma、AI 降级、联调。
- **只改自己的文件**；跨区先问 owner。
- **所有 fetch 只写 `src/api`**；所有共享类型只写 `src/types`。
- **Mock-first**：`VITE_USE_MOCK=true` 必须能独立演示。
- **先跑通主路径，再加功能**；每 30 分钟 commit，每 2 小时集成。

---

## 0. 项目一句话

**《真相局》**：一个让玩家在线进入角色、获取独立线索并共同推理的沉浸式剧本杀 Web 平台。

三人黑客松 MVP，目标不是做商业产品，而是做到：

- 产品逻辑清楚
- 页面有沉浸感
- 核心流程真的能跑通
- 三个人并行开发不互相覆盖

### 0.1 明确不做（MVP 非目标）

以下功能**不要做**，除非全员同意并写进本文件：

- 注册 / 登录 / 找回密码
- 支付、会员、排行榜、好友系统
- 真实玩家匹配、开黑大厅
- 复杂权限系统
- WebSocket 实时同步（P0 用轮询）
- 管理后台
- 移动端 App
- 多语言

> 玩家身份用「昵称 + 房间号 + 本地 playerId」表示，这是 Demo 身份，不是账号系统。

---

## 1. 技术栈（统一，禁止各写各的）

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | React 18 + TypeScript + Vite 5 | 不混用 Vue / 原生 JS |
| 路由 | React Router 6 | 页面路由统一在 `src/router.tsx` |
| 状态 | Zustand | 不用 Redux / MobX |
| 样式 | Tailwind CSS 3 | 组件样式一律用 Tailwind class |
| 图标 | lucide-react | 不引入第二套图标库 |
| 后端 | Node.js 20 + Express 4 + TypeScript | |
| 校验 | Zod | 只允许后端使用 |
| 数据库 | Prisma + SQLite（本地 Demo） | 部署时可切 PostgreSQL |
| AI | OpenAI API（服务端调用） | 没有 Key 时必须自动降级为 Mock |
| 请求 | 原生 fetch 封装 | 不引入 axios |

### 1.1 允许的依赖白名单

前端：`react`、`react-dom`、`react-router-dom`、`zustand`、`lucide-react`、`tailwindcss`、`postcss`、`autoprefixer`。

后端：`express`、`cors`、`zod`、`prisma`、`@prisma/client`、`openai`、`dotenv`、`tsx`、`typescript`。

开发脚本：`concurrently`。

> TypeScript 类型包（`@types/*`）按需安装，不受白名单限制。

测试：`vitest`、`@testing-library/react`（可选）。

> 新增依赖前必须先问 C，由 C 改 `package.json` 和 lockfile，并在群里说明原因。
> 不要为了一个小功能引入 UI 组件库、动画库、图表库。

### 1.2 Mock-first 策略（非常重要）

前端不能等后端。C 提供一套**可切换的 API 层**：

```text
VITE_USE_MOCK=true   → src/api 走 Mock 适配器（localStorage 持久化）
VITE_USE_MOCK=false  → src/api 走真实 HTTP / Express
```

要求：

1. A/B 只 import `src/api` 里的函数，不关心当前是 Mock 还是真实接口。
2. Mock 和真实接口的**函数签名、返回类型、错误行为必须一致**。
3. Mock 适配器用 `localStorage` 保存房间状态，并监听 `storage` 事件，
   支持同一浏览器多标签页演示。
4. 默认 `.env.example` 里 `VITE_USE_MOCK=true`，保证没有后端也能演示。
5. 演示前 C 必须验证两种模式都能跑通核心流程。

### 1.3 端口与代理

| 服务 | 端口 |
| --- | --- |
| Vite 前端 | `5173` |
| Express API | `3001` |

Vite 把 `/api` 代理到 `http://localhost:3001`，前端代码里不要写死 `localhost:3001`。

### 1.4 统一脚本（C 负责实现）

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 同时启动前端和 API |
| `npm run dev:web` | 只启动 Vite |
| `npm run dev:api` | 只启动 Express |
| `npm run typecheck` | TypeScript 全量检查 |
| `npm run build` | typecheck + 前端构建 |
| `npm run db:push` | 创建/同步 SQLite 表 |
| `npm run db:seed` | 写入种子数据 |
| `npm run test` | 运行 Vitest（有测试时） |

> `dev` 用 `concurrently` 同时跑 `vite` 和 `tsx watch src/server/index.ts`。
> 如果现场 `concurrently` 出问题，允许开两个终端分别跑 `dev:web` / `dev:api`。

---

## 2. MVP 范围与核心流程

### 2.1 核心用户流程

```text
首页
 ↓
剧本库
 ↓
剧本详情
 ↓
创建房间 / 输入房间号加入
 ↓
房间等候 + 选择角色
 ↓
角色档案（只看到自己的秘密）
 ↓
剧情推进 + 线索
 ↓
AI 推理助手
 ↓
投票
 ↓
结局揭晓
```

### 2.2 页面清单（7 个核心页面）

| # | 路由 | 页面 | 负责人 | P0 验收 |
| --- | --- | --- | --- | --- |
| 1 | `/` | 首页 | A | 有沉浸感的首屏、开始游戏、探索剧本入口 |
| 2 | `/scripts` | 剧本库 | A | 3～6 个剧本卡片、分类筛选、空状态 |
| 3 | `/scripts/:scriptId` | 剧本详情 | A | 封面、简介、人数、时长、难度、创建/加入按钮 |
| 4 | `/rooms/:roomId` | 房间 / 选角 | B | 玩家列表、角色选择、准备、房主开始选角 |
| 5 | `/rooms/:roomId/character` | 角色档案 | A（UI）+ B（数据） | 只显示当前玩家角色与秘密 |
| 6 | `/rooms/:roomId/play` | 游戏进行 | B | 当前幕、线索、AI 推理、投票阶段 |
| 7 | `/rooms/:roomId/ending` | 结局 | B | 公布投票结果、真相、再来一局 |

> 投票不单独做路由，作为 `/play` 页面里的一个阶段。
> 加入房间用首页/剧本详情里的弹窗，不单独做页面。

### 2.3 P0 / P1 / P2

**P0（必须完成，演示主路径）**

- 1 个完整可玩剧本《雾夜庄园》
- 6 个角色，至少 2 幕，至少 8 条线索
- 创建房间、房间号加入、选角、准备、开始
- 角色秘密只对本人可见
- 剧情推进、公开/私密线索
- 投票、结局
- AI 推理助手（可降级为 Mock）
- Mock 模式可完整演示

**P1（有时间再做）**

- 再补 2～3 个剧本卡片（可以只展示，不可玩）
- 房主「演示推进」按钮：跳过等待/强制进入下一幕
- 房间内简单聊天或公开陈述（不做实时，轮询即可）
- 音效/背景音乐开关

**P2（最后有余力再说）**

- 6 个剧本、多结局、成就、分享海报
- 真实部署到公网
- PostgreSQL 替换 SQLite

> 如果只剩 3 小时：只做 P0，P1/P2 全部砍掉。

---

## 3. A / B / C 分工明细

### 3.1 总览

| 角色 | 主责 | 一句话 |
| --- | --- | --- |
| A | 产品 + 前端 UI | 负责「用户看到什么、怎么走」 |
| B | 前端交互 + 游戏逻辑 | 负责「网站怎么玩起来」 |
| C | 后端 + 数据 + 集成 + AI | 负责「数据怎么流、接口怎么通」 |

> 角色定义的是**最终责任人**，不是「别人绝对不许碰」。
> 但跨区修改必须先说一声，并且只做最小改动。

### 3.2 A：产品 + 前端 UI

#### 负责

- 整理 MVP 需求、用户故事、页面流程
- 决定 7 个页面分别解决什么问题
- 统一视觉风格、字体、颜色、间距、按钮、卡片
- 实现首页、剧本库、剧本详情、角色档案
- 实现全局布局、导航、页脚、加载/空/错误状态
- 维护演示脚本和答辩材料
- 代表「用户的眼睛」做最终验收

#### 文件所有权

```text
src/App.tsx
src/main.tsx
src/router.tsx
src/pages/HomePage.tsx
src/pages/ScriptLibraryPage.tsx
src/pages/ScriptDetailPage.tsx
src/pages/CharacterPage.tsx
src/components/ui/**
src/components/layout/**
src/styles/**
tailwind.config.ts
index.html
docs/product.md
docs/demo-script.md
```

#### 交付物

1. `docs/product.md`：MVP、用户流程、页面清单、视觉规范、文案。
2. `src/styles/theme.css`：颜色、字体、阴影、圆角等设计 token。
3. `src/components/ui/`：Button、Card、Tag、Input、Modal、EmptyState、Loading、ErrorState。
4. `src/components/layout/`：AppShell、TopNav、PageContainer。
5. 上面 4 个 A 负责的页面。
6. `docs/demo-script.md`：5 分钟演示脚本。

#### 验收标准

- 390px 和 1440px 宽度都不横向溢出。
- 所有页面只使用 `src/components/ui` 和设计 token，不出现散落的十六进制颜色。
- 页面里没有直接 `fetch`，全部通过 `src/api`。
- 每个数据页面都有加载、空、错误三种状态。
- 文案统一中文，语气一致，不出现占位符 `Lorem ipsum`。
- 首页首屏在 3 秒内能看懂「这是什么、怎么开始」。

#### 不要做

- 不要修改 `src/stores/gameStore.ts`、`src/game/**`。
- 不要修改 `src/types/**`、`src/api/**`、`src/mocks/**`。
- 不要修改 `src/server/**`、`prisma/**`。
- 不要把游戏状态机写进页面组件。
- 不要让 AI 一次生成整个网站。

### 3.3 B：前端交互 + 游戏逻辑

#### 负责

- 创建/加入房间的交互
- 玩家列表、角色选择、准备、房主开始选角
- 房间状态轮询与本地恢复
- 剧情推进、当前幕、线索展示
- 投票、票数统计、结局
- AI 推理助手的交互（加载、错误、降级提示）
- 前端游戏状态机与单元测试

#### 文件所有权

```text
src/pages/RoomPage.tsx
src/pages/GamePage.tsx
src/pages/EndingPage.tsx
src/components/game/**
src/stores/gameStore.ts
src/game/stateMachine.ts
src/game/selectors.ts
docs/game-flow.md
```

#### 交付物

1. `docs/game-flow.md`：状态机、每个状态的 UI、异常分支。
2. 房间页：加入、玩家列表、选角、准备、房主开始选角。
3. 游戏页：当前幕、线索、AI 推理、投票阶段。
4. 结局页：投票结果、真相、再来一局。
5. `src/game/stateMachine.ts`：纯函数状态机，不依赖 React。
6. `src/stores/gameStore.ts`：Zustand store，负责 API 调用、轮询、错误状态。
7. 状态机单元测试（Vitest）：至少覆盖正常推进和 3 个异常分支。

#### 验收标准

- 3 个浏览器标签页可以在 Mock 模式完成一整局。
- 刷新页面后能根据 `localStorage` 里的 `playerId` 恢复房间。
- 每个 `RoomStatus` 都有对应 UI，不会出现白屏或死路。
- 角色被选走后其他玩家不能再选。
- 投票每人只能投一次，不能投自己。
- AI 失败时显示降级提示，不阻塞投票和结局。
- 页面里没有直接 `fetch`，全部通过 `src/api`。
- 复用 A 的 UI 组件，不新增颜色/字体。

#### 不要做

- 不要修改 A 的页面、`src/components/ui/**`、`src/styles/**`。
- 不要修改 `src/types/**`、`src/api/**`、`src/mocks/**`。
- 不要修改 `src/server/**`、`prisma/**`。
- 不要在组件里写死剧本/角色数据，必须从 API 层拿。
- 不要把别人的角色秘密放进全局 store 或 URL。

### 3.4 C：后端 + 数据 + 集成 + AI

#### 负责

- 定义共享类型、API 契约、错误码
- 维护 Mock 数据与 Mock 适配器
- 实现 Express 路由、服务层、校验、错误处理
- Prisma schema、种子数据、SQLite 本地库
- AI 推理接口与降级策略
- 前后端联调、代理、环境变量、启动脚本
- `main` 分支可运行、部署、演示兜底
- 维护 `AGENTS.md` 的变更记录

#### 文件所有权

```text
src/types/**
src/api/**
src/mocks/**
src/utils/**            # 公共工具，默认 C 维护
src/server/**
prisma/**
data/**
docs/api.md
.env.example
README.md
package.json
package-lock.json
vite.config.ts
tsconfig*.json
postcss.config.js
```

#### 交付物

1. `src/types/models.ts`、`src/types/api.ts`：全项目唯一类型来源。
2. `src/api/client.ts`：fetch 封装、超时、错误转换。
3. `src/api/scripts.ts`、`rooms.ts`、`ai.ts`：A/B 只调用这些函数。
4. `src/api/mockAdapter.ts`、`httpAdapter.ts`：同一套签名，可切换。
5. `src/mocks/`：1 个完整剧本 + 3 个剧本卡片数据。
6. `src/server/routes/`、`src/server/services/`、`src/server/middleware/`。
7. `prisma/schema.prisma` + `prisma/seed.ts`。
8. `docs/api.md`：每个接口的请求/响应示例。
9. `POST /api/ai/hint`：8 秒超时，失败自动降级为 Mock。
10. `README.md`：一条命令启动、Mock/真实模式切换说明。

#### 验收标准

- `VITE_USE_MOCK=true` 和 `false` 两种模式都能走通 P0 主流程。
- `npm run typecheck` 和 `npm run build` 通过。
- 所有接口返回统一的 `{ data }` / `{ data, total }` / `{ error }`。
- 服务端永远不把 `murdererCharacterId`、别人的 `secret`、别人的私密线索返回给前端。
- 参数校验失败返回 `VALIDATION_ERROR`，不是 500。
- AI 没有 Key、超时、报错时，接口仍返回可用的 Mock 提示。
- `main` 分支随时可以 `npm install && npm run dev`。

#### 不要做

- 不要修改 A/B 的页面和组件。
- 不要在 `routes/` 里写业务逻辑，逻辑放 `services/`。
- 不要在前端组件里直连数据库或写 SQL。
- 不要擅自改字段名、接口路径、状态枚举。
- 不要把 API Key 写进前端代码或提交到 Git。

### 3.5 共享文件与冲突规则

| 文件/目录 | 规则 |
| --- | --- |
| `AGENTS.md` | 三人同意后才能改；C 记录变更 |
| `package.json` | C 维护；加依赖先群里说 |
| `src/types/**` | C 维护；A/B 提需求，不直接改 |
| `src/api/**` | C 维护；A/B 只调用 |
| `src/mocks/**` | C 维护；A/B 不直接引用 |
| `src/utils/**` | 默认 C 维护；使用前先问 |
| `src/App.tsx` / `router.tsx` | A 维护；路由骨架第一天一次性建好 |
| `src/components/ui/**` | A 维护；B 复用，不改样式 |
| `src/stores/**` | B 维护；A 不直接改 |
| `src/game/**` | B 维护；A/C 不直接改 |
| `src/server/**` / `prisma/**` | C 维护；A/B 不直接改 |

**冲突处理：**

1. 需要改别人的文件，先在群里发：文件 + 改什么 + 为什么 + 最小 diff。
2. 对方同意后再改；改完在 commit message 里注明。
3. 不允许「顺手重构」别人的文件。
4. 合并冲突时，以本文件为准；本文件没写的，以 owner 的意见为准。

### 3.6 接口冻结与变更流程

- **T+30 分钟**：C 在 `docs/api.md` 冻结 P0 接口和字段。
- 冻结后，A/B 按契约开发；C 不随意改名。
- 确需变更：C 先在群里发变更说明 → A/B 确认 → 更新 `docs/api.md` 和 `src/types` → 再改代码。
- 任何字段改名，必须同步改：类型、Mock、API、页面、测试、本文件。

---

## 4. 数据模型（唯一版本）

> 前端和接口里的日期统一用 ISO 字符串；Prisma 里用 `DateTime`。
> 数据库字段用 snake_case，Prisma 通过 `@map` 映射到 camelCase。

### 4.1 枚举

```ts
export type Genre = '推理' | '情感' | '恐怖' | '欢乐' | '硬核';
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type RoomStatus = 'waiting' | 'selecting' | 'playing' | 'voting' | 'ended';
export type ClueVisibility = 'public' | 'private';
```

### 4.2 Script（剧本）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string (uuid) | 主键 |
| title | string | 剧本名 |
| subtitle | string | 副标题 |
| coverUrl | string | 封面图 |
| genre | Genre | 类型 |
| playerCount | number | 建议人数 |
| durationMinutes | number | 时长（分钟） |
| difficulty | Difficulty | 1～5 |
| summary | string | 一句话简介 |
| description | string | 详细介绍 |
| tags | string[] | 标签 |
| murdererCharacterId | string | **仅服务端可见**，凶手角色 id |
| createdAt | string | 创建时间 |

#### 对外类型（只暴露这些）

```ts
export interface ScriptSummary {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  genre: Genre;
  playerCount: number;
  durationMinutes: number;
  difficulty: Difficulty;
  summary: string;
  tags: string[];
}

export interface CharacterPublic {
  id: string;
  scriptId: string;
  name: string;
  identity: string;
  age: number;
  avatarUrl: string;
  publicIntro: string;
  sortOrder: number;
}

export interface ScriptDetail extends ScriptSummary {
  description: string;
  characters: CharacterPublic[];
}
```

> `Script`（含 `murdererCharacterId`）只允许存在于服务端。
> `GET /api/scripts` 返回 `ScriptSummary`；`GET /api/scripts/:id` 返回 `ScriptDetail`。

### 4.3 Character（角色）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string (uuid) | 主键 |
| scriptId | string | → Script.id |
| name | string | 角色名 |
| identity | string | 身份 |
| age | number | 年龄 |
| avatarUrl | string | 头像 |
| publicIntro | string | 公开介绍 |
| secret | string | **仅本人可见**的秘密 |
| goals | string[] | 个人任务 |
| sortOrder | number | 排序 |

### 4.4 ScriptAct（幕）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string (uuid) | 主键 |
| scriptId | string | → Script.id |
| actNumber | number | 第几幕，从 1 开始 |
| title | string | 标题 |
| narration | string | 旁白/剧情文本 |

### 4.5 Clue（线索）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string (uuid) | 主键 |
| scriptId | string | → Script.id |
| actNumber | number | 第几幕出现 |
| title | string | 线索标题 |
| content | string | 线索内容 |
| visibility | ClueVisibility | public / private |
| ownerCharacterId | string \| null | 私密线索归属角色；公开为 null |

### 4.6 Room（房间）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string (uuid) | 主键 |
| code | string | 6 位房间号，大写，去掉 0/O/1/I |
| scriptId | string | → Script.id |
| hostPlayerId | string | 房主 Player.id |
| status | RoomStatus | 房间状态 |
| currentAct | number | 当前幕；0 表示未开始 |
| createdAt | string | 创建时间 |

### 4.7 Player（玩家）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string (uuid) | 主键 |
| roomId | string | → Room.id |
| nickname | string | 昵称 |
| characterId | string \| null | 选择的角色 |
| isHost | boolean | 是否房主 |
| isReady | boolean | 是否准备 |
| joinedAt | string | 加入时间 |

### 4.8 Vote（投票）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string (uuid) | 主键 |
| roomId | string | → Room.id |
| voterPlayerId | string | 投票人 |
| targetPlayerId | string | 被投人 |
| createdAt | string | 投票时间 |

### 4.9 关系

- `Script 1 —— N Character`
- `Script 1 —— N ScriptAct`
- `Script 1 —— N Clue`
- `Script 1 —— N Room`
- `Room 1 —— N Player`
- `Room 1 —— N Vote`
- `Player 1 —— 0..1 Character`（选角后）
- `Player 1 —— N Vote`（作为投票人）

### 4.10 房间状态机

```text
waiting（等人）
  │  房主开始，且玩家数 >= 2
  ▼
selecting（选角）
  │  所有玩家都选了角色并准备
  ▼
playing（剧情/线索）
  │  最后一幕结束
  ▼
voting（投票）
  │  所有玩家都投完
  ▼
ended（结局）
```

规则：

- `waiting`：可加入；房主可开始；不足 2 人不能开始。
- `selecting`：每个玩家只能选一个未被选的角色；全部准备后自动进入 `playing`。
- `playing`：只有房主能点「下一幕」；最后一幕结束后进入 `voting`。
- `voting`：每人只能投一次，不能投自己；全部投完自动进入 `ended`。
- `ended`：只读；可「再来一局」（创建新房间，不复用旧状态）。
- **演示兜底**：房主可以点「演示推进」，强制下一幕/强制结束；
  按钮必须二次确认，且只在 `VITE_DEMO_MODE=true` 时显示。

### 4.11 RoomState（B 的主数据源）

```ts
export interface PublicPlayer {
  id: string;
  nickname: string;
  characterId: string | null;
  characterName: string | null;
  isHost: boolean;
  isReady: boolean;
}

export interface RoomState {
  room: Room;
  players: PublicPlayer[];
  currentAct: ScriptAct | null;
  me: {
    player: Player;
    character: Character | null;
    visibleClues: Clue[];
  };
  votes: Array<{ voterPlayerId: string; targetPlayerId: string }>;
  result: {
    murdererCharacterId: string;
    topVotedCharacterId: string | null;
    isCorrect: boolean;
  } | null;
}
```

> `result` 只在 `status === 'ended'` 时非空。
> `me.character.secret` 和 `me.visibleClues` 只包含当前玩家有权看到的内容。

---

## 5. API 契约

### 5.1 统一返回格式

列表：

```json
{ "data": [], "total": 0 }
```

单个对象：

```json
{ "data": {} }
```

错误：

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "昵称不能为空" } }
```

### 5.2 错误码

| code | HTTP | 场景 |
| --- | --- | --- |
| VALIDATION_ERROR | 400 | 参数缺失/格式错误 |
| NOT_FOUND | 404 | 剧本/房间/玩家不存在 |
| ROOM_FULL | 409 | 房间人数已满 |
| INVALID_STATE | 409 | 当前状态不允许该操作 |
| FORBIDDEN | 403 | 不是房主/不是本人 |
| RATE_LIMITED | 429 | 请求过频 |
| AI_UNAVAILABLE | 503 | AI 不可用（内部已降级则不用返回） |
| INTERNAL_ERROR | 500 | 未预期错误 |

### 5.3 P0 接口

| Method | Path | 请求 | 返回 | 说明 |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | - | `{ data: { ok: true } }` | 健康检查 |
| GET | `/api/scripts` | `?genre=&keyword=` | `{ data: ScriptSummary[], total }` | 剧本列表 |
| GET | `/api/scripts/:scriptId` | - | `{ data: ScriptDetail }` | 详情，不含凶手和秘密 |
| POST | `/api/rooms` | `{ scriptId, nickname }` | `{ data: { room, player } }` | 创建房间 |
| POST | `/api/rooms/join` | `{ code, nickname }` | `{ data: { room, player } }` | 加入房间 |
| GET | `/api/rooms/:roomId/state` | `?playerId=` | `{ data: RoomState }` | 轮询房间状态 |
| POST | `/api/rooms/:roomId/select-character` | `{ playerId, characterId }` | `{ data: RoomState }` | 选角 |
| POST | `/api/rooms/:roomId/ready` | `{ playerId, isReady }` | `{ data: RoomState }` | 准备/取消 |
| POST | `/api/rooms/:roomId/start` | `{ playerId }` | `{ data: RoomState }` | 房主开始 |
| POST | `/api/rooms/:roomId/next-act` | `{ playerId }` | `{ data: RoomState }` | 房主下一幕 |
| POST | `/api/rooms/:roomId/votes` | `{ voterPlayerId, targetPlayerId }` | `{ data: RoomState }` | 投票 |
| POST | `/api/rooms/:roomId/finish` | `{ playerId }` | `{ data: RoomState }` | 演示兜底/强制结束 |
| POST | `/api/ai/hint` | `{ roomId, playerId }` | `{ data: AIHint }` | AI 推理提示 |

### 5.4 前端 API 函数（A/B 只 import 这些）

```ts
// src/api/scripts.ts
getScripts(params?: { genre?: Genre; keyword?: string }): Promise<ListResult<ScriptSummary>>;
getScriptDetail(scriptId: string): Promise<ScriptDetail>;

// src/api/rooms.ts
createRoom(input: { scriptId: string; nickname: string }): Promise<{ room: Room; player: Player }>;
joinRoom(input: { code: string; nickname: string }): Promise<{ room: Room; player: Player }>;
getRoomState(roomId: string, playerId: string): Promise<RoomState>;
selectCharacter(roomId: string, playerId: string, characterId: string): Promise<RoomState>;
setReady(roomId: string, playerId: string, isReady: boolean): Promise<RoomState>;
startRoom(roomId: string, playerId: string): Promise<RoomState>;
nextAct(roomId: string, playerId: string): Promise<RoomState>;
submitVote(roomId: string, voterPlayerId: string, targetPlayerId: string): Promise<RoomState>;
finishRoom(roomId: string, playerId: string): Promise<RoomState>;

// src/api/ai.ts
getAIHint(roomId: string, playerId: string): Promise<AIHint>;
```

`ListResult<T>`：

```ts
export interface ListResult<T> {
  items: T[];
  total: number;
}
```

`src/api/client.ts` 负责把 HTTP 的 `{ data, total }` 转成 `ListResult`，
把 `{ data }` 转成单个对象，把 `{ error }` 转成 `ApiError`。

### 5.5 AI 推理接口

请求：

```json
{ "roomId": "room_xxx", "playerId": "player_xxx" }
```

响应：

```json
{
  "data": {
    "summary": "根据目前线索，庄园管家和医生都存在动机……",
    "suspects": [
      { "playerId": "player_xxx", "name": "林墨", "confidence": 72, "reason": "他在停电前后说法矛盾" }
    ],
    "disclaimer": "AI 仅根据你已获得的线索推测，不代表真相。",
    "source": "llm"
  }
}
```

硬性要求：

- 只使用当前玩家能看到的公开线索 + 自己的私密线索。
- 绝不返回 `murdererCharacterId`。
- 不直接说「凶手就是 X」；只给嫌疑排序和理由。
- 8 秒超时；失败/无 Key 时返回 `source: "mock"` 的确定性结果。
- 服务端用 Zod 校验模型输出；解析失败也走 Mock。
- Prompt 里明确要求「不要编造未提供的线索」。

---

## 6. 目录结构（文件放哪，统一）

```text
team-ai-project/
├── AGENTS.md                    # 全员，唯一事实源
├── README.md                    # C，启动说明
├── package.json                 # C
├── vite.config.ts               # C
├── tailwind.config.ts           # A
├── index.html                   # A
├── .env.example                 # C
├── docs/
│   ├── product.md               # A
│   ├── game-flow.md             # B
│   ├── api.md                   # C
│   └── demo-script.md           # A
├── src/
│   ├── main.tsx                 # A
│   ├── App.tsx                  # A
│   ├── router.tsx               # A（第一天建好全部路由）
│   ├── pages/
│   │   ├── HomePage.tsx         # A
│   │   ├── ScriptLibraryPage.tsx# A
│   │   ├── ScriptDetailPage.tsx # A
│   │   ├── CharacterPage.tsx    # A（UI）
│   │   ├── RoomPage.tsx         # B
│   │   ├── GamePage.tsx         # B
│   │   └── EndingPage.tsx       # B
│   ├── components/
│   │   ├── ui/                  # A
│   │   ├── layout/              # A
│   │   └── game/                # B
│   ├── stores/
│   │   └── gameStore.ts         # B
│   ├── game/
│   │   ├── stateMachine.ts      # B
│   │   └── selectors.ts         # B
│   ├── api/                     # C
│   ├── mocks/                   # C
│   ├── types/                   # C
│   ├── utils/                   # C（公共工具）
│   └── styles/                  # A
├── src/server/
│   ├── index.ts                 # C
│   ├── routes/                  # C
│   ├── services/                # C
│   └── middleware/              # C
├── prisma/
│   ├── schema.prisma            # C
│   └── seed.ts                  # C
└── data/
    └── scripts/                 # C（剧本数据源：一个剧本一个 JSON，见 docs/script-format.md）
```

禁止事项：

- 不新建 `views/`、`pages2/`、`frontend/` 等平行目录。
- 不在组件里直接写 `fetch`，一律走 `src/api/`。
- 不在 `routes/` 里写业务逻辑，逻辑放 `services/`。
- 不在页面里写死剧本/角色数据，一律走 API/Mock。
- 不新增第二套状态管理或第二套请求库。
- 不提交 `.env`、API Key、数据库文件、`node_modules`。

---

## 7. 命名规范（统一）

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 变量 / 函数 | camelCase | `getUserById` |
| 组件 / 类 / 类型 | PascalCase | `UserCard`、`type User` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY` |
| 布尔值 | is/has/can 开头 | `isReady`、`hasVoted` |
| 事件处理 | handle 开头 | `handleStartGame` |
| 组件文件 | PascalCase.tsx | `UserCard.tsx` |
| 工具/接口文件 | camelCase.ts | `getUser.ts` |
| Hook 文件 | useXxx.ts | `useRoomState.ts` |
| 数据库字段 | snake_case | `created_at`（Prisma `@map`） |
| API 路径 | 复数 + kebab-case | `/api/scripts`、`/api/rooms` |
| 查询参数 | camelCase | `?pageSize=20` |
| 环境变量 | UPPER_SNAKE_CASE | `DATABASE_URL` |
| Tailwind token | kebab-case | `bg-ink`、`text-gold` |

正例 / 反例：

- 正确：`GET /api/scripts/:scriptId`
- 错误：`GET /script/list`、`GET /api/getScript`
- 正确：`RoomStatus = 'selecting'`
- 错误：`RoomStatus = 'SELECT_ROLE'`

其他约定：

- 不用 `any`；不确定用 `unknown` + 类型守卫。
- 不使用 `IUser`、`TData` 这类匈牙利前缀。
- 不缩写业务词；`character` 不写成 `char`，`script` 不写成 `scp`。
- 组件 props 类型命名为 `XxxProps`。
- 一个文件只放一个主要导出组件。

---

## 8. 给 AI 的协作规则（每次生成代码必须遵守）

1. 先读本文件，再动手；不确定的字段、路径、状态，先问，不要猜。
2. 只使用第 1 节的技术栈和依赖白名单，不引入未列出的库。
3. 字段名、路径、目录、状态枚举一律以本文件为准，不得自创同义词。
4. 每次只改自己负责的文件；跨区修改先征得 owner 同意。
5. 生成代码时补上类型定义、错误处理、加载状态，不留 `any`。
6. 修改接口时，同步更新 `src/types`、`src/api`、`docs/api.md`、本文件。
7. 新增依赖、新增顶层目录、修改数据模型前，先在群里登记。
8. 不要一次让 AI「做完整个网站」；拆成单个页面/单个函数的小任务。
9. 让 AI 先复述「要改哪些文件、不改哪些文件」，确认后再生成。
10. 生成后必须自己读 diff、跑 typecheck、跑核心流程，不能直接合并。

### 8.1 固定 Prompt 模板

```text
你是《真相局》项目的 [A/B/C]。
先阅读 AGENTS.md，严格遵守其中的技术栈、命名、数据模型和文件边界。

本次目标：
- ……

只允许修改：
- ……

禁止修改：
- ……

验收标准：
- ……

请先列出你准备改的文件和理由，再给代码。
不要重构无关代码，不要新增未列出的依赖。
```

### 8.2 每次 Prompt 必带的上下文

- `AGENTS.md` 全文
- 本次涉及的 `src/types` 定义
- 本次涉及的接口签名
- 目标页面/组件的截图或草稿（如果有）
- 明确的「只改这些文件」清单

---

## 9. Git 与协作节奏

### 9.1 分支

```text
main                 # 随时可演示
feat/a-ui            # A
feat/b-game          # B
feat/c-backend       # C
fix/xxx              # 修 bug
```

- 三个人各自在自己的分支开发。
- 每 30 分钟至少一次小步 commit。
- 每 2 小时合并一次到 `main`，由 C 负责集成。
- 合并前先 `git pull --rebase`，再跑 `npm run typecheck`。
- `main` 坏了，全员停下先修 `main`。

### 9.2 Commit 信息

```text
feat: 新增剧本库页面
feat: 实现房间选角流程
fix: 修复投票重复提交
refactor: 抽出房间状态机
docs: 更新 API 契约
chore: 配置 Tailwind
```

### 9.3 时间节奏（以 5 小时开发窗口为例）

| 时间 | A | B | C | 全员 |
| --- | --- | --- | --- | --- |
| 0:00–0:30 | 产品文档、页面流程、视觉 token | 状态机、页面骨架 | 类型、Mock 数据、API 骨架 | 对齐会：冻结字段/路由/接口 |
| 0:30–1:30 | 首页 + 剧本库 | 房间页 + 选角 | Mock 适配器 + 种子数据 | 30 秒进度口播 |
| 1:30–2:30 | 剧本详情 + 角色档案 | 游戏页 + 线索 + 投票 | Express 路由 + 服务层 | 2:30 集成检查点 |
| 2:30–3:30 | 视觉统一、响应式 | 结局页 + AI 交互 | AI 接口 + 真实 API 联调 | 3:30 集成检查点 |
| 3:30–4:15 | 加载/空/错误状态 | 状态机测试、边界修复 | 错误处理、降级、启动脚本 | 只修主路径 bug |
| 4:15–4:45 | 演示脚本 | 演示脚本 | 兜底检查 | 全流程彩排 2 次 |
| 4:45–5:00 | 答辩材料 | 答辩材料 | 备份/录屏 | 冻结，不再加功能 |

> 每写 2 小时代码，至少留 30 分钟集成和演示。
> 卡住 15 分钟没进展，立刻换人或换思路。

### 9.4 合并检查清单

- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 通过
- [ ] `VITE_USE_MOCK=true` 主流程通过
- [ ] `VITE_USE_MOCK=false` 主流程通过（至少 C 验证）
- [ ] 没有把秘密/凶手字段暴露给前端
- [ ] 没有新增未登记依赖
- [ ] 没有跨区修改未说明
- [ ] `main` 可以启动

---

## 10. 完成定义与演示

### 10.1 Definition of Done（P0）

- 首页、剧本库、剧本详情、房间、角色、游戏、结局 7 个页面可访问。
- 3 个标签页可以完成：创建房间 → 加入 → 选角 → 开始 → 两幕剧情 → 投票 → 结局。
- 每个玩家只能看到自己的角色秘密和私密线索。
- AI 推理助手能返回结果；没有 Key 时返回 Mock，不阻塞流程。
- 刷新页面不丢当前玩家身份。
- 390px / 1440px 无横向滚动。
- 没有控制台报错，没有死路。
- 5 分钟内能演示完。

### 10.2 5 分钟演示脚本

1. **0:00–0:30 首页**：一句话讲清楚「在线剧本杀 + 独立线索 + AI 推理」。
2. **0:30–1:00 剧本库**：筛选类型，打开《雾夜庄园》。
3. **1:00–2:00 创建/加入**：创建房间，另外两个标签页用房间号加入。
4. **2:00–2:40 选角**：三个人选不同角色，展示「每个人看到的秘密不同」。
5. **2:40–3:40 剧情**：推进两幕，展示公开线索和私密线索。
6. **3:40–4:20 AI 推理**：点「AI 推理助手」，说明它只基于已获得线索，不直接公布凶手。
7. **4:20–4:50 投票/结局**：投票，揭晓真相，展示对错。
8. **4:50–5:00 技术一句话**：三个人用同一份 `AGENTS.md`，Mock/真实 API 可切换，AI 可降级。

### 10.3 演示兜底

- 网络不稳：提前用 `VITE_USE_MOCK=true` 跑一遍，并录屏。
- 后端挂了：切 Mock，继续演示。
- AI 挂了：接口自动返回 Mock，不现场调 Key。
- 房间凑不齐：房主用「演示推进」强制开始/推进（只在 Demo 模式显示）。
- 时间不够：只演示主路径，不展开 P1/P2。

---

## 11. 开工前 30 分钟对齐清单

- [ ] 产品一句话、MVP 范围、非目标，三个人都认同了吗？
- [ ] 7 个页面和路由，三个人都清楚谁负责哪个了吗？
- [ ] 数据模型字段、枚举、关系，C 已经写进 `src/types` 了吗？
- [ ] P0 接口和返回格式，C 已经写进 `docs/api.md` 了吗？
- [ ] A 的视觉 token、UI 组件清单，B 知道怎么复用了吗？
- [ ] B 的状态机和每个状态的 UI，A/C 都清楚了吗？
- [ ] Mock/真实 API 切换方式，三个人都会用了吗？
- [ ] 分支名、commit 规范、合并时间点，三个人都同意了吗？
- [ ] 每人的「只改这些文件」清单，已经发到群里了吗？
- [ ] 演示脚本和兜底方案，谁负责最后彩排？

---

## 附录 A：三人各自的 AI Prompt 示例

### A 的 Prompt

```text
你是《真相局》的产品/前端 UI 负责人 A。
先阅读 AGENTS.md。本次只实现剧本库页面，不改后端、不改游戏逻辑。

目标：
- 实现 /scripts 页面
- 使用 src/components/ui 里已有的组件和 src/styles/theme.css 的 token
- 支持类型筛选和关键词搜索
- 包含加载、空、错误三种状态
- 390px / 1440px 响应式

只允许修改：
- src/pages/ScriptLibraryPage.tsx
- src/components/ui/ 中确实缺失的组件（先说明）
- docs/product.md 的相关段落

禁止修改：
- src/api/**、src/types/**、src/stores/**、src/server/**

先列出改动文件，再给代码。
```

### B 的 Prompt

```text
你是《真相局》的前端交互/游戏逻辑负责人 B。
先阅读 AGENTS.md。本次只实现房间页的选角流程，不改 UI 设计系统、不改后端。

目标：
- /rooms/:roomId 页面显示玩家列表和角色列表
- 已被选的角色禁用
- 当前玩家选中后调用 selectCharacter
- 准备按钮调用 setReady
- 房主在人数 >= 2 时可以点「开始选角」；所有玩家选角并准备后进入 playing
- 每 2 秒轮询 getRoomState，组件卸载时清理

只允许修改：
- src/pages/RoomPage.tsx
- src/components/game/**
- src/stores/gameStore.ts
- src/game/**
- docs/game-flow.md

禁止修改：
- src/components/ui/**、src/styles/**、src/api/**、src/types/**、src/server/**

先列出改动文件，再给代码。
```

### C 的 Prompt

```text
你是《真相局》的后端/数据/集成负责人 C。
先阅读 AGENTS.md。本次只实现房间状态接口和 Mock 适配器，不改页面。

目标：
- 实现 GET /api/rooms/:roomId/state
- 返回 RoomState，过滤掉别人的 secret 和私密线索
- 实现 Mock 版本的同一函数，用 localStorage 持久化
- 补充 docs/api.md 的请求/响应示例
- 补充状态机相关错误码：NOT_FOUND、INVALID_STATE、FORBIDDEN

只允许修改：
- src/types/**
- src/api/**
- src/mocks/**
- src/server/**
- docs/api.md

禁止修改：
- src/pages/**、src/components/**、src/styles/**、src/stores/**

先列出改动文件，再给代码。
```

---

## 附录 B：变更记录

| 日期 | 修改人 | 内容 |
| --- | --- | --- |
| 2026-10-18 | 全员 | 初版：从通用模板改为《真相局》剧本杀项目，明确 A/B/C 分工、7 页面、数据模型、API 契约、Mock-first 策略 |
| 2026-10-18 | C | 剧本数据源改为 `data/scripts/*.json`（一剧本一文件，新增剧本零代码改动）；新增 `GET /api/rooms/:roomId/context`；拆出 `src/mocks/mockEngine.ts`（纯规则，与存储解耦）。**以上变更待 A/B 确认** |
| 2026-10-18 | C | 后端目录 `server/` → `src/server/`（对齐 PR #2 定稿）；`src/server/index.ts` 拆出 `createApp()` 供测试复用；新增 `tests/api.e2e.test.ts`（真实后端 e2e，34 项）；CI 补 `actions/setup-node@v4`（Node 22）；修正 `DATABASE_URL` 相对路径（`file:./dev.db`）与 `.gitignore` 编码。**以上变更待 A/B 确认** |

---

> 记住：**先对齐，再并行；先跑通，再美化；先主路径，再加分项。**

## 2026-10-18 公聊与私聊（用户授权 B/C 联动）

保持 RoomStatus 不变；Room 新增可选 gameplayPhase：introduction / search / discussion。
选角准备完毕 → 第一幕出场公聊（介绍身份、相互认识）→ 搜证 → 讨论（公聊 / 双人私聊）→ 下一幕搜证 → 讨论 → 最后一幕讨论结束进入投票。
房主通过 next-act 逐环节推进；非房主不能推进；旧房间无 gameplayPhase 时按搜证处理。
POST /api/rooms/:roomId/messages：{ playerId, channel: 'public' | 'direct', receiverPlayerId?, content, clueId? } → { data: RoomState }。
content 为 1～1000 字；分享 clueId 时由引擎读取本人已获得的线索原文。出场只允许公聊；搜证阶段不能发言；讨论可公聊、私聊。
RoomState.messages 随原有 2 秒轮询同步，服务端只返回公聊与本人收发的私聊。Mock localStorage 和服务端运行时存储均保留消息，旧存档缺失消息按空数组处理。
私密线索分享前二次确认；公开介绍只使用角色 publicIntro，绝不自动填入 secret。


## 2026-10-18 个人故事阅读（用户需求修正）

开局流程调整为：选角准备完成 → reading（个人故事、秘密、任务）→ 全员确认已读 → introduction（公聊自我介绍）→ 搜证 → 讨论。
GameplayPhase 新增 reading；Room.storyReadPlayerIds 为可选 string[]，用于轮询和刷新恢复进度。
POST /api/rooms/:roomId/confirm-story-read，{ playerId } → { data: RoomState }；必须是本房成员，确认去重且可重试。最后一人确认后全员进入 introduction。
阅读期间禁止聊天、next-act 和演示结束；玩家不能被房主提前带离阅读。
Character.backgroundStory 为可选的私密故事，仅随 me.character 返回；CharacterPublic 不包含。四个现有剧本都补齐了个人故事。
游戏页在介绍和后续搜证/讨论中提供「回看我的故事与个人任务」，旧剧本无 backgroundStory 时使用公开介绍作为回退。
旧房间保留当前环节；新建一局体验完整的阅读 → 自我介绍流程。
---

## 附录 C：前端 Skill 组合（2026-10-18）

前端任务优先使用以下 Skill，并在 Prompt 中明确要求：

1. `frontend-app-builder`：从视觉概念到 React 页面实现的主力
2. `frontend-design`：复古悬疑、手绘、非 SaaS 化视觉指导
3. `frontend-testing-debugging`：动画、交互、响应式与视觉回归检查

推荐使用顺序：

```text
frontend-app-builder + frontend-design
  → 实现页面/场景
  → frontend-testing-debugging
  → 修复视觉与交互问题
```

「可探索房间」的视觉与交互方案见 `docs/interactive-room.md`。


## 共享分支集成说明

与 main 的每幕确认逻辑合并：introduction → search、search → discussion 由房主推进；仅 discussion → 下一幕/投票要求全员确认 isReady。
进入游戏、进入讨论、切幕和进入投票时清空讨论确认；reading 使用独立的 storyReadPlayerIds。
场景探索保留在 search 阶段；角色画像、出场动画、回忆滤镜、音效均保留。联网多人模式启动方法见 README 3.8。
