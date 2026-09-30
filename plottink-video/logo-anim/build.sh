#!/usr/bin/env bash
# Logo animado PlottInk (6 s) en 1:1, 16:9 y 9:16 → dist/plottink_logo_<fmt>.mp4
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f logo-anim/logo.json ] || python3 logo-anim/trace_logo.py
python3 logo-anim/sound.py
FMTS=${1:-"1x1 16x9 9x16"}
for fmt in $FMTS; do
  node logo-anim/render.mjs frames --fmt "$fmt" --workers "${WORKERS:-4}"
  python3 - "$fmt" <<'PY'
import sys, subprocess
from pathlib import Path
sys.path.insert(0, "tools")
from encode import FF, master_chain
fmt = sys.argv[1]
wav = Path("build/logo/logo_mix.wav")
out = Path(f"dist/plottink_logo_{fmt}.mp4")
chain, m, m2 = master_chain(wav)
print(f"[logo {fmt}] audio {m['input_i']:.1f} → {m2['input_i']:.1f} LUFS, pico {m2['input_tp']:.1f} dBTP")
subprocess.run([FF, "-y", "-hide_banner", "-loglevel", "error", "-framerate", "30", "-i", f"build/logo/frames_{fmt}/%05d.jpg",
                "-i", str(wav), "-map", "0:v", "-map", "1:a", "-af", chain + ",aresample=48000",
                "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
                "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-profile:v", "high",
                "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", str(out)], check=True)
print(f"[logo {fmt}] → {out}  {out.stat().st_size / 1e6:.1f} MB")
PY
done
