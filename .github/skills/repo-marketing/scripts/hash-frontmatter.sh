#!/usr/bin/env bash
# hash-frontmatter.sh — compute sha256 of a file (used for staleness check).
#
# Usage: hash-frontmatter.sh <file>
# Output: sha256:<64-hex>

set -euo pipefail
FILE="${1:?usage: hash-frontmatter.sh <file>}"
HASH=$(shasum -a 256 "$FILE" | cut -d' ' -f1)
echo "sha256:${HASH}"
