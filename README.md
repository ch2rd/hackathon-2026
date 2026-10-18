# 真相局

> 一个让玩家在线进入角色、获取独立线索并共同推理的沉浸式剧本杀 Web 平台。

[![CI](https://github.com/ch2rd/hackathon-2026/actions/workflows/ci.yml/badge.svg)](https://github.com/ch2rd/hackathon-2026/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

- **参赛赛道**：待填写
- **团队名称**：待填写
- **团队成员**：A（产品 + UI）、B（游戏交互）、C（后端 + 数据 + 集成 + AI）
- **提交版本**：v0.1.0（见 [CHANGELOG.md](CHANGELOG.md)）
- **演示视频**：待填写链接
- **在线 Demo**：待填写链接

---

## 一、项目简介

《真相局》是一个三人协作的剧本杀 Web MVP。玩家进入房间后各自认领角色，获得**只属于自己的秘密和私密线索**，在公开线索的共同推理中投票指认凶手，并可用 AI 推理助手整理思路。

核心是「**独立线索 + 共同推理**」：每个人看到的信息不同，真相只能靠讨论拼出来。

## 二、核心亮点

1. **沉浸式角色体验**：角色秘密与私密线索只对本人可见，服务端绝不把凶手字段下发前端。
2. **Mock-first 可独立演示**：`VITE_USE_MOCK=true` 时无需后端即可完整跑通一局，多标签页可同屏演示。
3. **AI 推理可降级**：AI 无 Key / 超时 / 报错时自动降级为确定性 Mock，绝不阻塞主流程。

## 三、快速开始

> 环境要求：Node.js ≥ 22、npm ≥ 10。（`check:scripts` / `smoke:api` 依赖
> `--experimental-strip-types`，Node 22.6 起才有；跑前端和后端本身 20 就够。）

```bash
# 1. 克隆
git clone https://github.com/ch2rd/hackathon-2026.git
cd hackathon-2026

# 2. 安装依赖
npm install

# 3. 配置环境变量（复制后按需修改，切勿提交 .env）
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env

# 4. 启动（前端 + API 一起）
npm run dev
```

- 前端：<http://localhost:5173>
- API：<http://localhost:3001>（健康检查 `/api/health`）

**不需要初始化数据库**，原因见 [3.6](#36-关于数据库)。

默认 `VITE_USE_MOCK=true`，没有后端、没有 AI Key 也能完整演示一局。

> **Windows 提示**：自检脚本是 POSIX shell，请用 Git 自带 bash 执行，例如
> `& 'C:\Program Files\Git\bin\bash.exe' scripts/verify.sh`。
> 本机直接敲 `bash` 可能命中 WSL 占位程序，导致看不到脚本输出。
> 更多说明见 [CONTRIBUTING.md 第七节](CONTRIBUTING.md)。

### 3.1 两种运行模式

| 模式 | 开关 | 数据来源 | 用途 |
| --- | --- | --- | --- |
| Mock（默认） | `VITE_USE_MOCK=true` | 浏览器 `localStorage` + `data/scripts/*.json` | 没有后端也能完整演示；多标签页可同屏演一局 |
| 真实 | `VITE_USE_MOCK=false` | Express + `.data/rooms.json` | 联调、验收 |

切换真实模式：把 `.env` 里的 `VITE_USE_MOCK` 改成 `false`，然后**重启** `npm run dev`
（Vite 只在启动时读 env）。

两种模式下前端调的是同一组函数、同一套错误码，A/B 的页面代码不用改一行。

### 3.2 联调要点（A/B 看这里）

- 前端只请求相对路径 `/api/...`。Vite 已配好代理到 `http://localhost:3001`，
  **不要把 `localhost:3001` 写死在前端代码里**。
- 后端是否活着：浏览器打开 <http://localhost:3001/api/health>，应返回 `{"data":{"ok":true}}`。
- 只要后端：`npm run dev:api`；只要前端：`npm run dev:web`。
- 后端已开 CORS，走代理不会有跨域问题；如果出现跨域，基本是绕过了代理直连 3001。
- 演示多人：Mock 模式开多个标签页，各自输入同一个 6 位房间号即可（localStorage 共享）。

### 3.3 新增一个剧本（不需要改代码）

1. 按 [docs/script-format.md](docs/script-format.md) 写一个 JSON；
2. 文件名必须等于里面的 `script.id`，丢进 `data/scripts/`；
3. 跑一次 `npm run check:scripts` 确认数据合规；
4. 前端刷新页面即可看到；后端有进程内缓存，**重启一次 `dev:api`** 才会读到新文件。

`characters` / `acts` / `clues` 写成空数组 `[]` 就是「即将开放」：能上架、能看详情，但开不了局。

### 3.4 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 前端 + 后端一起起 |
| `npm run dev:web` | 只起前端（5173） |
| `npm run dev:api` | 只起后端（3001） |
| `npm run typecheck` | 三份 tsconfig 全量类型检查 |
| `npm run check:scripts` | 校验 `data/scripts/*.json` |
| `npm run smoke:api` | 真实后端端到端验收（先起 `dev:api`，走完一整局） |
| `npm test` | vitest 回归测试（剧本数据 + 全流程状态机） |
| `npm run build` | 类型检查 + 剧本校验 + 打包 |

### 3.5 清空演示数据

- Mock 模式：浏览器控制台执行
  `localStorage.removeItem('truth-bureau/mock-state/v1')`
- 真实模式：删掉 `.data/rooms.json`，重启后端

### 3.6 关于数据库

- **剧本内容不入库**：前后端都直接读 `data/scripts/*.json`，所以新增剧本不需要 seed，
  也不会出现「文件改了库没改」的漂移。
- **房间 / 玩家 / 投票**存在 `.data/rooms.json`，首次写入时自动创建，已 gitignore。
- `prisma/schema.prisma` 已按 [AGENTS.md](AGENTS.md) §4 建好，作为后续迁移目标。
  当前环境里 Prisma 引擎是独立子进程、无法启动，所以存储层先用零依赖实现，
  替换面收敛在 `src/server/store/roomStore.ts` 一个文件。
- 因此 `npm run db:push` / `npm run db:seed` 目前**不是必需步骤**。

### 3.7 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| `spawn EPERM`，`vite` / `tsx` / `vitest` 起不来 | 受限环境（沙箱、公司安全策略、部分杀软）禁止 Node 拉子进程。把项目目录加白名单，或换一台普通机器 |
| 改了剧本 JSON 但接口没变 | 后端有进程内缓存，重启 `npm run dev:api`；前端刷新页面即可 |
| 端口被占用 | 改 `.env` 的 `PORT`，同时改 `vite.config.ts` 里 `/api` 代理的目标端口 |
| 房间号进不去 | 房间号是 6 位大写，已去掉易混的 `0 O 1 I`；核对时注意别输成字母 O 或数字 0 |
| 浏览器提示连不上后端 | 先看 <http://localhost:3001/api/health>；真实模式下后端没起会报 `NETWORK_ERROR` |

### 3.8 组内共享版本与多人联机

本次共享分支为 `feat/shared-game-flow`，已合并当前 `main` 的场景探索、角色画像、出场动画及讨论确认规则。
组员首次获取：

```bash
git clone --branch feat/shared-game-flow https://github.com/ch2rd/hackathon-2026.git
cd hackathon-2026
npm ci
cp .env.example .env
npm run dev
```

已有本地仓库且工作区干净时，运行 `git fetch origin`，再运行 `git switch feat/shared-game-flow`；后续在该分支运行 `git pull --ff-only`。
Windows PowerShell 复制配置使用 `Copy-Item .env.example .env`。拉取到自己的源码副本可各自开发；每次启动前确认当前分支。

**完整流程**：创建/加入房间 → 选角准备 → 人物动画 → 阅读自己的故事、秘密与任务 → 每人确认已读 → 公聊自我介绍 → 场景搜证 → 公聊/双人私聊 → 全员确认讨论完成 → 房主下一幕或最终投票 → 结局。
四个剧本共 22 位角色有独立故事。公聊可分享线索，分享私密线索需再次确认；私聊只有双方可见。
新建一局可以体验完整的新流程，旧房间保留原来的进度。背景、秘密和个人任务可在游戏页展开回看。

**多台电脑一起进入同一房间**：由一位组员作为服务主机，在该主机 `.env` 设置 `VITE_USE_MOCK=false`，然后分别在两个终端运行：

```bash
npm run dev:api
npm run dev:web -- --host 0.0.0.0
```

其他组员连接同一局域网，打开 `http://主机的局域网IP:5173`，使用同一个六位房间号加入。
浏览器请求仍经 Vite 的 `/api` 代理到该主机的后端，所有人共享该主机的房间、阅读进度、投票和聊天；主机需保持两个终端运行，并允许本地网络访问前端端口 5173。
修改 `.env` 后需重启前端；不要把主机的 `.env` 或 `.data/rooms.json` 提交到 GitHub。

`VITE_USE_MOCK=true` 适用于同一浏览器多标签页演示；不同电脑的 localStorage 相互独立，Mock 模式无法共享同一个房间。

## 四、技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 18 + TypeScript + Vite 5 + React Router 6 |
| 状态 | Zustand |
| 样式 | Tailwind CSS 3 + lucide-react |
| 后端 | Node.js 20 + Express 4 + TypeScript + Zod |
| 存储 | 房间/玩家/投票落本地 JSON 文件；Prisma + SQLite 为迁移目标（schema 已建，见 [3.6](#36-关于数据库)） |
| AI | OpenAI API（服务端调用，无 Key 自动降级 Mock） |

## 五、目录结构

```text
.
├── AGENTS.md                # 唯一事实源：技术栈 / 分工 / 数据模型 / API 契约
├── README.md                # 本文件：评审第一入口
├── CONTRIBUTING.md          # 分支、提交、评审规范
├── docs/                    # product / game-flow / api / demo-script 等
├── src/                     # 前端源码（pages / components / stores / api / mocks / types …）
├── src/server/                  # Express 后端（routes / services / store / middleware）
├── prisma/                  # schema：房间等运行时状态的迁移目标
├── data/scripts/            # 剧本数据源，一个剧本一个 JSON（见 docs/script-format.md）
├── tests/                   # vitest 回归测试
├── .data/                   # 本地房间状态文件（自动生成，已 gitignore）
├── assets/                  # 图片、演示文稿、视频封面等静态资源
├── scripts/                 # 仓库自检与开发脚本
└── .github/                 # Issue / PR 模板、CI、代码属主
```

## 六、团队分工

| 角色 | 主责 | 分支 |
| --- | --- | --- |
| A | 产品 + 前端 UI（首页、剧本库、剧本详情、角色档案、设计系统、演示脚本） | `feat/a-ui` |
| B | 前端交互 + 游戏逻辑（房间、选角、剧情、线索、投票、结局、状态机） | `feat/b-game` |
| C | 后端 + 数据 + 集成 + AI（类型、API、Mock、Express、Prisma、AI 降级） | `feat/c-backend` |

完整分工、文件所有权、时间节奏见 [AGENTS.md](AGENTS.md)。

## 七、提交与评审

- 提交前的完整检查项：见 [docs/submission-checklist.md](docs/submission-checklist.md)。
- 评分维度逐条对应：见 [docs/scoring.md](docs/scoring.md)。
- 演示流程：见 [docs/demo-script.md](docs/demo-script.md)。
- 远程仓库与队员协作：见 [docs/collaboration.md](docs/collaboration.md)。

## 八、开源协议

本项目基于 [MIT](LICENSE) 协议开源。所使用的第三方库、数据集、素材的授权情况见 [ATTRIBUTIONS.md](ATTRIBUTIONS.md)。
