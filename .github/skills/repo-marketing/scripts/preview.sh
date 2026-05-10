#!/usr/bin/env bash
# preview.sh — launch Remotion Studio against a single video's video.json
# so the user can scrub scene timings, demo placement, captions before
# the long render.
#
# Usage: preview.sh <repo> <NN-slug>

set -euo pipefail

REPO="${1:?usage: preview.sh <repo> <NN-slug>}"
SLUG="${2:?usage: preview.sh <repo> <NN-slug>}"

SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTION="$SKILL/../remotion-engine/project"

VIDEO_JSON="$REPO/.market/videos/$SLUG/video.json"
[[ -f "$VIDEO_JSON" ]] || { echo "error: $VIDEO_JSON not found" >&2; exit 1; }

# Ensure node_modules
if [[ ! -d "$REMOTION/node_modules" ]]; then
  echo "→ installing remotion deps (one-time)"
  ( cd "$REMOTION" && npm install >/dev/null )
fi

cd "$REMOTION"
echo "→ Remotion Studio: http://localhost:3000"
echo "  preview composition: Main16x9"
echo "  props: $VIDEO_JSON"
echo "  public-dir: $REPO/.market"
echo "  press Ctrl+C when done"

# Use the local binary; npx fails to find it from outside cwd in some setups.
exec ./node_modules/.bin/remotion studio src/index.ts \
  --props="$VIDEO_JSON" \
  --public-dir="$REPO/.market"
