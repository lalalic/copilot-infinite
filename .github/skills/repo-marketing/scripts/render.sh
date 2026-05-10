#!/usr/bin/env bash
# render.sh — render one video (3 aspects) + cover stills (2 aspects)
#
# Usage: render.sh <repo-root> <video-folder>
#   e.g. render.sh /path/to/myrepo 01-ship-faster
#
# Reads <repo>/.market/videos/<folder>/video.json
# Writes <repo>/.market/videos/<folder>/out/video-{16x9,9x16,1x1}.mp4
#        <repo>/.market/videos/<folder>/cover-{16x9,9x16}.png
#
# Renders from the remotion-engine/project/ directory (shared, no
# per-repo copy). Uses --public-dir=<repo>/.market so video.json asset
# paths are resolved relative to .market/ (e.g. "videos/01-foo/out/vo-scene-1.wav").

set -euo pipefail

REPO_ROOT="${1:?usage: render.sh <repo-root> <video-folder>}"
VIDEO_FOLDER="${2:?usage: render.sh <repo-root> <video-folder>}"

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTION_DIR="${SKILL_DIR}/../remotion-engine/project"
MARKET_DIR="${REPO_ROOT}/.market"
VIDEO_DIR="${MARKET_DIR}/videos/${VIDEO_FOLDER}"
PROPS_FILE="${VIDEO_DIR}/video.json"

if [[ ! -f "$PROPS_FILE" ]]; then
  echo "error: $PROPS_FILE not found" >&2
  exit 1
fi

# Preflight: fail loudly before remotion spins up.
if ! "${SKILL_DIR}/scripts/validate.sh" "$REPO_ROOT" "$VIDEO_FOLDER"; then
  echo "render: validation failed — refusing to render" >&2
  exit 1
fi

if [[ ! -d "${REMOTION_DIR}/node_modules" ]]; then
  echo "→ Remotion deps missing. Running init-market.sh first..."
  "${SKILL_DIR}/scripts/init-market.sh" "$REPO_ROOT"
fi

mkdir -p "${VIDEO_DIR}/out"

cd "${REMOTION_DIR}"

# Common Remotion args — public-dir lets staticFile("videos/...") resolve.
COMMON_ARGS=(
  --props="${PROPS_FILE}"
  --public-dir="${MARKET_DIR}"
)

# Stills first (fast)
for ASPECT in 16x9 9x16; do
  OUT="${VIDEO_DIR}/cover-${ASPECT}.png"
  echo "→ rendering Cover${ASPECT} → ${OUT}"
  npx remotion still src/index.ts "Cover${ASPECT}" "${OUT}" "${COMMON_ARGS[@]}"
done

# Then videos
for ASPECT in 16x9 9x16 1x1; do
  OUT="${VIDEO_DIR}/out/video-${ASPECT}.mp4"
  echo "→ rendering Main${ASPECT} → ${OUT}"
  npx remotion render src/index.ts "Main${ASPECT}" "${OUT}" "${COMMON_ARGS[@]}"
done

echo
echo "Done. Outputs:"
ls -1 "${VIDEO_DIR}"/cover-*.png "${VIDEO_DIR}"/out/video-*.mp4
