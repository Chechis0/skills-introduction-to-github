#!/usr/bin/env bash
# Construye las 6 piezas: {máster 94 s, Reels 45 s, Reels 30 s} × {16:9, 9:16}
#   ./build.sh                 → todo
#   ./build.sh full 16x9       → una sola pieza
# Requisitos: Node 18+, Playwright (Chromium), Python 3 con numpy, scipy e imageio-ffmpeg.
set -euo pipefail
cd "$(dirname "$0")"

CUTS=${1:-"full c45 c30"}
FMTS=${2:-"16x9 9x16"}
WORKERS=${WORKERS:-4}

python3 audio/sound.py $CUTS
for cut in $CUTS; do
  for fmt in $FMTS; do
    node render.mjs frames --cut "$cut" --fmt "$fmt" --workers "$WORKERS"
    python3 tools/encode.py "$cut" "$fmt"
  done
done
ls -lh dist/
