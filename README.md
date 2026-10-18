# 黑客松（项目名待定）

> 一句话说清这个项目解决谁的什么问题。

[![CI](https://github.com/ch2rd/hackathon-2026/actions/workflows/ci.yml/badge.svg)](https://github.com/ch2rd/hackathon-2026/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

- **参赛赛道**：待填写
- **团队名称**：待填写
- **团队成员**：待填写
- **提交版本**：v0.1.0（见 [CHANGELOG.md](CHANGELOG.md)）
- **演示视频**：待填写链接
- **在线 Demo**：待填写链接

---

## 一、项目简介

用 3～5 行说明：痛点是什么、我们的方案是什么、凭什么比现有做法好。

## 二、核心亮点

1. **亮点一**：一句话 + 一句证据（数据、截图、Demo 链接）。
2. **亮点二**：同上。
3. **亮点三**：同上。

## 三、快速开始

> 环境要求：待填写（例如 Node.js ≥ 22 / Python ≥ 3.11）。

```bash
# 1. 克隆
git clone https://github.com/ch2rd/hackathon-2026.git
cd hackathon-2026

# 2. 配置环境变量（复制后填入自己的值，切勿提交 .env）
cp .env.example .env

# 3. 安装依赖（按实际技术栈替换这一行）
make install

# 4. 启动
make run
```

启动后访问：待填写。

> **Windows 提示**：自检脚本是 POSIX shell，请用 Git 自带 bash 执行，例如
> `& 'C:\Program Files\Git\bin\bash.exe' scripts/verify.sh`。
> 本机直接敲 `bash` 可能命中 WSL 占位程序，导致看不到脚本输出。
> 更多说明见 [CONTRIBUTING.md 第七节](CONTRIBUTING.md)。

## 四、目录结构

```text
.
├── README.md               # 本文件：评审第一入口
├── CONTRIBUTING.md         # 分支、提交、评审规范
├── CHANGELOG.md            # 版本变更记录
├── ATTRIBUTIONS.md         # 第三方资源与开源引用声明
├── docs/                   # 竞赛材料：方案 / 架构 / 评审对照 / 提交清单 / 演示脚本
├── src/                    # 源码（按实际技术栈展开）
├── tests/                  # 测试
├── assets/                 # 图片、演示文稿、视频封面等静态资源
├── scripts/                # 仓库自检与开发脚本
└── .github/                # Issue / PR 模板、CI、代码属主
```

## 五、团队分工

| 成员 | 角色 | 负责模块 | 联系方式 |
| --- | --- | --- | --- |
| 待填写 | 待填写 | 待填写 | 待填写 |

详细的模块拆解与时间线见 [docs/06-团队分工与排期.md](docs/06-团队分工与排期.md)。

## 六、提交与评审

- 提交前的完整检查项：见 [docs/04-提交清单.md](docs/04-提交清单.md)。
- 评分维度逐条对应：见 [docs/03-评审对照表.md](docs/03-评审对照表.md)。
- 演示流程：见 [docs/05-演示脚本.md](docs/05-演示脚本.md)。
- 远程仓库与队员协作：见 [docs/07-远程仓库与协作.md](docs/07-远程仓库与协作.md)。

## 七、开源协议

本项目基于 [MIT](LICENSE) 协议开源。所使用的第三方库、数据集、素材的授权情况见 [ATTRIBUTIONS.md](ATTRIBUTIONS.md)。
