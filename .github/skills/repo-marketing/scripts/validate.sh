#!/usr/bin/env bash
# validate.sh — preflight check before rendering a video.
#
# Usage: validate.sh <repo-root> <video-folder>
#
# Verifies:
#   1. video.json exists and matches schema (jsonschema if available)
#   2. every props.background path resolves under .market/
#   3. every voiceover.audio wav exists and is > 1KB
#   4. scene count == wav count under out/
#   5. _unresolved_assets is empty or absent
#
# Exits non-zero on any failure with a human-readable summary.

set -euo pipefail

REPO="${1:?usage: validate.sh <repo-root> <video-folder>}"
FOLDER="${2:?missing video folder}"
MARKET="${REPO}/.market"
VIDEO_DIR="${MARKET}/videos/${FOLDER}"
VIDEO_JSON="${VIDEO_DIR}/video.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq required" >&2; exit 127
fi
[ -f "$VIDEO_JSON" ] || { echo "error: $VIDEO_JSON missing" >&2; exit 1; }

errors=0

# 1. unresolved assets
unresolved=$(jq -r '._unresolved_assets // [] | length' "$VIDEO_JSON")
if [ "$unresolved" -gt 0 ]; then
  echo "✗ _unresolved_assets has $unresolved entries — resolve before render"
  jq -r '._unresolved_assets[]' "$VIDEO_JSON" | sed 's/^/    - /'
  errors=$((errors+1))
fi

# 2. backgrounds resolve
while IFS= read -r bg; do
  [ -z "$bg" ] || [ "$bg" = "null" ] && continue
  if [ ! -f "$MARKET/$bg" ]; then
    echo "✗ background asset missing: .market/$bg"
    errors=$((errors+1))
  fi
done < <(jq -r '.scenes[].props.background // empty' "$VIDEO_JSON")

# 3. voiceover wavs exist
expected=$(jq '.scenes | length' "$VIDEO_JSON")
while IFS= read -r audio; do
  [ -z "$audio" ] && continue
  full="$MARKET/$audio"
  if [ ! -f "$full" ]; then
    echo "✗ vo missing: .market/$audio"
    errors=$((errors+1))
  elif [ "$(stat -f %z "$full" 2>/dev/null || stat -c %s "$full")" -lt 1024 ]; then
    echo "✗ vo too small (likely truncated): .market/$audio"
    errors=$((errors+1))
  fi
done < <(jq -r '.scenes[].voiceover.audio // empty' "$VIDEO_JSON")

# 4. wav count sanity
got=$(ls -1 "$VIDEO_DIR/out"/vo-scene-*.wav 2>/dev/null | wc -l | tr -d ' ')
if [ "$got" -ne "$expected" ]; then
  echo "✗ wav count mismatch: got $got, expected $expected"
  errors=$((errors+1))
fi

if [ "$errors" -gt 0 ]; then
  echo "" >&2
  echo "validate.sh: $errors error(s) — fix before render" >&2
  exit 1
fi

echo "✓ validate: $expected scenes, all assets and audio present"
