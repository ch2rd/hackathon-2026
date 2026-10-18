#!/usr/bin/env bash
# ============================================================
# 项目自定义检查 —— 骨架阶段的挂载点
#
# 选定技术栈后，在这里填入构建 / Lint / 测试命令。
# 本文件会被 `bash scripts/verify.sh` 与 CI 的 project-checks 任务调用。
#
# 约定：
#   - 任何一步失败都要以非零退出码结束，否则等于没检查；
#   - 不要在这里写「安装依赖」以外的副作业（改文件、发请求）；
#   - 单步超过 5 分钟的命令请拆分，黑客松期间 CI 要快。
# ============================================================
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1

EXIT=0
note() { printf '  [ .. ] %s\n' "$1"; }
skip() { printf '  [SKIP] %s\n' "$1"; }

echo "项目自定义检查"

# -------------------- Node.js / TypeScript --------------------
if [ -f package.json ]; then
  if command -v pnpm >/dev/null 2>&1; then
    PM="pnpm"
  elif command -v npm >/dev/null 2>&1; then
    PM="npm"
  else
    PM=""
  fi

  if [ -z "$PM" ]; then
    printf '  [FAIL] 检测到 package.json，但没有可用的包管理器\n'
    EXIT=1
  else
    if [ ! -d node_modules ]; then
      note "安装依赖（$PM install）"
      $PM install --frozen-lockfile 2>/dev/null || $PM install || EXIT=1
    fi

    if $PM run 2>/dev/null | grep -q '^ *lint'; then
      note "运行 lint"
      $PM run lint || EXIT=1
    else
      skip "package.json 未定义 lint 脚本"
    fi

    if $PM run 2>/dev/null | grep -q '^ *test'; then
      note "运行测试"
      $PM run test || EXIT=1
    else
      skip "package.json 未定义 test 脚本"
    fi

    if $PM run 2>/dev/null | grep -q '^ *build'; then
      note "运行构建（验证可交付）"
      $PM run build || EXIT=1
    fi
  fi
fi

# -------------------- Python --------------------
if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  if command -v ruff >/dev/null 2>&1; then
    note "运行 ruff"
    ruff check . || EXIT=1
  else
    skip "未安装 ruff"
  fi
  if command -v pytest >/dev/null 2>&1 && [ -d tests ]; then
    note "运行 pytest"
    pytest -q || EXIT=1
  else
    skip "未安装 pytest 或缺少 tests/"
  fi
fi

# -------------------- Go --------------------
if [ -f go.mod ]; then
  if command -v go >/dev/null 2>&1; then
    note "go vet"
    go vet ./... || EXIT=1
    note "go test"
    go test ./... || EXIT=1
  else
    skip "未安装 go"
  fi
fi

if [ "$EXIT" -eq 0 ]; then
  echo "  [ OK ] 项目自定义检查通过（或未检测到适用的技术栈）"
fi
exit "$EXIT"
