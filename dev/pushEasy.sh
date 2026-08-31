#!/usr/bin/env bash
# Push the civilian file set to the Easy-install Apps Script project.
# Requires local .clasp.easy.json (copy from .clasp.easy.json.example).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .clasp.easy.json ]]; then
  echo "Missing .clasp.easy.json — copy .clasp.easy.json.example and set scriptId." >&2
  exit 1
fi
if [[ ! -f .claspignore.easy ]]; then
  echo "Missing .claspignore.easy" >&2
  exit 1
fi

TMP_CLASP="$(mktemp)"
TMP_IGNORE="$(mktemp)"
cleanup() {
  mv "$TMP_CLASP" .clasp.json
  mv "$TMP_IGNORE" .claspignore
}
trap cleanup EXIT

cp .clasp.json "$TMP_CLASP"
cp .claspignore "$TMP_IGNORE"
cp .clasp.easy.json .clasp.json
cp .claspignore.easy .claspignore

echo "Pushing civilian files to Easy template…"
clasp push --force
echo "Done. Restoring .clasp.json / .claspignore."
