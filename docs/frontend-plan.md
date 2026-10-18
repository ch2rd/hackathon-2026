# 《真相局》前端任务拆解与目录分类

> 目标：先让网站能启动，再按页面推进；每个阶段都能独立提交、独立测试、独立演示。
>
> 技术栈：React 18 + TypeScript + Vite + React Router + Tailwind CSS + Zustand。

---

## 0. 上传到远程仓库时的目录约定

远程仓库 `ch2rd/hackathon-2026` 的 `CONTRIBUTING.md` / `README.md` 规定：

- 源码放 `src/`
- 测试放 `tests/`
- 静态素材放 `assets/`
- 文档放 `docs/`

所以本地**不另建 `frontend/` 目录**，前端代码直接放 `src/`，这样上传时不会和仓库规范冲突。

---

## 1. 总目录

```text
team-ai-project/
├── AGENTS.md
├── docs/
│   ├── frontend-plan.md          # 本文件：前端拆解与目录分类
│   ├── product.md                # A：产品定位、流程、视觉规范
│   ├── game-flow.md              # B：游戏状态机与页面流程
│   ├── api.md                    # C：接口契约
│   └── demo-script.md            # A：5 分钟演示脚本
├── src/
│   ├── main.tsx                  # A：React 入口
│   ├── App.tsx                   # A：全局 Provider / 布局
│   ├── router.tsx                # A：全部路由（第一天建好）
│   ├── pages/                    # 路由页面，只做组合，不写复杂逻辑
│   │   ├── HomePage.tsx          # A
│   │   ├── ScriptLibraryPage.tsx # A
│   │   ├── ScriptDetailPage.tsx  # A
│   │   ├── RoomPage.tsx          # B
│   │   ├── CharacterSelectPage.tsx # B
│   │   ├── GameRoomPage.tsx      # B
│   │   ├── InvestigationPage.tsx # B
│   │   ├── ClueBookPage.tsx      # B
│   │   ├── FinalReasoningPage.tsx# B
│   │   └── TruthRevealPage.tsx   # B
│   ├── components/
│   │   ├── ui/                   # A：Button / Card / Modal / Tag / Avatar / Panel
│   │   ├── layout/               # A：Navbar / Footer / PageContainer
│   │   ├── home/                 # A：Hero / FeaturedScripts / Features / AiDmIntro
│   │   ├── scripts/              # A：ScriptCard / ScriptFilters / ScriptGrid
│   │   ├── character/            # A：CharacterCard / CharacterSheet（只做视觉）
│   │   ├── room/                 # B：PlayerList / RoleSelect / ReadyPanel
│   │   ├── game/                 # B：GameHeader / GameStage / AiDmPanel / CluePanel
│   │   ├── investigation/        # B：MansionMap / LocationCard / ClueModal
│   │   └── reasoning/            # B：ReasoningForm / TruthTimeline / ScoreBoard
│   ├── layouts/
│   │   ├── MainLayout.tsx        # A：首页/剧本库/详情
│   │   └── GameLayout.tsx        # A：房间/游戏/搜证/推理/揭晓
│   ├── data/                     # C：Mock 数据（scripts / characters / clues）
│   ├── hooks/
│   │   ├── useScripts.ts         # A
│   │   ├── useRoom.ts            # B
│   │   └── useCountdown.ts       # B
│   ├── api/                      # C：所有 fetch 封装
│   ├── types/                    # C：共享类型
│   ├── utils/                    # C：纯函数工具
│   └── styles/
│       ├── index.css             # A：Tailwind 入口
│       └── theme.css             # A：颜色/字体/圆角/阴影 token
├── tests/
│   ├── unit/                     # 状态机、工具函数
│   └── e2e/                      # 主流程 Playwright
├── assets/                       # A：封面、地图、演示图
├── server/                       # C：当前占位；最终迁到 src/server/
│   ├── models/
│   └── routes/
└── data/
    └── scripts.json              # C：种子数据源
```

> 后端最终统一放 `src/server/`，与远程仓库「源码放 `src/`」的约定一致。
> 当前根目录的 `server/` 只是占位，C 开工时迁移，不要同时维护两套。

---

## 2. 12 个阶段与目录分类

