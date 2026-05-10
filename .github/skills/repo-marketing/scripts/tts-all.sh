#!/usr/bin/env bash
# tts-all.sh — synthesize ALL scenes' voiceovers for one video, idempotent.
#
# Usage: tts-all.sh <repo-root> <video-folder> [voice]
#   <repo-root>      e.g. /path/to/myrepo
#   <video-folder>   slug under .market/videos/, e.g. 01-stop-paying
#   [voice]          edge-tts voice; default = en-US-AriaNeural
#
# Reads <repo>/.market/videos/<folder>/video.json, iterates scenes[],
# synthesizes any missing wavs (skips ones already present), and asserts
# the final wav count == scenes.length. Exits non-zero on mismatch.

set -euo pipefail

REPO="${1:?usage: tts-all.sh <repo-root> <video-folder> [voice]}"
FOLDER="${2:?missing video folder}"
VOICE="${3:-en-US-AriaNeural}"

VIDEO_DIR="${REPO}/.market/videos/${FOLDER}"
VIDEO_JSON="${VIDEO_DIR}/video.json"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ ! -f "$VIDEO_JSON" ]; then
  echo "error: $VIDEO_JSON not found" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq required" >&2; exit 127
fi

mkdir -p "$VIDEO_DIR/out"

EXPECTED=$(jq '.scenes | length' "$VIDEO_JSON")
echo "expecting $EXPECTED scenes"

made=0
skipped=0
for i in $(seq 1 "$EXPECTED"); do
  text=$(jq -r ".scenes[$((i-1))].captions[0].text // .scenes[$((i-1))].voiceover.text // \"\"" "$VIDEO_JSON")
  wav="$VIDEO_DIR/out/vo-scene-${i}.wav"
  if [ -f "$wav" ] && [ "$(stat -f %z "$wav" 2>/dev/null || stat -c %s "$wav")" -gt 1024 ]; then
    skipped=$((skipped+1))
    continue
  fi
  if [ -z "$text" ] || [ "$text" = "null" ]; then
    echo "warn: scene $i has no caption text and no voiceover.text — skipping" >&2
    continue
  fi
  if bash "$SCRIPT_DIR/tts.sh" "$VIDEO_DIR" "$i" "$VOICE" "$text" >/dev/null 2>&1; then
    echo "  ✓ scene $i"
    made=$((made+1))
  else
    echo "  ✗ scene $i FAILED — retrying once" >&2
    sleep 1
    if bash "$SCRIPT_DIR/tts.sh" "$VIDEO_DIR" "$i" "$VOICE" "$text" >/dev/null 2>&1; then
      echo "  ✓ scene $i (retry)"
      made=$((made+1))
    else
      echo "  ✗ scene $i FAILED after retry" >&2
    fi
  fi
done

GOT=$(ls -1 "$VIDEO_DIR/out"/vo-scene-*.wav 2>/dev/null | wc -l | tr -d ' ')
echo "tts-all: made=$made skipped=$skipped present=$GOT expected=$EXPECTED"
if [ "$GOT" -ne "$EXPECTED" ]; then
  echo "error: wav count mismatch — got $GOT, expected $EXPECTED" >&2
  exit 2
fi
