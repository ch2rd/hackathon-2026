# 变更日志

本文件记录本项目的所有重要变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

分类说明：`新增`（Added）、`变更`（Changed）、`弃用`（Deprecated）、`移除`（Removed）、`修复`（Fixed）、`安全`（Security）。

## [Unreleased]

### 新增

- 引入 [AGENTS.md](AGENTS.md)（《真相局》项目协作说明书）作为唯一事实源：技术栈、A/B/C 分工、7 页面、数据模型、API 契约、Mock-first 策略与时间节奏。
- 新增 `docs/product.md`、`docs/game-flow.md`、`docs/api.md`、`docs/demo-script.md`。
- 新增 `docs/architecture.md`：技术栈、Mock-first、端口代理、模块边界展开。

### 变更

- 文档重组：`docs/01~07` 中文编号模板 → AGENTS.md 指定的英文命名（`product` / `game-flow` / `api` / `demo-script` / `architecture` / `scoring` / `submission-checklist` / `collaboration`）。
- `CONTRIBUTING.md` 分支模型对齐 AGENTS.md：`feat/a-ui`、`feat/b-game`、`feat/c-backend`，改为 30 分钟 commit / 2 小时集成。
- `README.md`、`.env.example`、`src/README.md` 对齐《真相局》技术栈与 Mock-first 策略。
- 仓库自检脚本 `scripts/check-repo.sh` 必需文件清单同步更新。

### 修复

- 无。

## [0.1.0] - 2026-10-18

### 新增

- 仓库初始化，建立 `main` 分支与基础目录结构。
- 引入 MIT 开源协议与第三方资源声明文件。
- 建立仓库自检脚本 `scripts/check-repo.sh` 与提交信息校验 `scripts/check-commit-msg.sh`。

[Unreleased]: https://github.com/ch2rd/hackathon-2026/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ch2rd/hackathon-2026/releases/tag/v0.1.0
