#!/usr/bin/env bash
# ============================================================
# 仓库规范自检（黑客松竞赛版）
#
# 检查项：
#   1. 竞赛标准文件是否齐全
#   2. 是否误提交密钥 / 凭据
#   3. 是否提交大文件与生成物
#   4. 文本文件编码（UTF-8 无 BOM）与换行（LF）
#   5. README 必备小节
#
# 用法：bash scripts/check-repo.sh
# 退出码：0 全部通过；1 存在必须修复的问题
# ============================================================
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 1

FAIL=0
WARN=0
INFO=0

pass()    { printf '  \033[32m[ OK ]\033[0m %s\n' "$1"; }
fail()    { printf '  \033[31m[FAIL]\033[0m %s\n' "$1"; FAIL=$((FAIL + 1)); }
warn()    { printf '  \033[33m[WARN]\033[0m %s\n' "$1"; WARN=$((WARN + 1)); }
info()    { printf '  \033[36m[INFO]\033[0m %s\n' "$1"; INFO=$((INFO + 1)); }
section() { printf '\n== %s ==\n' "$1"; }

printf '仓库规范自检 @ %s\n' "$ROOT"

# ------------------------------------------------------------
section "1. 竞赛标准文件"
# ------------------------------------------------------------
REQUIRED_FILES=(
  "README.md"
  "AGENTS.md"
  "LICENSE"
  ".gitignore"
  ".gitattributes"
  ".editorconfig"
  ".env.example"
  "CONTRIBUTING.md"
  "CODE_OF_CONDUCT.md"
  "SECURITY.md"
  "CHANGELOG.md"
  "ATTRIBUTIONS.md"
  "docs/product.md"
  "docs/game-flow.md"
  "docs/api.md"
  "docs/demo-script.md"
  "docs/architecture.md"
  "docs/scoring.md"
  "docs/submission-checklist.md"
  "docs/collaboration.md"
  ".github/PULL_REQUEST_TEMPLATE.md"
  ".github/CODEOWNERS"
  ".github/workflows/ci.yml"
  "scripts/verify.sh"
)
for f in "${REQUIRED_FILES[@]}"; do
  if [ -f "$f" ]; then
    pass "存在 $f"
  else
    fail "缺失 $f"
  fi
done

# ------------------------------------------------------------
section "2. 密钥与凭据"
# ------------------------------------------------------------
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  fail "检测到 .env 被纳入版本控制 —— 立即移除并轮换其中的密钥"
else
  pass "未提交 .env"
fi

HARD_PATTERNS=(
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'AKIA[0-9A-Z]{16}'
  'ASIA[0-9A-Z]{16}'
  'ghp_[A-Za-z0-9]{36}'
  'gho_[A-Za-z0-9]{36}'
  'github_pat_[A-Za-z0-9_]{20,}'
  'xox[baprs]-[A-Za-z0-9-]{10,}'
  'sk-[A-Za-z0-9]{20,}'
  'AIza[0-9A-Za-z_-]{35}'
  'LTAI[0-9A-Za-z]{12,}'
)

is_text() { LC_ALL=C grep -qI . "$1" 2>/dev/null; }

