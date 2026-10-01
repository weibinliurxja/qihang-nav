#!/usr/bin/env bash
#
# 启航导航 · 部署到腾讯 EdgeOne Pages 的分步向导
#
# 为什么需要它：下面的每一步都必须由你在浏览器里完成（GitHub 建仓库、EdgeOne
# 控制台授权与绑定），AI 无法代劳。这个脚本按依赖顺序一步一步告诉你点哪里、
# 复制什么、粘回哪里，并把你提供的值写进 .env。
#
# 用法：bash scripts/setup-edgeone.sh
#
# Everything above the "STAGES" marker is the wizard library: do not hand-edit
# it. Author the per-step stages below the marker.

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────
# Wizard library: delightful, consistent UX, identical across every wizard.
# ──────────────────────────────────────────────────────────────────────────

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

TOTAL_STAGES=0

_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()
WRITTEN_SECRET=()
SKIPPED=()

_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1; then tput clear; else printf '\033[2J\033[3J\033[H'; fi
}

banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  You drive the browser; this wizard tells you exactly what to do and\n' "$DIM"
  printf '  captures the values you copy back. Stop any time with Ctrl-C and re-run\n'
  printf '  later, since it remembers values already saved.%s\n' "$RESET"
  pause "Ready to start?"
}

stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

say()  { printf '  %s\n' "$1"; }
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v wslview     >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open    >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open        >/dev/null 2>&1; then open "$url"
    else warn "couldn't open a browser; visit it manually: $url"; fi
  } >/dev/null 2>&1 || warn "couldn't open a browser, so visit it manually: $url"
}

pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

ask() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -r input || true
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

ask_secret() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || true
  printf '\n'
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

write_env() {
  local key="$1" value="$2" tmp
  touch "$ENV_FILE"
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ wrote%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ set%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (set it manually: gh secret set $name)")
  warn "skipped GitHub secret $name: gh not ready; set it later"
}

set_var() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if gh variable set "$name" --body "$value" >/dev/null 2>&1; then
      printf '  %s✓ set%s GitHub variable %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub variable $name")
  warn "skipped GitHub variable $name, gh not ready; set it later"
}

finish() {
  _clear
  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} GitHub secret(s): ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "still to do by hand:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}

# ──────────────────────────────────────────────────────────────────────────
# STAGES
# ──────────────────────────────────────────────────────────────────────────

# 无论从哪调用，都在仓库根目录干活
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

TOTAL_STAGES=7

banner "启航导航 → 腾讯 EdgeOne Pages"

# ── 1 ─────────────────────────────────────────────────────────────────────
stage "GitHub：建一个空仓库"
say "EdgeOne 要从 Git 仓库拉代码并自动重建，所以先把代码放上 GitHub。"
open_url "https://github.com/new"
step "Repository name 填 qihang-nav（或你喜欢的名字）"
step "可见性：Private 或 Public 都行（书签数据不在仓库里，在 EdgeOne KV）"
warn "不要勾选 Add a README / .gitignore / license——本地已经有提交，勾了会冲突"
step "点 Create repository，然后复制页面上给出的仓库地址"
note "HTTPS 形如 https://github.com/你的用户名/qihang-nav.git"
ask GITHUB_REPO_URL "粘贴仓库地址："
write_env GITHUB_REPO_URL "$GITHUB_REPO_URL"

# ── 2 ─────────────────────────────────────────────────────────────────────
stage "推送代码"
say "本地已经提交好了，现在推到刚建的仓库。"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$GITHUB_REPO_URL"
  note "已更新 origin"
else
  git remote add origin "$GITHUB_REPO_URL"
  note "已添加 origin"
fi
git branch -M main 2>/dev/null || true
warn "如果 git 弹出要账号密码：用户名填 GitHub 用户名，密码必须填 Personal Access Token"
note "（GitHub 早就不接受账号登录密码了；没有 token 就去 Settings → Developer settings → Tokens 建一个，勾 repo 权限）"
if confirm "现在执行 git push -u origin main ？"; then
  if git push -u origin main; then
    say "推送成功"
  else
    warn "推送失败。修好后重新运行本向导，或在仓库里手动 git push -u origin main"
    SKIPPED+=("git push 未完成")
  fi
