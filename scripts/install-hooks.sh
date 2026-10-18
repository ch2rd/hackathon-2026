#!/usr/bin/env bash
# ============================================================
# 安装本地 Git 钩子（把 .githooks/ 设为钩子目录）
#
# 用法：bash scripts/install-hooks.sh
# 撤销：git config --local --unset core.hooksPath
# ============================================================
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1

if [ ! -d .githooks ]; then
  printf '找不到 .githooks 目录，请在仓库根目录执行。\n' >&2
  exit 1
fi

git config --local core.hooksPath .githooks
printf '已将 core.hooksPath 设为 .githooks\n'

chmod +x .githooks/* 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true

printf '\n当前生效的钩子：\n'
for h in .githooks/*; do
  [ -f "$h" ] && printf '  - %s\n' "$(basename "$h")"
done

printf '\n现在开始：\n'
printf '  - 提交信息不符合 Conventional Commits 会被拒绝\n'
printf '  - 提交前会自动扫描密钥与 .env\n'

# 实测提示：受限环境下 MSYS 的 sh 无法启动，钩子会让每次 git commit 都失败。
case "${OS:-$(uname -s 2>/dev/null || echo unknown)}" in
  *MINGW*|*MSYS*|*CYGWIN*|Windows_NT)
    printf '\n\033[33m[Windows 注意]\033[0m 若你所在的终端是受限沙箱，MSYS 的 sh 可能无法启动\n'
    printf '  （报错 couldn'"'"'t create signal pipe），此时启用钩子会导致每次 git commit 失败。\n'
    printf '  请改用不受限的 Git Bash，或先撤销钩子：\n'
    printf '    git config --local --unset core.hooksPath\n'
    ;;
esac

printf '\n撤销命令：git config --local --unset core.hooksPath\n'
