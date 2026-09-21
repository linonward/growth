#!/usr/bin/env bash
#
# Validates a pull request title.
#
# PRs are squash-merged, so the PR title *becomes* the commit subject on main.
# Enforcing it here is what keeps `git log` readable, which matters more than
# usual in a repo whose history is part of the reasoning.
#
# Usage: scripts/check-pr-title.sh "<title>"
#
# Kept as a script rather than inline YAML so it can be run and tested locally.

set -euo pipefail

title="${1:-}"

# type(scope): subject   — scope and the breaking-change "!" are optional.
pattern='^(feat|fix|docs|ci|chore|perf|refactor|test|build|style)(\([a-z0-9./-]+\))?!?: .+'

if [[ -z "${title// /}" ]]; then
  echo "✗ PR 标题为空。"
  exit 1
fi

if [[ ! "$title" =~ $pattern ]]; then
  cat <<EOF
✗ PR 标题不符合仓库约定：

    $title

期望格式：<type>(<scope>): <subject>

  type   feat | fix | docs | ci | chore | perf | refactor | test | build | style
  scope  可选，小写，例如 analytics / goals / nav
  subject 一句话说明做了什么

示例：
    feat(goals): split learning by subject
    fix(analytics): read the child's timezone, not the analyst's
    docs: record the goal library design rules

PR 会被 squash merge，标题就是 main 上的 commit subject，所以这里要拦住。
EOF
  exit 1
fi

echo "✓ PR 标题符合约定：$title"