| 阶段 | 页面 / 模块 | 路由 | 页面文件 | 组件目录 | 负责人 |
| --- | --- | --- | --- | --- | --- |
| 1 | 项目框架 | — | `App.tsx`、`main.tsx`、`router.tsx` | `components/ui`、`components/layout` | A |
| 2 | 视觉系统 | — | — | `components/ui`、`styles` | A |
| 3 | 首页 | `/` | `pages/HomePage.tsx` | `components/home`、`components/layout` | A |
| 4 | 剧本库 | `/scripts` | `pages/ScriptLibraryPage.tsx` | `components/scripts` | A |
| 5 | 剧本详情 | `/scripts/:scriptId` | `pages/ScriptDetailPage.tsx` | `components/scripts` | A |
| 6 | 角色选择 | `/rooms/:roomId/characters` | `pages/CharacterSelectPage.tsx` | `components/room`、`components/character` | B（逻辑）+ A（视觉） |
| 7 | 游戏房间 | `/rooms/:roomId/play` | `pages/GameRoomPage.tsx` | `components/game` | B |
| 8 | 搜证 | `/rooms/:roomId/investigate` | `pages/InvestigationPage.tsx` | `components/investigation` | B |
| 9 | 我的线索 | `/rooms/:roomId/clues` | `pages/ClueBookPage.tsx` | `components/game`、`components/investigation` | B |
| 10 | 最终推理 | `/rooms/:roomId/reasoning` | `pages/FinalReasoningPage.tsx` | `components/reasoning` | B |
| 11 | 真相揭晓 | `/rooms/:roomId/reveal` | `pages/TruthRevealPage.tsx` | `components/reasoning` | B |
| 12 | UI/UX 统一优化 | 全局 | — | `components/ui`、`styles`、所有页面 | A + B |

### 页面路由总表

```text
/                              首页
/scripts                       剧本库
/scripts/:scriptId             剧本详情
/rooms/:roomId                 房间等候
/rooms/:roomId/characters      角色选择
/rooms/:roomId/play            游戏房间
/rooms/:roomId/investigate     搜证
/rooms/:roomId/clues           我的线索
/rooms/:roomId/reasoning       最终推理
/rooms/:roomId/reveal          真相揭晓
```

> 路由统一用复数 `/rooms/:roomId/...`，与 API 路径保持一致。
> 所有路由在第一天由 A 一次性建好，后续只填页面内容，不再改路由结构。

---

## 3. 每个文件夹负责什么

### `src/pages/`

- 只做页面组合：读取路由参数、调用 hook、组合组件。
- 不直接写 `fetch`。
- 不写复杂游戏规则；规则放 `src/game/` 或 `src/hooks/`。
- 每个页面必须有 Loading / Empty / Error 三种状态。

### `src/components/ui/`

纯展示组件，不含业务逻辑：

- `Button`
- `Card`
- `Modal`
- `Tag`
- `Avatar`
- `Panel`
- `Input`
- `Tabs`
- `Loading`
- `EmptyState`
- `ErrorState`
- `Toast`

所有页面必须复用这些组件，不允许每个页面自己写一套按钮和颜色。

### `src/components/layout/`

- `Navbar`
- `Footer`
- `PageContainer`
- `AppShell`
- `GameLayout` 用到的顶部状态栏

### `src/components/home/`

- `Hero`
- `FeaturedScripts`
- `FeatureGrid`
- `AiDmIntro`
- `CtaBanner`

### `src/components/scripts/`

- `ScriptCard`
- `ScriptFilters`
- `ScriptGrid`
- `ScriptMeta`
- `ScriptHero`
- `ScriptTags`

### `src/components/character/`

只做视觉，不做选角逻辑：

- `CharacterCard`
- `CharacterSheet`
- `CharacterStats`
- `SecretPanel`（接收已过滤的数据，不自己判断权限）

### `src/components/room/`

- `RoomCode`
- `PlayerList`
- `RoleSelect`
- `ReadyPanel`
- `HostControls`

### `src/components/game/`

- `GameHeader`
- `GameStage`
- `AiDmPanel`
- `CluePanel`
- `CharacterPanel`
- `ActionBar`
- `VotePanel`

