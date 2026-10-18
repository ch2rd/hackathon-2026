#!/usr/bin/env bash
# ============================================================
# 提交信息规范校验（Conventional Commits）
#
# 用法：
#   bash scripts/check-commit-msg.sh --file  <消息文件>      # 供 commit-msg 钩子调用
#   bash scripts/check-commit-msg.sh --text  "<消息文本>"    # 校验任意一行文本（如 PR 标题）
#   bash scripts/check-commit-msg.sh --range <from>..<to>    # 校验提交区间，默认 HEAD
#
# 退出码：0 通过；1 存在不合规提交
# ============================================================
set -uo pipefail

TYPES='feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
RE='^('"$TYPES"')(\([a-z0-9._/-]+\))?!?: .+'
MAX_SUBJECT=72
HINT='格式：<类型>(<范围>): <说明>    例：feat(asr): 接入本地语音识别模型'

MODE=""
VALUE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --file)  MODE="file";  VALUE="${2:-}"; shift 2 ;;
    --text)  MODE="text";  VALUE="${2:-}"; shift 2 ;;
    --range) MODE="range"; VALUE="${2:-HEAD}"; shift 2 ;;
    --help|-h)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) printf '未知参数：%s\n' "$1" >&2; exit 2 ;;
  esac
done

if [ -z "$MODE" ]; then
  MODE="range"
  VALUE="HEAD"
fi

RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; RST=$'\033[0m'
FAIL=0
OK=0

# 返回 0 通过；返回 1 不合规（原因打到 stdout）
validate_subject() {
  local subject="$1"
  local label="${2:-提交信息}"

  subject="${subject%"${subject##*[![:space:]]}"}"   # 去尾部空白

  [ -n "$subject" ] || { printf '  %s[FAIL]%s %s 为空\n' "$RED" "$RST" "$label"; return 1; }

  case "$subject" in
    "Merge "*)  printf '  %s[SKIP]%s %s 为合并提交，跳过\n' "$YEL" "$RST" "$label"; return 0 ;;
    fixup!*|squash!*|amend!*)
                printf '  %s[FAIL]%s %s 是 fixup/squash 提交，合并前请压缩：%s\n' "$RED" "$RST" "$label" "$subject"; return 1 ;;
    "Revert "*) printf '  %s[ OK ]%s %s 为回滚提交\n' "$GRN" "$RST" "$label"; return 0 ;;
    WIP*|wip*)  printf '  %s[FAIL]%s %s 不允许 WIP 提交，请改为规范信息或使用临时分支\n' "$RED" "$RST" "$label"; return 1 ;;
  esac

  if ! printf '%s' "$subject" | LC_ALL=C grep -qE "$RE"; then
    printf '  %s[FAIL]%s %s 不符合规范：%s\n' "$RED" "$RST" "$label" "$subject"
    printf '         %s\n' "$HINT"
    return 1
  fi

  local len=${#subject}
  if [ "$len" -gt "$MAX_SUBJECT" ]; then
    printf '  %s[WARN]%s %s 标题长度 %s，建议不超过 %s（中文换算后按字符数计）\n' \
      "$YEL" "$RST" "$label" "$len" "$MAX_SUBJECT"
  fi

  case "$subject" in
    *。) printf '  %s[WARN]%s %s 结尾不应带句号\n' "$YEL" "$RST" "$label" ;;
    *.)  printf '  %s[WARN]%s %s 结尾不应带句号\n' "$YEL" "$RST" "$label" ;;
  esac

  printf '  %s[ OK ]%s %s 合规：%s\n' "$GRN" "$RST" "$label" "$subject"
  return 0
}

case "$MODE" in
  file)
    if [ ! -f "$VALUE" ]; then
      printf '%s[FAIL]%s 找不到提交信息文件：%s\n' "$RED" "$RST" "$VALUE"
      exit 1
    fi
    subject="$(LC_ALL=C grep -vE '^[[:space:]]*#' "$VALUE" 2>/dev/null | LC_ALL=C grep -m1 -vE '^[[:space:]]*$' || true)"
    validate_subject "$subject" "提交信息" || FAIL=$((FAIL + 1))
    ;;
  text)
    validate_subject "$VALUE" "文本" || FAIL=$((FAIL + 1))
    ;;
  range)
    if ! git rev-parse --verify -q "$VALUE" >/dev/null 2>&1 && \
       ! git rev-parse --verify -q "${VALUE%%..*}" >/dev/null 2>&1; then
      printf '%s[FAIL]%s 无效的提交区间：%s\n' "$RED" "$RST" "$VALUE"
      exit 1
    fi
    if ! git rev-parse --verify -q HEAD >/dev/null 2>&1; then
      printf '  %s[SKIP]%s 仓库尚无提交，跳过提交信息校验\n' "$YEL" "$RST"
      exit 0
    fi
    while IFS=$'\t' read -r sha subject; do
      [ -n "${sha:-}" ] || continue
      validate_subject "$subject" "提交 ${sha:0:7}" || FAIL=$((FAIL + 1))
    done < <(git log --format='%H%x09%s' "$VALUE" 2>/dev/null || true)
    ;;
esac

printf '\n提交信息校验：不合规 %s 条\n' "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf '修正方式：git commit --amend -m "<类型>(<范围>): <说明>"；涉及多个提交时用 git rebase -i 修改。\n'
  printf '本地自查：bash scripts/check-commit-msg.sh --range HEAD\n'
  exit 1
fi
printf '全部合规。\n'
exit 0
