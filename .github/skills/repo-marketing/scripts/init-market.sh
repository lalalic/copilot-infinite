#!/usr/bin/env bash
# init-market.sh — first-time setup of <repo>/.market/
#
# Usage: init-market.sh <repo-root>
#
# In the reference design, the Remotion project lives inside the skill
# itself (remotion-engine/project/). The repo's .market/ holds only
# artifacts. We:
#   1. Create the per-repo .market/ scaffold.
#   2. Ensure the skill's Remotion project has node_modules (one-time,
#      shared across all repos that use this skill).
#
# Idempotent: safe to re-run.

set -euo pipefail

REPO_ROOT="${1:-$PWD}"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MARKET_DIR="${REPO_ROOT}/.market"
REMOTION_DIR="${SKILL_DIR}/../remotion-engine/project"

if [[ ! -d "$REPO_ROOT" ]]; then
  echo "error: repo root '$REPO_ROOT' does not exist" >&2
  exit 1
fi

mkdir -p "${MARKET_DIR}/assets/demo" "${MARKET_DIR}/videos"

# One-time install of the skill's Remotion project (shared across all
# repos that invoke this skill).
if [[ ! -d "${REMOTION_DIR}/node_modules" ]]; then
  echo "→ npm install in ${REMOTION_DIR} (one-time, ~1 min)"
  ( cd "${REMOTION_DIR}" && npm install --silent )
fi

# Suggest .gitignore entries (do not modify without consent — caller asks)
GITIGNORE_SUGGESTIONS=(
  ".market/videos/*/out/*.wav"
  ".market/videos/*/out/*.mp4"
)
echo
echo "Suggested additions to ${REPO_ROOT}/.gitignore:"
for line in "${GITIGNORE_SUGGESTIONS[@]}"; do
  echo "  $line"
done
echo
echo ".market/ ready at ${MARKET_DIR}"
echo "Remotion project: ${REMOTION_DIR}"
