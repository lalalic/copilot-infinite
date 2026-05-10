#!/usr/bin/env bash
# tts.sh — synthesize a single scene's voiceover via edge-tts.
#
# Usage: tts.sh <video-dir> <scene-index> <voice> <text>
#   <video-dir>    e.g. <repo>/.market/videos/01-foo
#   <scene-index>  1-based scene number
#   <voice>        edge-tts voice (e.g. en-US-AriaNeural)
#   <text>         spoken sentence
#
# Output: <video-dir>/out/vo-scene-<N>.wav

set -euo pipefail

VIDEO_DIR="${1:?usage: tts.sh <video-dir> <scene-index> <voice> <text>}"
SCENE_N="${2:?missing scene index}"
VOICE="${3:?missing voice}"
TEXT="${4:?missing text}"

if ! command -v edge-tts >/dev/null 2>&1; then
  echo "error: edge-tts not found. Install with: pip install edge-tts" >&2
  exit 127
fi

OUT_DIR="${VIDEO_DIR}/out"
mkdir -p "$OUT_DIR"

# edge-tts emits mp3 by default; we save mp3 then convert to wav for Remotion.
TMP_MP3="$(mktemp -t vo-scene-XXXX.mp3)"
trap "rm -f '$TMP_MP3'" EXIT

edge-tts --voice "$VOICE" --text "$TEXT" --write-media "$TMP_MP3" >/dev/null

WAV="${OUT_DIR}/vo-scene-${SCENE_N}.wav"
if command -v ffmpeg >/dev/null 2>&1; then
  ffmpeg -y -loglevel error -i "$TMP_MP3" -ar 48000 -ac 2 "$WAV"
else
  # Fall back: keep as .mp3 with .wav extension is bad — fail loudly.
  echo "error: ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 127
fi

echo "$WAV"
