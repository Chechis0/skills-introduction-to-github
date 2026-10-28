#!/usr/bin/env bash
# Prepara el material del reel de marcaje: cuadros a 30 fps escalados (lanczos + nitidez + color),
# la foto de la instalación y el par "antes/después" del costado (antes = vinilo borrado, ver unwrap.py).
set -euo pipefail
cd "$(dirname "$0")/.."
FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())" 2>/dev/null || echo ffmpeg)
OUT=build/marcaje; M=reel-marcaje/media
GRADE="unsharp=5:5:0.8:5:5:0.0,eq=contrast=1.06:saturation=1.15:brightness=0.01"
mkdir -p "$OUT"
for pair in "A:recorrido-van.mp4:1920:1080" "B:prueba-diseno.mp4:1920:1080" "C:costado-y-pruebas.mp4:1456:1080"; do
  IFS=: read -r k f w h <<< "$pair"
  rm -rf "$OUT/$k"; mkdir -p "$OUT/$k"
  "$FF" -loglevel error -y -i "$M/$f" -vf "fps=30,scale=$w:$h:flags=lanczos,$GRADE" -q:v 2 "$OUT/$k/%04d.jpg"
  echo "$k: $(ls "$OUT/$k" | wc -l) cuadros"
done
# cuadro del costado (recorrido-van, 7.8 s = cuadro 234) en resolución nativa → antes/después
"$FF" -loglevel error -y -i "$M/recorrido-van.mp4" -vf "fps=30,select=eq(n\,234)" -vframes 1 "$OUT/hero_native.png"
python3 reel-marcaje/unwrap.py "$OUT/hero_native.png" "$OUT/before_native.png" "$OUT/mask_native.png"
for k in hero before; do
  "$FF" -loglevel error -y -i "$OUT/${k}_native.png" -vf "scale=1920:1080:flags=lanczos,$GRADE" -q:v 2 "$OUT/${k}.jpg"
done
"$FF" -loglevel error -y -i "$M/instalacion.jpg" -vf "scale=1080:-1:flags=lanczos,unsharp=5:5:0.6,eq=contrast=1.05:saturation=1.12" -q:v 2 "$OUT/photo.jpg"
python3 reel-marcaje/road.py "$M/carretera.jpg" "$OUT"
python3 reel-marcaje/plates.py "$OUT"
echo "listo"
