"""Música y sonido del reel Rompetráfico (23 s, 120 BPM), sincronizados con reel.json.
Reutiliza los instrumentos de audio/sound.py y los efectos del logo (logo-anim/sound.py).

    python3 reel-rompetrafico/sound.py   → build/reel/reel_mix.wav
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
                   piano, pluck, reverb_ir, sfx_city, sfx_impact, sfx_laser, sfx_sparks, sfx_whoosh, shaker, tt)

_spec = importlib.util.spec_from_file_location("logo_sound", ROOT / "logo-anim" / "sound.py")
LS = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(LS)

R = json.loads((HERE / "reel.json").read_text())
DUR = R["dur"]
BEAT = 60 / R["bpm"]
B0 = R["beat0"]


def clap(seed, vel=0.6):
    t = tt(0.3)
    nz = bp(noise(len(t), seed), 900, 4500)
    env = np.zeros_like(t)
    for k, o in enumerate((0.0, 0.011, 0.022)):
        env += np.exp(-np.clip(t - o, 0, None) * (220 if k < 2 else 28)) * (t >= o)
    return fade(nz * env * vel * 0.5, 0.0005, 0.03)


def hat(seed, open_=False, vel=0.25):
    t = tt(0.35 if open_ else 0.06)
    return fade(hp(noise(len(t), seed), 7500) * np.exp(-t * (9 if open_ else 70)) * vel, 0.0005, 0.01)


def crash(seed):
    t = tt(2.2)
    return fade(hp(noise(len(t), seed), 3500) * np.exp(-t * 2.2) * 0.35, 0.001, 0.3)


def riser(dur, seed):
    t = tt(dur)
    u = t / dur
    nz = noise(len(t), seed)
    y = (bp(nz, 400, 2500) * (1 - u) + hp(nz, 2500) * u) * u ** 2.2 * 0.45
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (u * 2.5)) / SR) * u ** 3 * 0.12
    return y + tone


def shutter(seed):
    t = tt(0.25)
    a = bp(noise(len(t), seed), 1500, 7000) * np.exp(-t * 180)
    b = bp(noise(len(t), seed + 1), 1200, 6000) * np.exp(-np.clip(t - 0.07, 0, None) * 160) * (t > 0.07)
    return fade((a + b * 0.8) * 0.6, 0.0005, 0.02)


# I–V–vi–IV en Re: acorde (para stabs) y raíz (para el bajo)
PROG = [([62, 66, 69, 74], 38), ([61, 64, 69, 73], 33), ([62, 66, 71, 74], 35), ([62, 67, 71, 74], 31)]


def main():
    music, drums, fx = Bus(DUR), Bus(DUR), Bus(DUR)
    st = {s["text"]: s for s in R["stickers"]}
    brk0, drop_t = R["freeze"]["t0"], R["photo"]["t0"]
    end_t = R["wipeOut"][0]
    # ── intro: glissando de las franjas del barrido + riser corto
    for i, m in enumerate([74, 76, 78, 81, 83, 86, 88]):
        music.add(pluck(m, 0.9, 0.45, 0.5), 0.02 + i * 0.05, 0.5, -0.6 + i * 0.2)
        fx.add(LS.swish(200 + i, 0.22), i * 0.04, 0.25, -0.6 + i * 0.2)
    fx.add(riser(0.6, 5), 0.0, 0.5)
    # ── groove: kick 4/4, clap 2 y 4, hats a contratiempo, bajo y stabs
    nbeats = int((end_t - B0) / BEAT) + 1
    for n in range(nbeats):
        tb = B0 + n * BEAT
        bar, pos = divmod(n, 4)
        chord, root = PROG[bar % 4]
        in_break = brk0 <= tb < drop_t
        after = tb >= drop_t
        if tb >= end_t:
            break
        if not in_break:
            drums.add(kick(0.85), tb, 0.95)
            if pos in (1, 3):
                drums.add(clap(n), tb, 0.8, 0.05)
            drums.add(hat(n, open_=after and pos % 2 == 1, vel=0.3 if after else 0.22), tb + BEAT / 2, 0.8, 0.3)
            for k in (0.25, 0.75):
                drums.add(shaker(0.1, seed=n * 7 + int(k * 4)), tb + BEAT * k, 0.6, -0.3)
            # bajo: corcheas con octava
            for k, o in enumerate((0, 12)):
                music.add(bass(root + o, BEAT * 0.45, 0.55 if o == 0 else 0.35), tb + k * BEAT / 2, 0.8)
            # stab en la "y"
            for m in chord:
                music.add(pluck(m, 0.35, 0.16, 0.65), tb + BEAT / 2, 0.55, (m - 68) / 12)
            # arpegio en semicorcheas después del drop
            if after:
                for k in range(4):
                    m = chord[(n * 4 + k) % 4] + 12
                    music.add(pluck(m, 0.25, 0.1 + 0.04 * (k == 0), 0.55), tb + k * BEAT / 4, 0.55, 0.5 * np.sin(n + k))
        else:
            # redoble que acelera hacia la revelación
            frac = (tb - brk0) / (drop_t - brk0)
            sub = 2 if frac < 0.34 else 4 if frac < 0.67 else 8
            for k in range(sub):
                drums.add(clap(500 + n * 8 + k, 0.25 + 0.5 * frac), tb + k * BEAT / sub, 0.7)
        if pos == 0 and not in_break:
            music.add(pad_chord(chord, BEAT * 4 + 0.4, 0.22 if not after else 0.3, 0.5 if not after else 0.7, seed=n), tb, 0.6)
    # ── ruptura: obturador, riser y golpe en la revelación
    fx.add(shutter(9), brk0, 0.7)
    fx.add(sfx_whoosh(0.5, 8), brk0 - 0.15, 0.4)
    fx.add(riser(drop_t - brk0, 11), brk0, 0.8)
    fx.add(sfx_impact(12), drop_t, 0.9)
    drums.add(crash(13), drop_t, 0.8)
    # ── ambiente de avenida en la escena nocturna: rumor de ciudad + carros que pasan
    fx.add(sfx_city(end_t - drop_t, 55), drop_t, 0.45)
    for k, dt in enumerate((0.9, 2.6, 4.1, 5.7)):
        fx.add(sfx_whoosh(1.1, 60 + k), drop_t + dt, 0.2)
    # ── láser bajo el corte (clips A y C)
    for c, g in ((R["clips"][0], 0.5), (R["clips"][2], 0.45)):
        a = max(c["t0"], 0.45)
        fx.add(sfx_laser(c["t1"] - a, [[0, 0.75], [1, 0.8]], 21), a, g * 0.5)
        fx.add(sfx_sparks(c["t1"] - a, [0.3, 0.35], 22), a, g * 0.35)
    # whoosh en cada corte
    for c in R["clips"][1:]:
        fx.add(sfx_whoosh(0.45, int(c["t0"] * 10)), c["t0"] - 0.2, 0.35)
    # ── pops de las etiquetas
    for i, s in enumerate(R["stickers"]):
        fx.add(LS.pop(320 * 2 ** ((i % 5) * 2 / 12), 40 + i), s["t0"] + 0.03, 0.55, (i % 3 - 1) * 0.3)
    # gotas CMYK de la salpicadura
    for k in range(4):
        fx.add(LS.plink(620 * (1.0, 1.19, 1.33, 1.5)[k], 70 + k), R["burst"] + k * 0.05 + 0.3, 0.45, (-0.5, 0.6, 0.6, -0.5)[k])
    # ── transición al cierre: barrido + logo (tiempos del logo acelerados ×1.3)
    fx.add(sfx_whoosh(0.7, 30), end_t - 0.1, 0.5)
    spd, e0 = R["end"]["speed"], R["end"]["t0"]
    lt = lambda x: e0 + (x - 0.12) / spd  # tiempo del logo → tiempo del reel
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
    # cierre musical: pad + acorde de piano + bombo suave a medio tiempo
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
    out = ROOT / "build" / "reel"
    out.mkdir(parents=True, exist_ok=True)
    wavfile.write(out / "reel_mix.wav", SR, (mix.T * 32767 * 0.95).astype(np.int16))
    print(out / "reel_mix.wav")


if __name__ == "__main__":
    main()
