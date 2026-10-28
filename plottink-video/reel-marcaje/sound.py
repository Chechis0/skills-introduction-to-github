"""Música y sonido del reel de marcaje vehicular (24 s, 120 BPM), sincronizados con reel.json.
Reutiliza los instrumentos de audio/sound.py, los efectos del logo y la percusión del reel Rompetráfico.

    python3 reel-marcaje/sound.py   → build/marcaje/reel_mix.wav
"""
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "audio"))
from sound import (SR, Bus, bass, bp, convolve, fade, hp, kick, lp, noise, pad_chord,  # noqa: E402
                   piano, pluck, reverb_ir, sfx_city, sfx_impact, sfx_whoosh, shaker, tt)


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


LS = _load("logo_sound", ROOT / "logo-anim" / "sound.py")          # swish, pop, plink, shimmer, T
RS = _load("rompe_sound", ROOT / "reel-rompetrafico" / "sound.py")  # clap, hat, crash, riser

R = json.loads((HERE / "reel.json").read_text())
DUR = R["dur"]
BEAT = 60 / R["bpm"]


def plotter(dur, seed):
    """Carro del plotter: motor que sube y baja de tono + boquillas disparando tinta + topes."""
    t = tt(dur)
    u = t / dur
    sp = np.sin(np.pi * u) ** 0.6
    f = 260 + 950 * sp
    ph = 2 * np.pi * np.cumsum(f) / SR
    whine = bp(sum((1 / k ** 1.5) * np.sin(k * ph) for k in (1, 3, 5)), 180, 5000) * (0.15 + 0.3 * sp)
    fire = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 95 * t))
    spray = bp(noise(len(t), seed), 3000, 10000) * fire * sp * 0.22
    y = whine + spray
    for at in (0.0, dur - 0.04):  # topes del carro
        i = int(at * SR)
        c = RS.clap(seed + i, 0.4)[: int(0.06 * SR)]
        m = min(len(c), len(y) - i)
        y[i:i + m] += lp(c, 2500)[:m] * 0.8
    return fade(y, 0.01, 0.05)


def horn(seed):
    """Pito de carro doble (dos tonos), amistoso."""
    out = np.zeros(int(0.55 * SR))
    for k, st in enumerate((0.0, 0.2)):
        t = tt(0.14)
        tone = sum((1 / n) * np.sign(np.sin(2 * np.pi * f * n * t)) * 0.5 for f in (410, 515) for n in (1, 2))
        y = bp(tone, 300, 3200) * np.minimum(1, t / 0.01) * np.minimum(1, (0.14 - t) / 0.02)
        i = int(st * SR)
        out[i:i + len(y)] += y * 0.5
    return out


def knife(seed):
    """Bisturí cortando vinilo: zip corto de alta frecuencia."""
    t = tt(0.22)
    u = t / 0.22
    y = bp(noise(len(t), seed), 2500, 8000) * np.sin(np.pi * u) ** 2 * 0.6
    y += np.sin(2 * np.pi * np.cumsum(2800 + 2400 * u) / SR) * np.sin(np.pi * u) ** 3 * 0.08
    return fade(y, 0.002, 0.02)


PROG = [([59, 62, 66, 71], 35), ([59, 62, 67, 71], 31), ([62, 66, 69, 74], 38), ([61, 64, 69, 73], 33)]  # Bm G D A


