"""Masteriza el audio (−14 LUFS integrados, pico real ≤ −1.5 dBTP) y codifica H.264 + AAC.

    python3 tools/encode.py full 16x9
Entrada:  build/frames/<cut>_<fmt>/%05d.jpg  +  build/audio/<cut>_mix.wav
Salida:   dist/plottink_<cut>_<fmt>.mp4
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "timeline.json").read_text())

try:
    import imageio_ffmpeg
    FF = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:  # ffmpeg del sistema
    FF = "ffmpeg"

TARGET_I, TARGET_TP = -14.0, -1.5
NAMES = {"full": "master_94s", "c45": "reels_45s", "c30": "reels_30s"}


def measure(wav, pre=""):
    af = (pre + "," if pre else "") + "loudnorm=I=-14:TP=-1.5:LRA=20:print_format=json"
    r = subprocess.run([FF, "-hide_banner", "-nostats", "-i", str(wav), "-af", af, "-f", "null", "-"], capture_output=True, text=True)
    js = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S).group(0))
    return {k: float(v) for k, v in js.items() if k.startswith("input_") or k == "target_offset"}


def master_chain(wav):
    m = measure(wav)
    gain = TARGET_I - m["input_i"]
    chain = f"volume={gain:.2f}dB,alimiter=limit={10 ** ((TARGET_TP - 0.3) / 20):.4f}:attack=3:release=60:level=disabled"
    m2 = measure(wav, chain)
    # ajuste fino tras el limitador (el limitador baja un poco la sonoridad)
    trim = TARGET_I - m2["input_i"]
    if abs(trim) > 0.2:
        chain = f"volume={gain + trim:.2f}dB,alimiter=limit={10 ** ((TARGET_TP - 0.3) / 20):.4f}:attack=3:release=60:level=disabled"
        m2 = measure(wav, chain)
    return chain, m, m2


def encode(cut, fmt):
    frames = ROOT / "build" / "frames" / f"{cut}_{fmt}"
    wav = ROOT / "build" / "audio" / f"{cut}_mix.wav"
    out = ROOT / "dist" / f"plottink_{NAMES[cut]}_{fmt}.mp4"
    out.parent.mkdir(exist_ok=True)
    chain, m, m2 = master_chain(wav)
    print(f"[{cut} {fmt}] audio: {m['input_i']:.1f} LUFS → {m2['input_i']:.1f} LUFS, pico {m2['input_tp']:.1f} dBTP")
    fps = TL["fps"]
    cmd = [FF, "-y", "-hide_banner", "-loglevel", "error", "-stats",
           "-framerate", str(fps), "-i", str(frames / "%05d.jpg"), "-i", str(wav),
           "-map", "0:v", "-map", "1:a", "-af", chain + ",aresample=48000",
           "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
           "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-tune", "film",
           "-maxrate", "12M", "-bufsize", "24M", "-pix_fmt", "yuv420p", "-profile:v", "high",
           "-g", str(fps * 2), "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
           "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest",
           "-metadata", "title=PlottInk — Centro de Servicios Gráficos",
           "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)
    print(f"[{cut} {fmt}] → {out.relative_to(ROOT)}  {out.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    encode(sys.argv[1], sys.argv[2])
