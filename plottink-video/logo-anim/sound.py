"""Sonido del logo animado (6 s), sincronizado con los tiempos de logo.js (objeto T).
Reutiliza los instrumentos y el DSP de audio/sound.py.

    python3 logo-anim/sound.py   → build/logo/logo_mix.wav
"""
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "audio"))
from sound import (SR, Bus, bp, convolve, fade, hp, lp, noise, pad_chord, piano, pluck,  # noqa: E402
                   reverb_ir, tt)

DUR = 6.0
# mismos tiempos que T en logo.js
T = dict(stripes=0.2, stripeGap=0.075, letters=1.02, letterGap=0.055, flick=1.62, drops=1.72, dropGap=0.075, flight=0.34, gloss=2.55)


def swish(seed, dur=0.32):
    t = tt(dur)
    u = t / dur
    y = bp(noise(len(t), seed), 900, 7000) * np.sin(np.pi * u) ** 1.5 * (1 - u) ** 0.5
    return fade(y * 0.5, 0.002, 0.03)


def pop(f0, seed):
    """Burbuja: seno con caída de tono rápida + clic suave."""
    t = tt(0.16)
    f = f0 * (1.9 * np.exp(-t * 55) + 1.0)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26) * (1 - np.exp(-t * 2500))
    y += bp(noise(len(t), seed), 2000, 6000) * np.exp(-t * 400) * 0.15
    return fade(y * 0.6, 0.0005, 0.02)


def plink(f0, seed):
    """Gota de agua: tono que sube de golpe y decae (resonancia de burbuja)."""
    t = tt(0.35)
    f = f0 * (1 + 1.1 * (1 - np.exp(-t * 60)))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) * (1 - np.exp(-t * 3000))
    y += lp(noise(len(t), seed), 1200) * np.exp(-t * 120) * 0.25
    return fade(y * 0.55, 0.0005, 0.04)


def shimmer(seed, dur=0.9):
    t = tt(dur)
    y = sum(a * np.sin(2 * np.pi * f * t + k) * np.exp(-t * d) for k, (f, a, d) in enumerate(((2637, 0.3, 4), (3951, 0.22, 5), (5274, 0.15, 6), (7040, 0.08, 7))))
    y *= 1 - np.exp(-t * 60)
    y += hp(noise(len(t), seed), 7000) * np.sin(np.pi * t / dur) ** 2 * 0.05
    return fade(y * 0.35, 0.003, 0.1)


def main():
    bus = Bus(DUR)
    music = Bus(DUR)
    # franjas: swish + nota ascendente (pentatónica de Re)
    notes = [74, 76, 78, 81, 83, 86, 88]
    for i, m in enumerate(notes):
        t0 = T["stripes"] + i * T["stripeGap"]
        bus.add(swish(10 + i), t0, 0.35, -0.6 + i * 0.2)
        music.add(pluck(m, 1.2, 0.5, 0.45), t0 + 0.1, 0.45, -0.6 + i * 0.2)
    # letras: pops que suben de tono
    for j in range(8):
        t0 = T["letters"] + j * T["letterGap"]
        bus.add(pop(260 * 2 ** (j * 2 / 12), 30 + j), t0 + 0.02, 0.55, -0.5 + j * 0.13)
    # latigazo de la K + salpicadura
    t = tt(0.22)
    flick = bp(noise(len(t), 50), 1500, 8000) * np.sin(np.pi * t / 0.22) ** 2 * 0.4
    bus.add(flick, T["flick"], 0.6, 0.4)
    # gotas: "plink" al aterrizar
    for k, r in enumerate((1.0, 1.19, 1.33, 1.5)):
        land = T["drops"] + k * T["dropGap"] + T["flight"]
        bus.add(plink(620 * r, 60 + k), land, 0.55, 0.3 + k * 0.15)
    # golpe grave suave cuando el logo queda completo
    t = tt(1.2)
    sub = np.sin(2 * np.pi * (52 + 40 * np.exp(-t * 18)) * t) * np.exp(-t * 4) * 0.6
    bus.add(fade(sub, 0.002, 0.3), T["drops"] + 3 * T["dropGap"] + T["flight"], 0.7)
    # brillo
    bus.add(shimmer(70), T["gloss"] + 0.1, 0.5, 0.2)
    # colchón armónico: acorde Dmaj9 que crece y resuelve
    music.add(pad_chord([50, 57, 62, 66, 69, 76], 5.4, 0.35, 0.45, seed=3), 0.3, 0.8)
    for i, m in enumerate([62, 66, 69, 74, 78]):
        music.add(piano(m, 3.8, 0.35, 0.4), 2.2 + i * 0.03, 0.5, -0.3 + i * 0.15)
    hall = reverb_ir(2.6, 91, 6000)
    room = reverb_ir(0.8, 92, 8000, pre=0.005)
    mix = convolve(music.x, hall, 0.5) * 0.7 + convolve(bus.x, room, 0.25)
    mix = np.vstack([hp(mix[0], 30), hp(mix[1], 30)])[:, : int(DUR * SR)]
    fo = int(0.8 * SR)
    mix[:, -fo:] *= np.linspace(1, 0, fo) ** 2
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.9
    out = HERE.parent / "build" / "logo"
    out.mkdir(parents=True, exist_ok=True)
    wavfile.write(out / "logo_mix.wav", SR, (mix.T * 32767 * 0.95).astype(np.int16))
    print(out / "logo_mix.wav")


if __name__ == "__main__":
    main()
