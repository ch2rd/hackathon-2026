# 贡献指南

本仓库按黑客松竞赛节奏设计：**能让评审看懂、能让队友接得上**，比写得多更重要。以下规则请全队遵守。

## 一、分支模型

| 分支 | 用途 | 说明 |
| --- | --- | --- |
| `main` | 唯一可演示分支 | 始终可运行、可演示；禁止直接 push，一律走 PR |
| `feat/<简短描述>` | 新功能 | 例：`feat/voice-input` |
| `fix/<简短描述>` | 缺陷修复 | 例：`fix/typo-in-readme` |
| `docs/<简短描述>` | 文档 / 演示材料 | 例：`docs/demo-script` |
| `chore/<简短描述>` | 构建、依赖、配置 | 例：`chore/setup-ci` |

规范：

1. 分支名统一小写，用连字符分隔，禁止中文与空格。
2. 单个分支生命周期不超过 24 小时；黑客松期间尽量 12 小时内合回 `main`。
3. 每完成一个可演示的小功能就合并一次，避免最后一天集中解决冲突。
4. 合并后即时删除远端分支。

## 二、提交信息规范

采用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 格式：

```text
<类型>(<范围>): <简短说明>

<可选正文：为什么这么改，而不是改了什么>

<可选脚注：Closes #12>
```

允许的类型：

| 类型 | 含义 |
| --- | --- |
| `feat` | 新增功能 |
| `fix` | 修复缺陷 |
| `docs` | 文档变更 |
| `style` | 仅格式（不影响逻辑） |
| `refactor` | 重构（非新增、非修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统或依赖 |
| `ci` | CI 配置 |
| `chore` | 其他杂项 |
| `revert` | 回滚 |

示例：

```text
feat(asr): 接入本地语音识别模型

云端 API 在赛题内网环境下不可达，改为本地量化模型，首字延迟从 1.2s 降到 320ms。

Closes #8
```

约束：

- 标题不超过 72 个字符，结尾不加句号。
- 不使用「update」「修改一下」这类无信息量的标题。
- 一次提交只做一件事，不要把格式化与逻辑改动混在一起。

本地启用提交信息校验钩子：

```bash
bash scripts/install-hooks.sh
# 之后不合规的提交信息会被直接拒绝
```

## 三、拉取请求（PR）流程

1. 从最新 `main` 切出分支：`git switch -c feat/your-feature main`。
2. 提交前在本地跑通自检：

   ```bash
   bash scripts/verify.sh
   ```

3. 推送并开 PR，按模板填完所有小节；标题同样遵循提交信息规范。
4. 至少 1 名队友 Review 通过（`CODEOWNERS` 指定的属主为必选评审人）。
5. CI 全绿后才能合并，合并方式统一使用 **Squash and merge**。
6. 合并后同步本地：`git switch main && git pull --ff-only`。

## 四、代码评审清单

评审人请逐条确认：

- [ ] 功能在本机能跑通，且不破坏 `main` 上的既有演示路径。
- [ ] 没有提交密钥、账号、`.env`、个人数据（见 `scripts/check-repo.sh`）。
- [ ] 新增依赖已登记到 `ATTRIBUTIONS.md`，并确认授权允许竞赛使用。
- [ ] 涉及赛题评分点的改动，已同步更新 `docs/03-评审对照表.md`。
- [ ] 面向使用者的行为变化，已同步更新 `README.md` 或 `CHANGELOG.md`。
- [ ] 命名与注释让陌生人能读懂；无大段注释掉的死代码。

## 五、目录与文件约定

- 源码放 `src/`，测试放 `tests/`，静态素材放 `assets/`。
- 仓库内文件编码统一 **UTF-8（无 BOM）**，换行统一 **LF**（由 `.gitattributes` 强制）。
- 单个文件不超过 **5 MiB**；二进制大文件走 Git LFS 或外链，不要直接提交。
- 不提交 `node_modules/`、`dist/`、`build/`、模型权重、原始数据集。

## 六、提交物与截止

黑客松的最终提交物清单、检查顺序和截止时间见 [docs/04-提交清单.md](docs/04-提交清单.md)。**截止前 2 小时冻结 `main`**，只允许修演示阻塞级缺陷。

## 七、Windows 本地环境提示

自检脚本是 POSIX shell，Windows 上请用 **Git 自带的 bash** 执行：

```powershell
# 在 PowerShell / CMD 中（路径按本机实际安装位置调整）
& 'C:\Program Files\Git\bin\bash.exe' scripts/verify.sh
```

```text
# 或者直接在「Git Bash」窗口里
bash scripts/verify.sh
```

**不要直接敲 `bash`**：若本机装了 WSL 且未初始化，`C:\Windows\System32\bash.exe` 会抢占这个名字，你会看到「适用于 Linux 的 Windows 子系统没有已安装的分发」而不是我们的脚本输出。

关于 Git 钩子（`.githooks/`）：

- 钩子**默认不启用**，这样在受限环境（例如沙箱化的编辑器/代理终端）里 `git commit` 一定可用。
- 需要启用时执行 `bash scripts/install-hooks.sh`，它会设置 `core.hooksPath=.githooks`。
- 部分受限环境下 MSYS 的 `sh` 无法启动（报 `couldn't create signal pipe`），此时启用钩子会导致**每次 `git commit` 都失败**。遇到这种情况先撤销：

  ```bash
  git config --local --unset core.hooksPath
  ```

- 提交信息校验不依赖钩子也能做：`bash scripts/check-commit-msg.sh --range HEAD`。CI 也一定会跑一遍。

`Makefile` 是可选入口；本机没有 `make` 时直接调用 `bash scripts/*.sh` 即可，效果相同。