### `src/components/investigation/`

- `MansionMap`
- `LocationCard`
- `SearchSpot`
- `ClueModal`

### `src/components/reasoning/`

- `ReasoningForm`
- `SuspectSelect`
- `EvidenceSelect`
- `TruthTimeline`
- `TruthReveal`
- `ScoreBoard`

### `src/layouts/`

- `MainLayout`：首页、剧本库、剧本详情使用。
- `GameLayout`：房间、角色选择、游戏、搜证、线索、推理、揭晓使用。

### `src/data/`

C 维护的 Mock 数据：

- `scripts.ts`：剧本列表与详情
- `characters.ts`：角色公开信息与秘密
- `clues.ts`：线索、地点、幕次
- `rooms.ts`：Mock 房间状态（可选）

A/B 不直接改这里，只通过 `src/api` 或 hooks 读取。

### `src/api/`

C 维护的所有请求封装：

- `client.ts`
- `scripts.ts`
- `rooms.ts`
- `ai.ts`

页面和组件里禁止直接 `fetch`。

### `src/hooks/`

- A：`useScripts.ts`、`useDebounce.ts`
- B：`useRoom.ts`、`useGame.ts`、`useCountdown.ts`
- 公共 hook 修改前先在群里说。

### `src/styles/`

只允许两个全局样式文件：

- `index.css`：Tailwind 指令
- `theme.css`：颜色、字体、间距、圆角、阴影 token

组件样式一律用 Tailwind class，不写独立 CSS 文件。

### `tests/`

- `tests/unit/`：状态机、工具函数、hooks
- `tests/e2e/`：Playwright 主流程
- C 维护测试配置；A/B 为自己的页面补测试。

### `assets/`

- 剧本封面
- 庄园地图
- 演示截图/视频封面
- 不放大文件；单文件 < 5 MiB，遵守远程仓库规范。

---

## 4. 开发顺序与提交节奏

严格按下面顺序做，不要从游戏房间开始：

```text
01 项目框架
 ↓
02 视觉系统
 ↓
03 首页
 ↓
04 剧本库
 ↓
05 剧本详情
 ↓
06 角色选择
 ↓
07 游戏房间
 ↓
08 搜证
 ↓
09 我的线索
 ↓
10 最终推理
 ↓
11 真相揭晓
 ↓
12 UI/UX 统一优化
```

每个阶段一个分支、一个 PR：

| 阶段 | 建议分支 | 交付物 |
| --- | --- | --- |
| 1 | `feat/frontend-scaffold` | Vite + TS + Router + Tailwind + 空页面 |
| 2 | `feat/design-system` | 设计 token + UI 基础组件 |
| 3 | `feat/home` | 首页 |
| 4 | `feat/script-library` | 剧本库 + mock 数据 |
| 5 | `feat/script-detail` | 剧本详情 |
| 6 | `feat/room-role-select` | 房间 + 角色选择 |
| 7 | `feat/game-room` | 游戏房间 |
| 8 | `feat/investigation` | 搜证 |
| 9 | `feat/clue-book` | 我的线索 |
| 10 | `feat/final-reasoning` | 最终推理 |
| 11 | `feat/truth-reveal` | 真相揭晓 |
| 12 | `feat/ui-polish` | Loading / Empty / Error / 响应式 / 动画 |

---

## 5. 每个阶段的验收标准

### 阶段 1：项目框架

- [ ] `npm run dev` 能启动
- [ ] 10 个路由都能打开占位页面
- [ ] 没有控制台报错
- [ ] Tailwind 生效

### 阶段 2：视觉系统

- [ ] `theme.css` 定义颜色、字体、圆角、阴影
- [ ] `Button` / `Card` / `Modal` / `Tag` / `Avatar` / `Panel` 可用
- [ ] 所有组件支持 `className` 扩展
- [ ] 页面开始复用统一组件

### 阶段 3：首页

- [ ] Navbar + Hero + 推荐剧本 + 游戏特色 + AI DM 介绍 + Footer
- [ ] Hero 有两个 CTA：开始游戏 / 探索剧本
- [ ] 390px 和 1440px 都不横向溢出

### 阶段 4：剧本库

