#!/usr/bin/env bash
# ============================================================
# 一键本地自检：提交前跑这个
#
# 依次执行：
#   1. 仓库规范自检（结构 / 密钥 / 大文件 / 编码 / README）
#   2. 提交信息规范校验
#   3. 项目自定义检查（scripts/local-checks.sh，可选）
#
# 用法：bash scripts/verify.sh
# ============================================================
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1

EXIT=0
step() { printf '\n\033[1m>>> %s\033[0m\n' "$1"; }

printf '本地自检开始\n'
printf '  目录：%s\n' "$ROOT"
printf '  git ：%s\n' "$(git --version 2>/dev/null || echo '未安装')"
printf '  系统：%s\n' "$(uname -s 2>/dev/null || echo unknown)"

step "1/3 仓库规范自检"
if ! bash scripts/check-repo.sh; then
  EXIT=1
fi

step "2/3 提交信息规范校验"
if git rev-parse --verify -q HEAD >/dev/null 2>&1; then
  if ! bash scripts/check-commit-msg.sh --range HEAD; then
    EXIT=1
  fi
else
  printf '  仓库还没有提交，跳过。\n'
fi

step "3/3 项目自定义检查"
if [ -f scripts/local-checks.sh ]; then
  if ! bash scripts/local-checks.sh; then
    EXIT=1
  fi
else
  printf '  未提供 scripts/local-checks.sh，跳过。\n'
  printf '  提示：选定技术栈后，把构建、Lint、测试命令写进这个文件，本地与 CI 会同时生效。\n'
fi

printf '\n==================== 自检结论 ====================\n'
if [ "$EXIT" -eq 0 ]; then
  printf '\033[32m通过\033[0m：可以提交 / 开 PR。\n'
else
  printf '\033[31m未通过\033[0m：请修复上面的问题后重跑。\n'
fi
exit "$EXIT"
