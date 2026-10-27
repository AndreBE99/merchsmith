#!/usr/bin/env bash
# Keeps the design-reference preview server honest.
#
#   scripts/update-reference.sh                 stop any stale server on :8642 (the browser skill then starts a fresh one)
#   scripts/update-reference.sh <new-version>   first sync <new-version>/ INTO "Merchsmith Platform Design/", then stop the server
#
# Syncing in place (rsync --delete) keeps the folder itself, so nothing holds a deleted directory.
# The server is always stopped: a python http.server started before the folder was replaced keeps
# serving the old, deleted directory (404 on every file).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="$ROOT/Merchsmith Platform Design"
PORT=8642

if [ $# -ge 1 ]; then
  SRC="${1%/}"
  [ -d "$SRC" ] || { echo "Not a folder: $SRC" >&2; exit 1; }
  [ "$(cd "$SRC" && pwd)" != "$REF" ] || { echo "Source is the reference folder itself." >&2; exit 1; }
  mkdir -p "$REF"
  rsync -a --delete "$SRC/" "$REF/"
  echo "Reference updated from $SRC"
fi

PIDS="$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  # shellcheck disable=SC2086
  kill $PIDS
  echo "Stopped stale server on :$PORT"
fi
