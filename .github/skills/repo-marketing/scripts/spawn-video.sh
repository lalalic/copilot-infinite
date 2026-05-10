#!/usr/bin/env bash
# spawn-video.sh — materialize a videos/NN-<slug>/ folder for a picked hook.
#
# Usage: spawn-video.sh <repo-root> <slug>
#   - <slug>: kebab-case from hooks.md
#   - NN: auto-assigned next ordinal based on existing folders.

set -euo pipefail

REPO_ROOT="${1:?usage: spawn-video.sh <repo-root> <slug>}"
SLUG="${2:?usage: spawn-video.sh <repo-root> <slug>}"

VIDEOS_DIR="${REPO_ROOT}/.market/videos"
mkdir -p "$VIDEOS_DIR"

# Reject if slug already exists (under any ordinal)
if compgen -G "${VIDEOS_DIR}/[0-9][0-9]-${SLUG}" > /dev/null; then
  EXISTING="$(echo ${VIDEOS_DIR}/[0-9][0-9]-${SLUG})"
  echo "error: slug '${SLUG}' already exists at ${EXISTING}" >&2
  exit 2
fi

# Compute next ordinal
NEXT_N=1
for d in "${VIDEOS_DIR}"/[0-9][0-9]-*; do
  [[ -d "$d" ]] || continue
  N=$(basename "$d" | cut -c1-2 | sed 's/^0//')
  (( N >= NEXT_N )) && NEXT_N=$((N + 1))
done
NN=$(printf "%02d" "$NEXT_N")

VIDEO_DIR="${VIDEOS_DIR}/${NN}-${SLUG}"
mkdir -p "${VIDEO_DIR}/out" "${VIDEO_DIR}/cache"

echo "$VIDEO_DIR"
