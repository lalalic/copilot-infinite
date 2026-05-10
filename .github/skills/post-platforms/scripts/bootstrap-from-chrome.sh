#!/usr/bin/env bash
# bootstrap-from-chrome.sh
# Copy your macOS Chrome default profile to a per-platform Chrome profile
# directory used by the post-platforms skill. After running this, the
# puppeteer launcher will start with you already logged in to YouTube,
# TikTok, etc. (assuming your Chrome session is logged in to those sites).
#
# WARNINGS:
#   - macOS only. Linux / Windows paths differ; PR welcome.
#   - QUIT Chrome before running. Chrome locks the profile while open.
#   - The encrypted Cookies file uses a key from the macOS Keychain.
#     Puppeteer launching with the copied profile re-uses the same Keychain
#     entry under your user, so cookies decrypt transparently. If you copy
#     the profile to a different Mac / user, cookies will be unreadable.
#
# Usage:
#   ./bootstrap-from-chrome.sh                  # copy default profile to all 5 platforms
#   ./bootstrap-from-chrome.sh youtube tiktok   # only specified platforms

set -euo pipefail

CHROME_PROFILE="${CHROME_PROFILE:-$HOME/Library/Application Support/Google/Chrome/Default}"
PROFILES_DIR="${PROFILES_DIR:-$HOME/.qili-media/profiles}"

if [ ! -d "$CHROME_PROFILE" ]; then
  echo "Error: Chrome profile not found at $CHROME_PROFILE" >&2
  echo "Set CHROME_PROFILE=/path/to/profile if it's elsewhere." >&2
  exit 1
fi

if pgrep -x "Google Chrome" >/dev/null; then
  echo "Error: Quit Chrome first (it locks the profile)." >&2
  exit 1
fi

PLATFORMS=("$@")
if [ ${#PLATFORMS[@]} -eq 0 ]; then
  PLATFORMS=(youtube tiktok xiaohongshu wechat kindle)
fi

for p in "${PLATFORMS[@]}"; do
  dest="$PROFILES_DIR/$p"
  echo "→ $p"
  mkdir -p "$dest"
  # Mirror just the profile contents (not the parent Chrome dir).
  rsync -a --delete \
    --exclude='Cache/' --exclude='Code Cache/' --exclude='GPUCache/' \
    --exclude='Service Worker/CacheStorage/' \
    --exclude='IndexedDB/' \
    --exclude='File System/' \
    --exclude='Local Storage/' \
    --exclude='Sessions/' \
    --exclude='Session Storage/' \
    --exclude='blob_storage/' \
    "$CHROME_PROFILE/" "$dest/"
  echo "   ✓ $dest"
done

echo
echo "Done. Each platform now has its own writable profile under $PROFILES_DIR."
echo "Test with:  node -e 'require(\"./templates/puppeteer\").post({video:{filePath:\"/tmp/test.mp4\",title:\"t\",description:\"d\"},targets:{youtube:{}},headless:false})'"