SECRET_HITS=0
while IFS= read -r -d '' f; do
  [ -f "$f" ] || continue
  case "$f" in
    scripts/check-repo.sh) continue ;;   # 本脚本自身含正则字面量
    .git/*) continue ;;
  esac
  is_text "$f" || continue
  for pat in "${HARD_PATTERNS[@]}"; do
    if LC_ALL=C grep -nIE "$pat" "$f" >/dev/null 2>&1; then
      fail "$f 命中疑似密钥规则：$pat"
      SECRET_HITS=$((SECRET_HITS + 1))
    fi
  done
done < <(git ls-files -z)

if [ "$SECRET_HITS" -eq 0 ]; then
  pass "未发现硬编码密钥特征"
fi

SOFT_SECRET_HITS=0
while IFS= read -r -d '' f; do
  [ -f "$f" ] || continue
  case "$f" in
    *.md|*.example|.env.example|scripts/*|.github/*) continue ;;
  esac
  is_text "$f" || continue
  if LC_ALL=C grep -nIiE "(password|passwd|secret|token|api[_-]?key)[[:space:]]*[:=][[:space:]]*[\"'][^\"']{8,}[\"']" "$f" >/dev/null 2>&1; then
    warn "$f 出现「变量名 = 字面量」式赋值，请人工确认不是真实凭据"
    SOFT_SECRET_HITS=$((SOFT_SECRET_HITS + 1))
  fi
done < <(git ls-files -z)

# ------------------------------------------------------------
section "3. 大文件与生成物"
# ------------------------------------------------------------
MAX_BYTES=$((5 * 1024 * 1024))
size_of() { stat -c%s "$1" 2>/dev/null || stat -f%z "$1" 2>/dev/null || echo 0; }

LARGE_HITS=0
while IFS= read -r -d '' f; do
  [ -f "$f" ] || continue
  s="$(size_of "$f")"
  if [ "$s" -gt "$MAX_BYTES" ]; then
    fail "$f 体积 $((s / 1024 / 1024)) MiB，超过 5 MiB 上限（改用 Git LFS 或外链）"
    LARGE_HITS=$((LARGE_HITS + 1))
  fi
done < <(git ls-files -z)
[ "$LARGE_HITS" -eq 0 ] && pass "无超过 5 MiB 的已跟踪文件"

FORBIDDEN_TRACKED='^(node_modules/|dist/|build/|out/|\.next/|target/|__pycache__/|\.venv/|venv/|coverage/)'
if git ls-files | LC_ALL=C grep -qE "$FORBIDDEN_TRACKED"; then
  fail "检测到构建产物或依赖目录被纳入版本控制："
  git ls-files | LC_ALL=C grep -E "$FORBIDDEN_TRACKED" | head -10 | sed 's/^/         /'
else
  pass "未提交依赖目录或构建产物"
fi

# ------------------------------------------------------------
section "4. 编码与换行"
# ------------------------------------------------------------
CHECK_EXT_RE='\.(md|txt|json|ya?ml|sh|ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|cs|c|h|cpp|toml|ini|cfg|env|example|html|css|scss)$'
BOM_HITS=0
CRLF_HITS=0
while IFS= read -r -d '' f; do
  [ -f "$f" ] || continue
  case "$f" in
    *.png|*.jpg|*.jpeg|*.gif|*.webp|*.ico|*.pdf|*.zip) continue ;;
  esac
  base="$(basename "$f")"
  if ! printf '%s' "$base" | LC_ALL=C grep -qE "$CHECK_EXT_RE" && [ "$base" != ".gitignore" ] && [ "$base" != ".gitattributes" ] && [ "$base" != ".editorconfig" ]; then
    continue
  fi
  is_text "$f" || continue
  first3="$(head -c 3 "$f" | od -An -tx1 | tr -d ' \n')"
  if [ "$first3" = "efbbbf" ]; then
    fail "$f 含 UTF-8 BOM，请另存为「UTF-8 无 BOM」"
    BOM_HITS=$((BOM_HITS + 1))
  fi
  if LC_ALL=C grep -qU $'\r' "$f" 2>/dev/null; then
    case "$f" in
      *.bat|*.cmd|*.ps1) : ;;
      *)
        warn "$f 含 CRLF 换行，仓库内应统一为 LF（.gitattributes 已声明）"
        CRLF_HITS=$((CRLF_HITS + 1))
        ;;
    esac
  fi
done < <(git ls-files -z)
[ "$BOM_HITS" -eq 0 ] && pass "文本文件无 BOM"
[ "$CRLF_HITS" -eq 0 ] && pass "文本文件换行为 LF"

# ------------------------------------------------------------
section "5. README 必备小节"
# ------------------------------------------------------------
if [ -f "README.md" ]; then
  for kw in "项目简介" "快速开始" "目录结构" "团队分工" "开源协议"; do
    if LC_ALL=C grep -qF "$kw" README.md; then
      pass "README 含「$kw」"
    else
      fail "README 缺少「$kw」小节"
    fi
  done
else
  fail "README.md 不存在"
fi

# ------------------------------------------------------------
section "6. 材料完成度（信息项）"
# ------------------------------------------------------------
PLACEHOLDERS=$(git ls-files -z | xargs -0 grep -o "待填写" 2>/dev/null | wc -l | tr -d ' ')
if [ "$PLACEHOLDERS" -gt 0 ]; then
  info "仍有 $PLACEHOLDERS 处「待填写」——骨架阶段正常，提交前必须清零"
else
  pass "竞赛材料已无占位符"
fi

# ------------------------------------------------------------
printf '\n== 结论 ==\n'
printf '  必须修复：%s 项 ｜ 警告：%s 项 ｜ 提示：%s 项\n' "$FAIL" "$WARN" "$INFO"
if [ "$FAIL" -gt 0 ]; then
  printf '  \033[31m自检未通过\033[0m：请修复上述 [FAIL] 项后重跑。\n'
  exit 1
fi
printf '  \033[32m自检通过\033[0m：仓库符合竞赛规范。\n'
exit 0