def main():
    music, drums, fx = Bus(DUR), Bus(DUR), Bus(DUR)
    drop = R["drop"]
    end_t = R["wipeOut"][0]
    s0, s1 = R["sweep"]
    # ── gancho: calle aburrida (ambiente + pad apagado + reloj de hi-hat)
    fx.add(sfx_city(drop, 5), 0.0, 1.3)
    music.add(pad_chord([47, 54, 59, 62], s0 + 0.6, 0.22, 0.2, seed=1), 0.0, 1.3)
    for k in range(int(s0 / BEAT)):
        drums.add(RS.hat(900 + k, vel=0.16), k * BEAT, 1.0, 0.2)
        if k % 2 == 0:
            drums.add(kick(0.35), k * BEAT, 0.7)
    # ── barrido del plotter + riser → drop
    fx.add(plotter(s1 - s0, 7), s0, 0.75)
    fx.add(RS.riser(drop - s0, 8), s0, 0.6)
    fx.add(sfx_impact(9), drop, 0.85)
    drums.add(RS.crash(10), drop, 0.75)
    # ── groove desde el drop
    nb = int((end_t - drop) / BEAT) + 1
    for n in range(nb):
        tb = drop + n * BEAT
        if tb >= end_t:
            break
        bar, pos = divmod(n, 4)
        chord, root = PROG[bar % 4]
        montage = 11.0 <= tb < 16.0
        drums.add(kick(0.85), tb, 0.95)
        if pos in (1, 3):
            drums.add(RS.clap(n), tb, 0.8, 0.05)
        drums.add(RS.hat(n, open_=montage and pos % 2 == 1, vel=0.26), tb + BEAT / 2, 0.8, 0.3)
        for k in (0.25, 0.75):
            drums.add(shaker(0.1, seed=n * 7 + int(k * 4)), tb + BEAT * k, 0.6, -0.3)
        for k, o in enumerate((0, 12)):
            music.add(bass(root + o, BEAT * 0.45, 0.55 if o == 0 else 0.35), tb + k * BEAT / 2, 0.8)
        for m in chord:
            music.add(pluck(m, 0.35, 0.15, 0.65), tb + BEAT / 2, 0.55, (m - 66) / 12)
        if montage or tb >= 16.0:
            for k in range(4):
                m = chord[(n * 4 + k) % 4] + 12
                music.add(pluck(m, 0.25, 0.11 + 0.04 * (k == 0), 0.55), tb + k * BEAT / 4, 0.55, 0.5 * np.sin(n + k))
        if pos == 0:
            music.add(pad_chord(chord, BEAT * 4 + 0.4, 0.26, 0.65, seed=n), tb, 0.6)
    # ── efectos de la historia
    for s in R["shots"][2:]:
        fx.add(sfx_whoosh(0.4, int(s["t0"] * 10)), s["t0"] - 0.18, 0.3)
    photo = next(s for s in R["shots"] if s["kind"] == "photo")
    fx.add(knife(21), photo["t0"] + 0.35, 0.6, -0.3)
    fx.add(knife(22), photo["t0"] + 1.25, 0.45, -0.2)
    fx.add(horn(23), R["horn"], 0.55, 0.2)
    fx.add(sfx_city(end_t - 4.0, 24), 4.0, 0.25)
    for i, s in enumerate(R["stickers"]):
        fx.add(LS.pop(320 * 2 ** ((i % 5) * 2 / 12), 40 + i), s["t0"] + 0.03, 0.5, (i % 3 - 1) * 0.3)
    # ── cierre: barrido + logo (tiempos del logo acelerados ×1.3)
    fx.add(sfx_whoosh(0.7, 30), end_t - 0.1, 0.5)
    spd, e0 = R["end"]["speed"], R["end"]["t0"]
    lt = lambda x: e0 + (x - 0.12) / spd
    T = LS.T
    for i, m in enumerate([74, 76, 78, 81, 83, 86, 88]):
        t0 = lt(T["stripes"] + i * T["stripeGap"])
        music.add(pluck(m, 1.2, 0.45, 0.45), t0 + 0.08, 0.5, -0.6 + i * 0.2)
        fx.add(LS.swish(300 + i), t0, 0.3, -0.6 + i * 0.2)
    for j in range(8):
        fx.add(LS.pop(260 * 2 ** (j * 2 / 12), 330 + j), lt(T["letters"] + j * T["letterGap"]) + 0.02, 0.5, -0.5 + j * 0.13)
    for k, r in enumerate((1.0, 1.19, 1.33, 1.5)):
        fx.add(LS.plink(620 * r, 360 + k), lt(T["drops"] + k * T["dropGap"] + T["flight"]), 0.5, 0.3 + k * 0.15)
    fx.add(LS.shimmer(370), lt(T["gloss"]) + 0.05, 0.45, 0.2)
    music.add(pad_chord([50, 57, 62, 66, 69, 76], DUR - end_t + 0.5, 0.32, 0.55, seed=99), end_t + 0.2, 0.75)
    for i, m in enumerate([62, 66, 69, 74, 78]):
        music.add(piano(m, 3.5, 0.4, 0.45), lt(T["drops"] + 3 * T["dropGap"] + T["flight"]) + i * 0.03, 0.5, -0.3 + i * 0.15)
    for k in range(int((DUR - e0) / (BEAT * 2))):
        drums.add(kick(0.5), e0 + 0.2 + k * BEAT * 2, 0.6)
    # ── mezcla
    hall = reverb_ir(2.2, 91, 6000)
    room = reverb_ir(0.6, 92, 8000, pre=0.004)
    mix = convolve(music.x, hall, 0.35) * 0.62 + convolve(drums.x, room, 0.12) * 0.75 + convolve(fx.x, room, 0.2)
    mix = np.vstack([hp(mix[0], 28), hp(mix[1], 28)])[:, : int(DUR * SR)]
    fo = int(0.5 * SR)
    mix[:, -fo:] *= np.linspace(1, 0, fo) ** 2
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.9
    mix = np.tanh(mix * 1.4) / np.tanh(1.4)
    out = ROOT / "build" / "marcaje"
    out.mkdir(parents=True, exist_ok=True)
    wavfile.write(out / "reel_mix.wav", SR, (mix.T * 32767 * 0.95).astype(np.int16))
    print(out / "reel_mix.wav")


if __name__ == "__main__":
    main()
