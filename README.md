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

> 环境要求：Node.js ≥ 20、npm ≥ 10。

```bash
# 1. 克隆
git clone https://github.com/ch2rd/hackathon-2026.git
cd hackathon-2026

# 2. 配置环境变量（复制后填入自己的值，切勿提交 .env）
cp .env.example .env

# 3. 安装依赖
npm install

# 4. 初始化本地数据库
npm run db:push
npm run db:seed

# 5. 启动（前端 + API 一起）
npm run dev
```

- 前端：<http://localhost:5173>
- API：<http://localhost:3001>

默认 `VITE_USE_MOCK=true`，没有后端、没有 AI Key 也能完整演示。

> **Windows 提示**：自检脚本是 POSIX shell，请用 Git 自带 bash 执行，例如
> `& 'C:\Program Files\Git\bin\bash.exe' scripts/verify.sh`。
> 本机直接敲 `bash` 可能命中 WSL 占位程序，导致看不到脚本输出。
> 更多说明见 [CONTRIBUTING.md 第七节](CONTRIBUTING.md)。

## 四、技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 18 + TypeScript + Vite 5 + React Router 6 |
| 状态 | Zustand |
| 样式 | Tailwind CSS 3 + lucide-react |
| 后端 | Node.js 20 + Express 4 + TypeScript + Zod |
| 数据库 | Prisma + SQLite（本地 Demo） |
| AI | OpenAI API（服务端调用，无 Key 自动降级 Mock） |

## 五、目录结构

```text
.
├── AGENTS.md                # 唯一事实源：技术栈 / 分工 / 数据模型 / API 契约
├── README.md                # 本文件：评审第一入口
├── CONTRIBUTING.md          # 分支、提交、评审规范
├── docs/                    # product / game-flow / api / demo-script 等
├── src/                     # 前端源码（pages / components / stores / api / types …）
├── server/                  # Express 后端（routes / services / middleware）
├── prisma/                  # schema 与种子数据
├── data/                    # 种子数据源
├── tests/                   # 测试
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