else
  SKIPPED+=("git push 未完成")
fi

# ── 3 ─────────────────────────────────────────────────────────────────────
stage "EdgeOne：从 Git 仓库导入项目"
say "在 EdgeOne Pages 控制台把刚才的仓库接进来。"
open_url "https://console.cloud.tencent.com/edgeone/pages"
step "首次使用若要求授权 GitHub，按提示授权（只给这一个仓库也行）"
step "点「导入 Git 仓库」/「创建项目」，选中 qihang-nav"
step "构建配置：如果它没有自动读到 edgeone.json，就按下面填"
note "  安装命令：留空（本项目零依赖）"
note "  构建命令：留空或 echo skip"
note "  输出目录：./"
warn "这一步的按钮文案我没法替你确认（控制台 UI 常变），以页面上「导入 Git 仓库」这类入口为准"
pause "项目创建并跑完第一次构建后，按 Enter 继续"

# ── 4 ─────────────────────────────────────────────────────────────────────
stage "EdgeOne：开通 KV 并建命名空间"
say "书签数据存在 KV 里，先要有 KV 账户和命名空间。"
open_url "https://console.cloud.tencent.com/edgeone/kv"
step "若显示未开通，点「立即申请」开通（免费）"
step "创建一个命名空间，例如 qihang-nav-data"
note "免费额度：1 GB 账户容量、10 个命名空间，对个人导航页远远够用"
pause "命名空间创建好后按 Enter 继续"

# ── 5 ─────────────────────────────────────────────────────────────────────
stage "EdgeOne：把 KV 绑到项目"
say "绑定时填的变量名，就是函数里用的那个名字——必须完全一致。"
step "进你的 Pages 项目 → 「KV 存储」/「绑定命名空间」"
step "选择刚创建的命名空间"
step "变量名填：NAV_KV"
warn "必须一字不差是 NAV_KV。填错的话函数读不到 KV，页面会报「KV 未绑定」"
pause "绑定好后按 Enter 继续"

# ── 6 ─────────────────────────────────────────────────────────────────────
stage "EdgeOne：设置访问口令"
say "口令在边缘函数里做服务端校验，不写进任何代码。"
NAV_PASSWORD="${NAV_PASSWORD:-$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)}"
printf '  %s生成的口令：%s%s%s\n' "$BOLD" "$GREEN" "$NAV_PASSWORD" "$RESET"
step "复制上面这串口令"
step "项目 → 环境变量 → 新增"
step "变量名填 NAV_PASSWORD，值粘贴这串口令"
warn "口令只存在 EdgeOne 和环境变量里，别提交到仓库"
write_env NAV_PASSWORD "$NAV_PASSWORD"
step "保存后，在项目里点一次「重新部署」，让环境变量和 KV 绑定生效"
pause "重新部署完成后按 Enter 继续"

# ── 7 ─────────────────────────────────────────────────────────────────────
stage "验证部署"
step "从项目页面复制访问地址（形如 https://xxxx.edgeone.cool）"
ask DEPLOY_URL "粘贴访问地址："
write_env DEPLOY_URL "$DEPLOY_URL"
if [[ -n "${DEPLOY_URL:-}" ]]; then
  printf '  %s正在验证…%s\n' "$DIM" "$RESET"
  code=$(curl -s -o /dev/null -m 25 -w '%{http_code}' "$DEPLOY_URL/api/data" || echo 000)
  if [[ "$code" == "401" ]]; then
    say "✅ /api/data 无口令被拒（401）—— 函数已上线，KV 也读到了"
  else
    warn "/api/data 返回 $code（期望 401）：函数没生效，或 KV 未绑定"
  fi
  body=$(curl -s -m 25 -H "X-Password: $NAV_PASSWORD" "$DEPLOY_URL/api/data" || true)
  if [[ "$body" == *'"ok":true'* ]]; then
    say "✅ 带口令能读到数据 —— 部署成功"
    note "现在用浏览器打开 $DEPLOY_URL，用第 6 步的口令登录即可"
  else
    warn "带口令读取异常，返回：${body:0:200}"
  fi
fi

finish
note "口令与地址已写进 .env（已在 .gitignore 里，不会被提交）"
note "之后改代码：git push 就会自动重新部署"
