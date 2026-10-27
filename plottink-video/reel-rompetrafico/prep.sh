#!/usr/bin/env bash
# Prepara el material: cuadros del video a 30 fps escalados a 1080×1920 (lanczos + nitidez + color) y la foto.
set -euo pipefail
cd "$(dirname "$0")/.."
FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())" 2>/dev/null || echo ffmpeg)
OUT=build/reel
rm -rf "$OUT/src"; mkdir -p "$OUT/src"
"$FF" -loglevel error -y -i reel-rompetrafico/media/corte-laser.mp4 \
  -vf "fps=30,scale=1080:1920:flags=lanczos,unsharp=5:5:0.9:5:5:0.0,eq=contrast=1.07:saturation=1.18:brightness=0.01" \
  -q:v 2 "$OUT/src/%04d.jpg"
"$FF" -loglevel error -y -i reel-rompetrafico/media/rompetrafico-terminado.jpg \
  -vf "scale=1500:-1:flags=lanczos,unsharp=5:5:0.6,eq=contrast=1.05:saturation=1.12" -q:v 2 "$OUT/photo.jpg"
echo "cuadros: $(ls "$OUT/src" | wc -l)"