- [ ] 搜索框可用
- [ ] 类型筛选：全部 / 硬核 / 情感 / 恐怖 / 欢乐
- [ ] 剧本卡片包含封面、标题、人数、时长、难度
- [ ] 无结果时有 EmptyState

### 阶段 5：剧本详情

- [ ] 封面、名称、人数、时长、难度
- [ ] 故事简介、标签、推荐理由
- [ ] 创建房间按钮
- [ ] 数据来自 mock，不依赖后端

### 阶段 6：角色选择

- [ ] 显示所有角色卡片
- [ ] 已被选角色不可再选
- [ ] 点击角色显示公开介绍
- [ ] **不显示秘密**
- [ ] 准备 / 开始按钮状态正确

### 阶段 7：游戏房间

- [ ] 顶部：剧本名、当前幕、时间
- [ ] 左侧：剧情 / 玩家 / 线索
- [ ] 右侧：AI DM 面板
- [ ] 底部：我的角色 / 我的线索 / 我的任务
- [ ] 刷新后能恢复当前房间（Mock 阶段用 localStorage）

### 阶段 8：搜证

- [ ] 庄园地图可点击
- [ ] 地点内显示可调查点
- [ ] 点击调查点弹出线索
- [ ] 已发现线索有标记
- [ ] 只显示当前玩家有权限看到的线索

### 阶段 9：我的线索

- [ ] 分类：全部 / 关键 / 人物 / 地点 / 时间
- [ ] 线索详情包含发现地点、发现时间、内容
- [ ] 私密线索只对本人可见
- [ ] 空状态、加载状态

### 阶段 10：最终推理

- [ ] 凶手、时间、地点、手法、动机、关键证据
- [ ] 必填校验
- [ ] 提交后有 Loading / 成功反馈
- [ ] 不直接显示答案

### 阶段 11：真相揭晓

- [ ] 案件真相时间线
- [ ] 关键事件与隐藏秘密
- [ ] 真正凶手
- [ ] 推理完成度评分
- [ ] 有动画但不阻塞演示

### 阶段 12：UI/UX

- [ ] 所有页面有 Loading / Empty / Error
- [ ] 按钮点击有反馈
- [ ] 390px / 1440px 无横向滚动
- [ ] 字体层级统一
- [ ] 卡片、间距、圆角统一
- [ ] 没有重复的按钮/颜色/组件

---

## 6. 如果时间不够，按这个顺序砍

**必须保留：**

```text
首页 → 剧本库 → 剧本详情 → 角色选择 → 游戏房间 → 搜证 → 最终推理 → 真相揭晓
```

**可以砍：**

- 登录、个人中心、好友、排行榜
- 支付、评论、分享
- 复杂动画、音效、背景音乐
- 真实 AI DM（先用 Mock 文案）
- 多剧本完整剧情（只保留 1 个完整剧本 + 3 个卡片）

---

## 7. 上传到远程仓库前的检查

- [ ] 没有 `node_modules/`、`.env`、构建产物
- [ ] 没有把 `src/` 改名为 `frontend/`
- [ ] 所有页面在 `src/pages/`
- [ ] 所有请求在 `src/api/`
- [ ] 所有共享类型在 `src/types/`
- [ ] 所有 Mock 数据在 `src/data/`
- [ ] 所有全局样式在 `src/styles/`
- [ ] 测试在 `tests/`
- [ ] 素材在 `assets/`
- [ ] 单文件 < 5 MiB
- [ ] `npm run build` 通过
- [ ] 主流程能演示

---

## 8. 和远程仓库的对应关系

| 本地目录 | 远程仓库目录 | 说明 |
| --- | --- | --- |
| `src/` | `src/` | 前端源码 |
| `tests/` | `tests/` | 测试 |
| `assets/` | `assets/` | 图片与演示素材 |
| `docs/` | `docs/` | 方案、架构、分工、演示脚本 |
| `server/` | 暂定 `src/server/` | 后端最终迁入 `src/`，避免根目录分叉 |

> 上传时只提交 `src/`、`tests/`、`assets/`、`docs/` 和根目录配置文件；
> 不提交 `node_modules/`、`.env`、`dist/`、本地数据库文件。
