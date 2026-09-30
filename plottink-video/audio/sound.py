"""PlottInk — diseño sonoro y música sintetizados (sin samples externos).

Lee timeline.json (la misma fuente que la imagen) y genera, por corte:
  build/audio/<cut>_mix.wav   (estéreo 48 kHz)
Los efectos se anclan a las marcas de cada escena, así que imagen y sonido
comparten los mismos tiempos de corte.

    python3 audio/sound.py full c45 c30
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "timeline.json").read_text())
OUT = ROOT / "build" / "audio"


# ───────────────────────── utilidades DSP ─────────────────────────
def _sos(kind, f, order=2):
    return butter(order, f, kind, fs=SR, output="sos")


def lp(x, f, order=2):
    return sosfilt(_sos("lowpass", min(f, SR / 2 - 100), order), x)


def hp(x, f, order=2):
    return sosfilt(_sos("highpass", f, order), x)


def bp(x, lo, hi, order=2):
    return sosfilt(_sos("bandpass", [lo, min(hi, SR / 2 - 100)], order), x)


def noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def fade(x, a=0.005, r=0.02):
    n = len(x)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        x[:na] *= np.linspace(0, 1, na)
    if nr:
        x[-nr:] *= np.linspace(1, 0, nr)
    return x


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


class Bus:
    """Bus estéreo con colocación por tiempo y paneo de potencia constante."""

    def __init__(self, dur):
        self.n = int(dur * SR) + SR * 4
        self.x = np.zeros((2, self.n))

    def add(self, sig, t, gain=1.0, pan=0.0):
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.vstack([sig * np.cos(a), sig * np.sin(a)])
        i = int(round(t * SR))
        if i >= self.n:
            return
        if i < 0:
            sig = sig[:, -i:]
            i = 0
        m = min(sig.shape[1], self.n - i)
        self.x[:, i:i + m] += sig[:, :m] * gain


def reverb_ir(rt60, seed, damp=6000, pre=0.012):
    n = int(rt60 * 1.2 * SR)
    t = np.arange(n) / SR
    env = np.exp(-6.9 * t / rt60)
    ir = []
    for ch in range(2):
        nz = noise(n, seed + ch) * env
        # amortiguación: la cola se oscurece
        nz = 0.6 * lp(nz, damp) + 0.4 * lp(nz, damp / 4)
        ir.append(np.concatenate([np.zeros(int(pre * SR)), nz]))
    ir = np.array(ir)
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))


def convolve(x, ir, wet):
    y = np.vstack([fftconvolve(x[c], ir[c])[: x.shape[1]] for c in range(2)])
    return x * (1 - wet * 0.3) + y * wet


# ───────────────────────── instrumentos musicales ─────────────────────────
def piano(m, dur=3.2, vel=0.6, bright=0.6):
    t = tt(dur)
    f = mtof(m)
    B = 0.00035
    y = np.zeros_like(t)
    for n in range(1, 12):
        fn = n * f * np.sqrt(1 + B * n * n)
        if fn > 12000:
            break
        amp = (1 / n ** 1.15) * (bright ** (n - 1) * 0.6 + 0.4 / n)
        y += amp * np.sin(2 * np.pi * fn * t + n) * np.exp(-t * (0.7 + 0.55 * n))
    ham = lp(noise(len(t), int(m * 7)), 1800) * np.exp(-t * 90) * 0.12
    y = (y + ham) * vel
    y *= 1 - np.exp(-t * 400)
    return fade(y, 0.001, 0.3)


def pluck(m, dur=0.9, vel=0.5, bright=0.5):
    t = tt(dur)
    f = mtof(m)
    y = np.zeros_like(t)
    for n in range(1, 9):
        y += (1 / n ** 1.3) * np.sin(2 * np.pi * n * f * t) * np.exp(-t * (4 + n * (6 - 4 * bright)))
    y *= 1 - np.exp(-t * 900)
    return fade(y * vel, 0.001, 0.05)


def pad_chord(notes, dur, vel=0.25, cutoff=0.5, seed=0):
    t = tt(dur)
    y = np.zeros((2, len(t)))
    rng = np.random.default_rng(seed)
    for m in notes:
        f = mtof(m)
        for v, det in enumerate((-7, 6)):
            fd = f * 2 ** (det / 1200)
            ph = rng.uniform(0, 2 * np.pi, 16)
            s = np.zeros_like(t)
            for n in range(1, 16):
                if n * fd > 9000:
                    break
                w = (1 / n ** 1.2) * np.exp(-(n - 1) * (1.4 - cutoff))
                s += w * np.sin(2 * np.pi * n * fd * t + ph[n])
            trem = 1 + 0.08 * np.sin(2 * np.pi * (0.13 + 0.05 * v) * t + m)
            y[v] += s * trem
    att, rel = min(1.2, dur * 0.4), min(1.6, dur * 0.5)
    env = np.minimum(1, t / att) * np.minimum(1, (dur - t) / rel).clip(0)
    return y * env * vel / max(1, len(notes))


def kick(vel=0.8):
    t = tt(0.5)
    f = 46 + 70 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t * 7.5) + lp(noise(len(t), 3), 3000) * np.exp(-t * 180) * 0.15
    return fade(y * vel, 0.0005, 0.05)


def shaker(vel=0.2, seed=0):
    t = tt(0.09)
    y = hp(noise(len(t), seed), 6000) * np.exp(-t * 60) * (1 - np.exp(-t * 400))
    return y * vel


def bass(m, dur, vel=0.5):
    t = tt(dur)
    f = mtof(m)
    y = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    env = (1 - np.exp(-t * 60)) * np.exp(-t * 1.2)
    return fade(y * env * vel, 0.002, 0.08)


# ───────────────────────── efectos ─────────────────────────
def sfx_tick(seed):
    t = tt(0.08)
    y = hp(noise(len(t), seed), 4000) * np.exp(-t * 700) * 0.6 + np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 90) * 0.4
    return y


def sfx_laser(dur, speed, seed, sparky=0.0):
    """Cortadora láser: motores paso a paso que 'cantan' con la velocidad + siseo del aire + chisporroteo."""
    t = tt(dur)
    u = t / max(dur, 1e-6)
    pts = np.array(speed, dtype=float)
    sp = np.interp(u, pts[:, 0], pts[:, 1])
    jitter = 1 + 0.015 * lp(noise(len(t), seed), 8) * 10
    f = (180 + 1350 * sp) * jitter
    ph = 2 * np.pi * np.cumsum(f) / SR
    whine = sum((1 / k ** 1.6) * np.sin(k * ph) for k in (1, 3, 5, 7))
    whine += 0.3 * np.sin(2 * ph + 0.5)
    whine = bp(whine, 150, 5500) * (0.1 + 0.28 * sp)
    air = hp(noise(len(t), seed + 1), 2500) * 0.09
    burn = bp(noise(len(t), seed + 2), 1800, 7000) * (0.5 + 0.5 * lp(np.abs(noise(len(t), seed + 3)), 30) * 3) * 0.12
    hum = (np.sin(2 * np.pi * 60 * t) + 0.5 * np.sin(2 * np.pi * 120 * t) + 0.25 * np.sin(2 * np.pi * 180 * t)) * 0.06
    y = (whine + air + burn + hum) * (0.3 + 0.7 * sp)
    return fade(y, 0.04, 0.06)


def sfx_sparks(dur, dens, seed, rate=520):
    n = int(dur * SR)
    y = np.zeros((2, n))
    rng = np.random.default_rng(seed)
    t = 0.0
    while True:
        d = dens[0] + (dens[1] - dens[0]) * (t / max(dur, 1e-6))
        t += rng.exponential(1 / (rate * max(d, 0.02)))
        if t >= dur:
            break
        L = int(rng.uniform(0.0004, 0.004) * SR)
        b = rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * rng.exponential(0.4)
        i = int(t * SR)
        if i + L >= n:
            break
        pan = rng.uniform(-0.8, 0.8)
        y[0, i:i + L] += b * np.cos((pan + 1) * np.pi / 4)
        y[1, i:i + L] += b * np.sin((pan + 1) * np.pi / 4)
    return np.vstack([hp(y[0], 2500), hp(y[1], 2500)]) * 0.9


def sfx_impact(seed):
    t = tt(3.0)
    f = 34 + 44 * np.exp(-t * 3)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.tanh(1.6 * np.sin(ph)) * np.exp(-t * 1.5)
    trans = lp(noise(len(t), seed), 900) * np.exp(-t * 25) * 0.5
    air = bp(noise(len(t), seed + 1), 300, 3000) * np.exp(-t * 3) * 0.05
    return fade(body + trans + air, 0.002, 0.5)


def sfx_freeze(seed):
    t = tt(2.5)
    thump = np.sin(2 * np.pi * (48 + 30 * np.exp(-t * 20)) * t) * np.exp(-t * 6) * 0.8
    tail = lp(noise(len(t), seed), 1200) * np.exp(-t * 1.6) * 0.12
    sh = sum(np.sin(2 * np.pi * f * t) for f in (2960, 3520, 4435)) * np.exp(-t * 1.1) * 0.02
    return fade(thump + tail + sh, 0.001, 0.4)


def sfx_ui(seed):
    t = tt(0.25)
    y = np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 30) * (t < 0.12)
    y += np.sin(2 * np.pi * 1980 * t) * np.exp(-(t - 0.07).clip(0) * 30) * (t > 0.07)
    return fade(y * 0.5, 0.003, 0.05)


def sfx_whoosh(dur, seed):
    t = tt(dur)
    u = t / dur
    nz = noise(len(t), seed)
    lo, mi, hi = bp(nz, 150, 600), bp(nz, 600, 2500), bp(nz, 2500, 9000)
    env = np.sin(np.pi * u) ** 2
    w_lo, w_mi, w_hi = (1 - u) ** 2, np.sin(np.pi * u), u ** 2
    y = (lo * w_lo * 0.9 + mi * w_mi * 0.6 + hi * w_hi * 0.35) * env
    pan = np.linspace(-0.6, 0.6, len(t))
    a = (pan + 1) * np.pi / 4
    return np.vstack([y * np.cos(a), y * np.sin(a)])


def sfx_click(seed, f=1500, dec=0.02, vel=0.6):
    t = tt(0.12)
    y = bp(noise(len(t), seed), f * 0.6, f * 1.8) * np.exp(-t * 300) + np.sin(2 * np.pi * f * 0.6 * t) * np.exp(-t / dec) * 0.5
    return y * vel


def sfx_tap(material, seed):
    t = tt(1.8)
    nz = noise(len(t), seed)
    if material == "acrylic":
        y = bp(nz, 2000, 6000) * np.exp(-t * 250) + sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((2300, 60), (3900, 90))) * 0.3
    elif material == "mdf":
        y = lp(nz, 500) * np.exp(-t * 40) * 1.4 + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 30) * 0.5
    elif material == "leather":
        y = bp(nz, 400, 1600) * np.exp(-t * 55) * 0.9
    elif material == "glass":
        y = bp(nz, 3000, 9000) * np.exp(-t * 400) * 0.5 + sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in ((2637, 0.5, 3), (5412, 0.3, 4.5), (8021, 0.15, 6)))
    elif material == "metal":
        y = bp(nz, 2000, 8000) * np.exp(-t * 300) * 0.4 + sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in ((1850, 0.4, 2.2), (2790, 0.3, 2.6), (4210, 0.2, 3.5), (5630, 0.12, 4)))
    elif material == "wood":
        y = bp(nz, 500, 2500) * np.exp(-t * 120) + sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 35) for f in (720, 1410)) * 0.4
    else:
        y = bp(nz, 800, 3000) * np.exp(-t * 100)
    return fade(y, 0.0005, 0.1)


def sfx_raster(dur, line_rate, seed):
    t = tt(dur)
    sweep_phase = (t * line_rate) % 1.0
    # velocidad del cabezal: rápida en el centro de la pasada, frena en las vueltas
    sp = np.sin(np.pi * sweep_phase) ** 0.5
    f = 300 + 1100 * sp
    ph = 2 * np.pi * np.cumsum(f) / SR
    whine = bp(sum((1 / k) * np.sin(k * ph) for k in (1, 3, 5)), 200, 6000) * 0.35
    pulses = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 230 * t))
    burn = bp(noise(len(t), seed), 1500, 6000) * pulses * 0.12 * sp
    y = whine + burn + hp(noise(len(t), seed + 5), 3000) * 0.05
    return fade(y, 0.03, 0.05)


def sfx_unroll(dur, seed):
    t = tt(dur)
    rum = lp(noise(len(t), seed), 350) * 0.7 * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.5
    y = rum
    rng = np.random.default_rng(seed)
    tc = 0.0
    while tc < dur:
        rate = 18 + 30 * np.sin(np.pi * tc / dur)
        tc += 1 / rate
        i = int(tc * SR)
        c = sfx_click(seed + i, 2200, 0.004, 0.18)
        m = min(len(c), len(y) - i)
        if m > 0:
            y[i:i + m] += c[:m]
    return fade(y, 0.05, 0.1)


def sfx_squeegee(dur, seed):
    t = tt(dur)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * (35 + 10 * np.sin(2 * np.pi * 1.3 * t)) * t)
    y = bp(noise(len(t), seed), 700, 3500) * am * 0.4
    sq = np.sin(2 * np.pi * np.cumsum(1150 + 120 * np.sin(2 * np.pi * 2.1 * t)) / SR) * 0.06 * (np.sin(2 * np.pi * 0.9 * t) > 0.6)
    return fade(y + sq, 0.05, 0.1)


def sfx_peel(dur, seed):
    n = int(dur * SR)
    y = np.zeros(n)
    rng = np.random.default_rng(seed)
    t = 0.0
    while True:
        t += rng.exponential(1 / 900)
        if t >= dur:
            break
        i, L = int(t * SR), int(rng.uniform(0.0003, 0.002) * SR)
        if i + L >= n:
            break
        y[i:i + L] += rng.standard_normal(L) * rng.exponential(0.3) * np.exp(-np.arange(L) / (L / 3))
    y = bp(y, 900, 7000) * (0.4 + 0.6 * np.sin(np.pi * np.arange(n) / n))
    return fade(y * 0.8, 0.02, 0.05)


def sfx_city(dur, seed):
    t = tt(dur)
    rum = lp(np.cumsum(noise(len(t), seed)) * 0.002, 200)
    rum = rum - lp(rum, 20)
    car = bp(noise(len(t), seed + 1), 200, 1400) * np.exp(-((t - dur * 0.55) / (dur * 0.18)) ** 2) * 0.25
    y = rum * 6 + car
    return np.vstack([y, np.roll(y, 800)]) * 0.5


def sfx_relay(seed):
    t = tt(0.35)
    clk = np.pad(sfx_click(seed, 2600, 0.005, 0.5), (0, len(t)))[: len(t)]
    thump = np.sin(2 * np.pi * 150 * t) * np.exp(-t * 40) * 0.5
    buzz = sum(np.sin(2 * np.pi * 60 * k * t) / k for k in range(1, 12, 2)) * np.exp(-t * 14) * 0.12 * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 23 * t)))
    return fade(clk + thump + buzz, 0.0005, 0.05)


def sfx_hum(dur, seed):
    t = tt(dur)
    y = sum(np.sin(2 * np.pi * 60 * k * t + k) / k ** 1.5 for k in range(1, 8)) * 0.12
    y += hp(noise(len(t), seed), 5000) * 0.01
    return fade(y, 0.2, 0.3)


def sfx_placement(seed, kind=0):
    t = tt(0.8)
    y = lp(noise(len(t), seed), 700) * np.exp(-t * 45) * 0.9 + np.sin(2 * np.pi * 110 * t) * np.exp(-t * 35) * 0.4
    if kind == 1:  # cerámica
        y += sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in ((1950, 0.18, 9), (4100, 0.08, 12)))
    if kind == 2:  # argolla metálica
        rng = np.random.default_rng(seed)
        for k in range(5):
            o = int(rng.uniform(0, 0.12) * SR)
            f = rng.uniform(3000, 7000)
            y[o:] += 0.06 * np.sin(2 * np.pi * f * t[: len(t) - o]) * np.exp(-t[: len(t) - o] * 25)
    return fade(y, 0.0005, 0.1)


def sfx_pencil(dur, seed):
    t = tt(dur)
    strokes = 0.5 + 0.5 * np.sin(2 * np.pi * (7 + 3 * np.sin(2 * np.pi * 0.7 * t)) * t)
    y = bp(noise(len(t), seed), 2500, 9000) * strokes ** 2 * 0.3 + bp(noise(len(t), seed + 1), 400, 1500) * strokes * 0.05
    return fade(y, 0.05, 0.1)


def sfx_chat(seed):
    y = np.zeros(int(0.5 * SR))
    for k, (m, o) in enumerate(((88, 0.0), (93, 0.075))):
        p = pluck(m, 0.4, 0.5, 0.2)
        i = int(o * SR)
        y[i:i + len(p)] += p[: len(y) - i]
    return y


def sfx_stamp(seed):
    t = tt(0.6)
    return fade(lp(noise(len(t), seed), 1200) * np.exp(-t * 40) + np.sin(2 * np.pi * 90 * t) * np.exp(-t * 25) * 0.7 + bp(noise(len(t), seed + 1), 2000, 6000) * np.exp(-t * 90) * 0.3, 0.0005, 0.1)


def sfx_box(seed):
    t = tt(0.9)
    y = lp(noise(len(t), seed), 500) * np.exp(-t * 18) * 0.9 + bp(noise(len(t), seed + 1), 800, 4000) * np.exp(-t * 10) * 0.2
    return fade(y, 0.001, 0.1)


def sfx_route(seed):
    t = tt(0.5)
    f = 900 + 900 * t / 0.5
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.5) ** 2 * 0.3
    return y


def sfx_air(dur, seed):
    t = tt(dur)
    y = bp(noise(len(t), seed), 300, 6000) * np.sin(np.pi * t / dur) ** 2 * 0.2
    return y


def sfx_shimmer(dur, seed):
    t = tt(dur)
    y = hp(noise(len(t), seed), 5000) * np.sin(np.pi * t / dur) ** 2 * 0.06
    rng = np.random.default_rng(seed)
    mats = ["acrylic", "wood", "glass", "metal", "mdf", "leather"]
    for k in range(36):
        o = int(rng.uniform(0, dur * 0.8) * SR)
        s = sfx_tap(mats[k % 6], seed + k)[: int(0.6 * SR)] * 0.12
        m = min(len(s), len(y) - o)
        y[o:o + m] += s[:m]
    return y


# ───────────────────────── resolución del timeline ─────────────────────────
def scene_list(cut):
    t0, out = 0.0, []
    for sid, dur in TL["cuts"][cut]["scenes"]:
        out.append((sid, t0, dur))
        t0 += dur
    return out, t0


def frac(sdef, v):
    if isinstance(v, str):
        return sdef["marks"][v]
    return float(v)


def build_sfx(cut, total):
    bus = Bus(total)
    note_bus = Bus(total)
    scenes, _ = scene_list(cut)
    seed = 100
    for sid, st, dur in scenes:
        sdef = TL["scenes"].get(sid, {})
        for cue in sdef.get("sfx", []):
            seed += 17
            a = st + frac(sdef, cue["at"]) * dur
            b = st + frac(sdef, cue.get("until", cue["at"])) * dur
            g = cue.get("gain", 0.5)
            ty = cue["type"]
            if ty == "tick":
                bus.add(sfx_tick(seed), a, g)
            elif ty == "laser":
                bus.add(sfx_laser(b - a, cue.get("speed", [[0, 0.5], [1, 0.5]]), seed), a, g * 0.8, 0.05)
            elif ty == "sparks":
                bus.add(sfx_sparks(b - a, cue.get("density", [0.5, 0.5]), seed), a, g * 0.5)
            elif ty == "freeze":
                bus.add(sfx_freeze(seed), a, g)
            elif ty == "note":
                note_bus.add(piano(cue.get("pitch", 81), 5.0, 0.5, 0.3), a, g)
                note_bus.add(piano(cue.get("pitch", 81) - 12, 5.0, 0.3, 0.2), a + 0.01, g * 0.6)
            elif ty == "impact":
                bus.add(sfx_impact(seed), a, g)
            elif ty == "ui":
                bus.add(sfx_ui(seed), a, g, 0.2)
            elif ty == "whoosh":
                bus.add(sfx_whoosh(cue.get("dur", 0.8) * min(1, dur / 5), seed), a, g)
            elif ty == "clicks":
                n, d = cue.get("count", 8), cue.get("dur", 1.0) * dur / 7.5
                for k in range(n):
                    tk = a + d * (k / n) ** 0.8
                    bus.add(sfx_click(seed + k, 1200 + 400 * (k % 3), 0.02, 0.5), tk, g, np.sin(k * 1.7) * 0.6)
            elif ty == "pop":
                bus.add(sfx_tap("acrylic", seed), a, g)
                bus.add(sfx_tap("mdf", seed + 1), a + 0.01, g * 0.4)
            elif ty == "raster":
                bus.add(sfx_raster(b - a, cue.get("lineRate", 12), seed), a, g * 0.7)
            elif ty == "tap":
                bus.add(sfx_tap(cue["material"], seed), a, g, 0.0)
            elif ty == "shimmer":
                bus.add(sfx_shimmer(cue.get("dur", 1.5) * min(1, dur / 6.25), seed), a, g)
            elif ty == "unroll":
                bus.add(sfx_unroll(b - a, seed), a, g)
            elif ty == "snap":
                bus.add(sfx_click(seed, 2400, 0.01, 0.8), a, g)
                bus.add(sfx_tap("metal", seed + 1)[: int(0.3 * SR)], a + 0.01, g * 0.3)
            elif ty == "squeegee":
                bus.add(sfx_squeegee(b - a, seed), a, g)
            elif ty == "peel":
                bus.add(sfx_peel(b - a, seed), a, g)
            elif ty == "city":
                bus.add(sfx_city(b - a, seed), a, g)
            elif ty == "relays":
                n = cue.get("count", 6)
                for k in range(n):
                    bus.add(sfx_relay(seed + k), a + (b - a) * k / n, g, -0.4 + 0.8 * k / max(1, n - 1))
            elif ty == "hum":
                bus.add(sfx_hum(b - a, seed), a, g)
            elif ty == "placements":
                n = cue.get("count", 8)
                for k in range(n):
                    kind = 1 if k == 1 else 2 if 2 <= k <= 4 else 0
                    bus.add(sfx_placement(seed + k, kind), a + (b - a) * k / n + 0.03 * dur / 5, g, np.sin(k * 2.3) * 0.5)
            elif ty == "sparkle":
                for k in range(5):
                    bus.add(sfx_laser(0.12, [[0, 1], [1, 1]], seed + k), a + k * 0.03 * dur / 5 * 3, g * 0.5, np.sin(k) * 0.5)
            elif ty == "pencil":
                bus.add(sfx_pencil(b - a, seed), a, g)
            elif ty == "nodes":
                n = cue.get("count", 8)
                for k in range(n):
                    bus.add(sfx_tick(seed + k), a + (b - a) * k / n, g * 0.6, np.sin(k * 1.3) * 0.5)
            elif ty == "chat":
                bus.add(sfx_chat(seed), a, g, 0.15)
            elif ty == "stamp":
                bus.add(sfx_stamp(seed), a, g)
            elif ty == "checks":
                n = cue.get("count", 10)
                for k in range(n):
                    bus.add(sfx_click(seed + k, 3000, 0.008, 0.4), a + (b - a) * k / n, g, np.sin(k * 1.1) * 0.6)
            elif ty == "box":
                bus.add(sfx_box(seed), a, g)
            elif ty == "routes":
                n = cue.get("count", 6)
                for k in range(n):
                    bus.add(sfx_route(seed + k), a + (b - a) * k / n, g, np.sin(k * 1.9) * 0.6)
            elif ty == "air":
                bus.add(sfx_air(cue.get("dur", 1.0) * dur / 5 + 0.5, seed), a, g)
    return bus, note_bus


# ───────────────────────── partitura ─────────────────────────
# Re mayor, 96 BPM. Acordes (voicings abiertos) y raíces para el bajo.
CHORDS = {
    "D": ([50, 57, 62, 64, 66, 69], 38),   # Dmaj9
    "Bm": ([47, 54, 59, 62, 64, 66], 35),  # Bm11
    "G": ([43, 50, 55, 59, 62, 66], 31),   # Gmaj9
    "A": ([45, 52, 57, 62, 64, 69], 33),   # Asus
}
PROG = ["D", "Bm", "G", "A"]
ARP = [0, 2, 3, 4, 5, 4, 3, 2]  # índices sobre el voicing (+12)
MOTIF = [(0, 78), (1.5, 76), (2, 74), (3, 73)]  # (beat, nota) motivo de piano


def build_music(cut, total):
    c = TL["cuts"][cut]
    S = c["sections"]
    beat = 60 / TL["bpm"]
    bar = beat * 4
    t0 = c["musicStart"]
    bus = Bus(total)
    drums = Bus(total)
    nb = int(np.ceil((S["end"] - t0) / bar)) + 1
    for b in range(nb):
        tb = t0 + b * bar
        if tb >= S["end"]:
            break
        sec = "intro" if tb < S["build"] else "build" if tb < S["peak"] else "peak" if tb < S["drop"] else "drop" if tb < S["resolve"] else "resolve"
        # acorde: 2 compases por acorde en la intro, 1 en el resto
        idx = (b // 2) if sec == "intro" else b
        name = PROG[idx % 4]
        if sec == "drop":
            name = ["G", "A"][min(1, int((tb - S["drop"]) / bar))]
        if sec == "resolve":
            name = "D"
        notes, root = CHORDS[name]
        # progreso de intensidad dentro de la construcción
        prog = np.clip((tb - S["build"]) / max(1e-3, S["drop"] - S["build"]), 0, 1)
        padv = {"intro": 0.5, "build": 0.45 + 0.2 * prog, "peak": 0.7, "drop": 0.5, "resolve": 0.55}[sec]
        cutoff = {"intro": 0.35, "build": 0.4 + 0.4 * prog, "peak": 0.85, "drop": 0.45, "resolve": 0.5}[sec]
        pad_len = bar * (2 if sec == "intro" and b % 2 == 0 else 1) + 1.0
        if not (sec == "intro" and b % 2 == 1):
            if sec == "resolve":
                pad_len = S["end"] - tb + 0.5
            bus.add(pad_chord(notes, pad_len, padv, cutoff, seed=b), tb, 0.9)
        # piano: motivo escaso en intro/drop, acorde final en resolve
        if sec in ("intro", "drop") and b % 2 == 0:
            for (bt, m) in MOTIF:
                if tb + bt * beat < S["end"]:
                    bus.add(piano(m - (0 if name in ("D", "A") else 2 if name == "G" else 3), 3.5, 0.35, 0.35), tb + bt * beat, 0.7, 0.2)
        if sec == "resolve" and tb == min(t0 + k * bar for k in range(nb) if t0 + k * bar >= S["resolve"]):
            for i, m in enumerate([50, 57, 62, 66, 69, 76]):
                bus.add(piano(m, 6.0, 0.45, 0.35), tb + i * 0.035, 0.75, -0.3 + i * 0.12)
            bus.add(pluck(90, 3.0, 0.35, 0.1), tb + 0.4, 0.5, 0.3)
        # arpegio de pulsos (8vos) desde build
        if sec in ("build", "peak"):
            for k in range(8):
                te = tb + k * beat / 2
                if te >= S["drop"]:
                    break
                m = notes[ARP[k] % len(notes)] + 12
                v = 0.22 + 0.12 * prog + (0.08 if k % 2 == 0 else 0)
                bus.add(pluck(m, 0.9, v, 0.35 + 0.4 * prog), te, 0.8, -0.35 if k % 2 else 0.35)
            # contra-arpegio en 16vos agudo en la segunda mitad
            if prog > 0.45 or sec == "peak":
                for k in range(16):
                    te = tb + k * beat / 4
                    if te >= S["drop"]:
                        break
                    if k % 3 == 1:
                        continue
                    m = notes[(k * 3) % len(notes)] + 24
                    bus.add(pluck(m, 0.4, 0.07 + 0.06 * prog, 0.2), te, 0.8, 0.6 * np.sin(k))
            # bajo
            if prog > 0.25 or sec == "peak":
                for k in (0, 2.5, 3):
                    te = tb + k * beat
                    if te < S["drop"]:
                        bus.add(bass(root, beat * (1.8 if k == 0 else 0.45), 0.5), te, 0.8)
        # batería suave en el pico (y la última parte de build)
        if sec == "peak" or (sec == "build" and prog > 0.7):
            for k in range(4):
                te = tb + k * beat
                if te < S["drop"]:
                    drums.add(kick(0.75 if sec == "peak" else 0.5), te, 0.9)
            for k in range(16):
                te = tb + k * beat / 4
                if te < S["drop"]:
                    drums.add(shaker(0.22 if k % 2 else 0.12, seed=b * 16 + k), te, 0.8, 0.3)
    # subida (riser) hacia el drop
    rise = 2.5 if S["drop"] - S["peak"] > 4 else 1.2
    tr = tt(rise)
    riser = hp(noise(len(tr), 9), 1500) * (tr / rise) ** 3 * 0.2
    bus.add(riser, S["drop"] - rise, 0.8)
    return bus, drums


# ───────────────────────── mezcla ─────────────────────────
def render(cut):
    _, total = scene_list(cut)
    sfx, notes = build_sfx(cut, total)
    mus, drums = build_music(cut, total)
    hall = reverb_ir(3.2, 71, 5000)
    room = reverb_ir(0.9, 81, 7000, pre=0.006)
    music = convolve(mus.x + notes.x, hall, 0.55) + convolve(drums.x, room, 0.2)
    fx = convolve(sfx.x, room, 0.22)
    # duck suave de la música cuando el láser domina (primeros 12 s ya no hay música)
    mix = fx * 1.0 + music * 0.55
    mix = np.vstack([hp(mix[0], 28), hp(mix[1], 28)])
    n = int(total * SR)
    mix = mix[:, :n]
    # cola final
    fo = int(1.2 * SR)
    mix[:, -fo:] *= np.linspace(1, 0, fo) ** 2
    # limitador suave
    peak = np.max(np.abs(mix)) + 1e-9
    mix = mix / peak * 0.9
    mix = np.tanh(mix * 1.3) / np.tanh(1.3)
    OUT.mkdir(parents=True, exist_ok=True)
    f = OUT / f"{cut}_mix.wav"
    wavfile.write(f, SR, (mix.T * 32767 * 0.95).astype(np.int16))
    print(f"{f}  ({total:.2f} s)")


if __name__ == "__main__":
    for c in sys.argv[1:] or ["full", "c45", "c30"]:
        render(c)
