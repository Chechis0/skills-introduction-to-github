#!/usr/bin/env bash
# Reel "Marcaje vehicular" 1080×1920 → dist/plottink_reel_marcaje_9x16.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f logo-anim/logo.json ] || python3 logo-anim/trace_logo.py
reel-marcaje/prep.sh
python3 reel-marcaje/sound.py
node reel-marcaje/render.mjs frames --workers "${WORKERS:-4}"
python3 - <<'PY'
import sys, subprocess
from pathlib import Path
sys.path.insert(0, "tools")
from encode import FF, master_chain
wav, out = Path("build/marcaje/reel_mix.wav"), Path("dist/plottink_reel_marcaje_9x16.mp4")
chain, m, m2 = master_chain(wav)
print(f"[marcaje] audio {m['input_i']:.1f} → {m2['input_i']:.1f} LUFS, pico {m2['input_tp']:.1f} dBTP")
subprocess.run([FF, "-y", "-hide_banner", "-loglevel", "error", "-framerate", "30", "-i", "build/marcaje/frames/%05d.jpg",
                "-i", str(wav), "-map", "0:v", "-map", "1:a", "-af", chain + ",aresample=48000",
                "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
                "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-maxrate", "9M", "-bufsize", "18M",
                "-pix_fmt", "yuv420p", "-profile:v", "high", "-g", "60",
                "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", str(out)], check=True)
print(f"[marcaje] → {out}  {out.stat().st_size / 1e6:.1f} MB")
PY
