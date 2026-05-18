#!/usr/bin/env bash
# Build Sweety as a desktop app (Electron). Run on your own machine.
# Usage: bash scripts/build-desktop.sh [linux|darwin|win32]
set -euo pipefail

PLATFORM="${1:-$(uname | tr '[:upper:]' '[:lower:]')}"
case "$PLATFORM" in
  linux)  EPLAT=linux ;;
  darwin|mac|macos) EPLAT=darwin ;;
  win|win32|windows) EPLAT=win32 ;;
  *) echo "Unknown platform: $PLATFORM"; exit 1 ;;
esac

echo "==> Installing Electron toolchain (first run only)"
npm install --no-save --save-dev electron @electron/packager

echo "==> Building web bundle with relative base"
VITE_TARGET=electron npx vite build

echo "==> Packaging Sweety for $EPLAT"
rm -rf electron-release
npx @electron/packager . "Sweety" \
  --platform="$EPLAT" --arch=x64 \
  --out=electron-release --overwrite \
  --ignore='^/src' --ignore='^/public' \
  --ignore='^/supabase' --ignore='^/electron-release' \
  --ignore='^/android' --ignore='^/playwright.*' \
  --ignore='^/scripts'

echo "==> Done. Output in ./electron-release/"
ls electron-release
