# 变更日志

本文件记录本项目的所有重要变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

分类说明：`新增`（Added）、`变更`（Changed）、`弃用`（Deprecated）、`移除`（Removed）、`修复`（Fixed）、`安全`（Security）。

## [Unreleased]

### 新增

- **动态剧本封面**：为四个剧本制作对应故事场景的循环 SVG 封面，接入首页、剧本卡片与详情页；提供静态回退及可暂停的 `/covers/preview.html` 预览页。
- 引入 [AGENTS.md](AGENTS.md)（《真相局》项目协作说明书）作为唯一事实源：技术栈、A/B/C 分工、7 页面、数据模型、API 契约、Mock-first 策略与时间节奏。
- 新增 `docs/product.md`、`docs/game-flow.md`、`docs/api.md`、`docs/demo-script.md`。
- 新增 `docs/architecture.md`：技术栈、Mock-first、端口代理、模块边界展开。
- **共享类型与 API 契约**：`src/types/models.ts`、`src/types/api.ts`、`src/api/`（`ApiAdapter` + Mock/HTTP 双实现 + 统一 `ApiError`）。
- **Mock 适配器**：`localStorage` 持久化房间/玩家/投票，不启后端即可完整走通一局，多标签页可同屏演示。
- **真实后端**：`src/server/` 分 routes / services / store / middleware 四层，AGENTS.md §5 的 P0 端点全部实装。
- **剧本数据管线**：`data/scripts/*.json` 为唯一数据源，前后端读同一批文件；新增剧本零代码改动。
- **剧本校验器**：`src/utils/scriptSchema.ts` + `npm run check:scripts`，坏数据在构建期就被拦下。
- **AI 推理助手**：`POST /api/ai/hint` 接 OpenAI，8 秒超时，无 Key / 超时 / 结构不合规一律降级为确定性结果。
- **回归测试**：`tests/mockEngine.test.ts`，对每一本剧本跑完整对局，并校验敏感字段不外泄。
- **真实后端验收脚本**：`npm run smoke:api`，一条命令走完建房→加入→选角→开局→推进→投票→结算。
- **四本可玩剧本**：雾夜庄园、深海回音、石楼童谣、末班列车，全部满足「每个角色至少一条私密线索」。
- 新增 `docs/script-format.md`：剧本数据填写规范与当前清单。
- **真实后端端到端测试**：`tests/api.e2e.test.ts` —— 在进程内起真实 Express（随机端口 + 临时 `STORE_FILE`），覆盖安全红线、错误码契约与完整一局；`npm test` 从 16 项增至 34 项，不再依赖手动起服务。

### 变更

- 文档重组：`docs/01~07` 中文编号模板 → AGENTS.md 指定的英文命名（`product` / `game-flow` / `api` / `demo-script` / `architecture` / `scoring` / `submission-checklist` / `collaboration`）。
- `CONTRIBUTING.md` 分支模型对齐 AGENTS.md：`feat/a-ui`、`feat/b-game`、`feat/c-backend`，改为 30 分钟 commit / 2 小时集成。
- `README.md`、`.env.example`、`src/README.md` 对齐《真相局》技术栈与 Mock-first 策略。
- 仓库自检脚本 `scripts/check-repo.sh` 必需文件清单同步更新。
- 剧本内容改为静态文件，不入库：`npm run db:push` / `db:seed` 不再是必需步骤。
- 房间等运行时状态先落 `.data/rooms.json`（零依赖实现）；`prisma/schema.prisma` 已按 §4 建好作为迁移目标。
- `ApiError` 下沉到 `src/utils/apiError.ts`，供后端复用而不依赖浏览器环境。
- 状态机规则统一在 `src/mocks/mockEngine.ts`，Mock 与真实后端同源，不存在两套实现。
- 后端目录由根目录 `server/` 迁入 `src/server/`（对齐 AGENTS.md 与 PR #2 的定稿位置）；`dev:api`、`tsconfig.server.json`、文档与注释引用同步更新。
- `src/server/index.ts` 拆出 `createApp()` / `startServer()`：被 import 时不再监听端口，供测试复用；直接执行时行为不变。
- CI 的 `project-checks` 增加 `actions/setup-node@v4`（Node 22）：`check:scripts` 与 `smoke:api` 依赖 `node --experimental-strip-types`（需 ≥ 22.6），runner 自带的是 20.x。

### 安全

- 剧本列表与详情不下发 `murdererCharacterId` 与 `secret`。
- `GET /api/rooms/:roomId/context` 在真实模式下 `murdererCharacterId` 恒为 `null`，凶手只在 `ended` 状态的 `result` 里揭晓。
- 私密线索按玩家过滤，公开玩家列表不含 `secret`。

### 修复

- 投票平票时不再把「并列第一」当成定论（`topVotedCharacterId` 返回 `null`，`isCorrect` 为 `false`）。
- 补《雾夜庄园》缺失的两条私密线索（林墨、白榆），使四本剧本统一满足人均一条底牌。
- `DATABASE_URL` 里 SQLite 的相对路径是相对 `prisma/schema.prisma` 所在目录解析的，原值 `file:./prisma/dev.db` 会落到 `prisma/prisma/dev.db`；改为 `file:./dev.db`，落点恢复为 `prisma/dev.db`。
- `.gitignore` 末行曾被以 GBK 写入，导致整份文件不是合法 UTF-8（`check-repo.sh` 的编码检查与文件读取都会失败）；已重写为合法 UTF-8。

## [0.1.0] - 2026-10-18

### 新增

- 仓库初始化，建立 `main` 分支与基础目录结构。
- 引入 MIT 开源协议与第三方资源声明文件。
- 建立仓库自检脚本 `scripts/check-repo.sh` 与提交信息校验 `scripts/check-commit-msg.sh`。

[Unreleased]: https://github.com/ch2rd/hackathon-2026/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ch2rd/hackathon-2026/releases/tag/v0.1.0


## 2026-10-18 · 共享游戏流程

- 为 22 位角色补充个人故事，新增全员已读确认后进入公聊介绍。
- 搜证后支持公聊、双人私聊和主动分享线索，服务端过滤私聊接收范围。
- 保留团队主线的场景探索、动态画像、出场动画和每幕讨论确认，补充背景音效与氛围。
- 修复开发环境的 Tailwind 主题加载，以及空环境路径导致真实模式无法启动的问题。
- README 增加代码同步和局域网同房间联机步骤。
- 整合 main 的 AI DM 与悬浮推理助手，沿用共享分支统一的音频引擎，保留故事阅读和讨论阶段规则；声音按钮与助手分开显示。
- 修复 GitHub Pages 子路径下动态封面、静态回退与 AI 头像路径，补充 Pages 开启、重新发布及线上更新排查步骤。
