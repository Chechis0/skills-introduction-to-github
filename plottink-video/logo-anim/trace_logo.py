"""Vectoriza el logo original (brand/logo-original.png) → logo.json

- Franjas: bordes medidos fila por fila (se extrapolan por tangente fuera del cuadro)
- Letras y gotas: trazadas con potrace sobre la imagen escalada 4×
Coordenadas de salida: espacio del logo original (512 × 512).

    pip install numpy scipy imageio-ffmpeg potracer
    python3 logo-anim/trace_logo.py
"""
import json
import subprocess
from pathlib import Path

import numpy as np
import potrace
from scipy import ndimage as nd

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "brand" / "logo-original.png"
try:
    import imageio_ffmpeg
    FF = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FF = "ffmpeg"


def load(size):
    raw = subprocess.run([FF, "-loglevel", "error", "-i", str(SRC), "-vf", f"scale={size}:{size}:flags=lanczos",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(size, size, 3).astype(float)


# ───────────────────────── franjas ─────────────────────────
IM = load(512)
NAMES = "ROYGLBP"
WALL = {"R": (77.5, 110.0), "O": (121.5, 153.5), "Y": (164.5, 198.0), "G": (208.5, 241.5),
        "L": (252.5, 285.5), "B": (297.0, 328.5), "P": (340.5, 372.5)}
FLOOR_Y = 467


def nonwhite_runs(y, thr=700):
    row = IM[y]
    nw = row.sum(1) < thr
    out, s = [], None
    for x in range(513):
        v = x < 512 and nw[x]
        if v and s is None:
            s = x
        if not v and s is not None:
            if x - s >= 3:
                out.append([s - 0.5, x - 0.5])
            s = None
    # une cortes de antialias dentro de una franja (huecos de ≤ 3 px)
    merged = []
    for r in out:
        if merged and r[0] - merged[-1][1] <= 3:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return merged


def stripe_color(k, y0, y1):
    a, b = WALL[k]
    return [int(v) for v in np.median(IM[y0:y1, int(a) + 3:int(b) - 3].reshape(-1, 3), 0)]


stripes = {k: {"left": {}, "right": {}} for k in NAMES}
# muro: seguimiento fila a fila desde abajo, eligiendo la corrida no blanca que se solapa con la anterior
for k in NAMES:
    a, b = WALL[k]
    prev, prev_y = (a, b), FLOOR_Y
    for y in range(FLOOR_Y - 1, -1, -1):
        runs = [r for r in nonwhite_runs(y) if r[1] > prev[0] - 2 and r[0] < prev[1] + 2]
        ok = [r for r in runs if 22 < r[1] - r[0] < 60]
        if 230 >= y >= 222 or 300 >= y >= 224 or not ok:  # zona tapada por las letras → interpolar después
            continue
        r = min(ok, key=lambda r: abs((r[0] + r[1]) / 2 - (prev[0] + prev[1]) / 2))
        if r[0] <= 0.5 or r[1] >= 511:  # sale del cuadro
            break
        gap = prev_y - y
        if abs(r[0] - prev[0]) > 1.6 * gap + 1 or abs(r[1] - prev[1]) > 1.6 * gap + 1:
            continue  # otra figura (gota) pegada a la franja: se descarta la fila
        stripes[k]["left"][y], stripes[k]["right"][y] = r[0], r[1]
        prev, prev_y = (r[0], r[1]), y
# las cuatro franjas de la derecha son verticales puras: se fijan (las gotas se pegan a sus bordes en la imagen)
for k in "GLBP":
    for y in range(0, FLOOR_Y):
        stripes[k]["left"][y], stripes[k]["right"][y] = WALL[k]
# piso: 7 corridas ordenadas
for y in range(FLOOR_Y, 512):
    runs = nonwhite_runs(y, 745)
    if len(runs) == 7:
        for k, r in zip(NAMES, runs):
            stripes[k]["left"][y], stripes[k]["right"][y] = r[0], r[1]

out_stripes = []
for k in NAMES:
    Ld, Rd = stripes[k]["left"], stripes[k]["right"]
    ys = sorted(Ld)
    yy = np.arange(ys[0], ys[-1] + 1)
    L = np.interp(yy, ys, [Ld[y] for y in ys])
    R = np.interp(yy, ys, [Rd[y] for y in ys])
    # suavizado sin mover los extremos
    def smooth(v, w=7):
        p = np.pad(v, w, mode="edge")
        return np.convolve(p, np.ones(2 * w + 1) / (2 * w + 1), mode="same")[w:-w]
    wall = yy < FLOOR_Y
    L[wall], R[wall] = smooth(L[wall]), smooth(R[wall])
    L[~wall], R[~wall] = smooth(L[~wall], 3), smooth(R[~wall], 3)
    # extensión por tangente: arriba 420 u, abajo 420 u
    def ext(v, y, n, up):
        seg = slice(0, 14) if up else slice(-14, None)
        slope = np.polyfit(y[seg], v[seg], 1)[0]
        if up:
            ny = np.arange(y[0] - n, y[0])
            return ny, v[0] + slope * (ny - y[0])
        ny = np.arange(y[-1] + 1, y[-1] + 1 + n)
        return ny, v[-1] + slope * (ny - y[-1])
    ytop, Ltop = ext(L, yy, 420, True)
    _, Rtop = ext(R, yy, 420, True)
    ybot, Lbot = ext(L, yy, 420, False)
    _, Rbot = ext(R, yy, 420, False)
    Y = np.concatenate([ytop, yy, ybot])
    LL = np.concatenate([Ltop, L, Lbot])
    RR = np.concatenate([Rtop, R, Rbot])
    step = 2
    out_stripes.append({
        "k": k,
        "color": stripe_color(k, 320, 440),
        "floor": [int(v) for v in np.median(IM[490:511, int((L[-15] + R[-15]) / 2) - 4:int((L[-15] + R[-15]) / 2) + 4].reshape(-1, 3), 0)],
        "y0": int(Y[0]), "step": step, "floorY": FLOOR_Y,
        "exitTop": int(yy[0]), "exitBottom": int(yy[-1]),
        "L": [round(float(v), 2) for v in LL[::step]],
        "R": [round(float(v), 2) for v in RR[::step]],
    })

# ───────────────────────── letras y gotas (potrace) ─────────────────────────
S = 4
IM4 = load(512 * S)
r, g, b = IM4[..., 0], IM4[..., 1], IM4[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
sat = IM4.max(-1) - IM4.min(-1)


def trace(mask, x0=0, y0=0):
    bm = potrace.Bitmap(~mask)  # potracer: True = fondo blanco
    plist = bm.trace(turdsize=6, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.05, opticurve=True, opttolerance=0.25)
    f = lambda p: f"{(p.x + x0) / S:.2f} {(p.y + y0) / S:.2f}"
    parts = []
    for curve in plist:
        parts.append("M" + f(curve.start_point))
        for seg in curve.segments:
            if seg.is_corner:
                parts.append("L" + f(seg.c) + " L" + f(seg.end_point))
            else:
                parts.append("C" + f(seg.c1) + " " + f(seg.c2) + " " + f(seg.end_point))
        parts.append("Z")
    return " ".join(parts)


def crop(mask, bbox, pad=6):
    x0, x1, y0, y1 = [int(round(v * S)) for v in bbox]
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    return mask[y0:y1 + pad, x0:x1 + pad], x0, y0


K = (lum < 100) & (sat < 80)
lab, n = nd.label(K)
comps = []
for i, sl in enumerate(nd.find_objects(lab)):
    area = (lab[sl] == i + 1).sum()
    if area < 40:
        continue
    comps.append({"i": i + 1, "x0": sl[1].start / S, "x1": sl[1].stop / S, "y0": sl[0].start / S, "y1": sl[0].stop / S})
text = [c for c in comps if c["y0"] > 218]
dropK = [c for c in comps if c["y0"] < 218]
# agrupar en letras; la "tt" viene unida → se separa por la columna más delgada
big = [c for c in text if c["x1"] - c["x0"] >= 12]
letters = [{"ids": [c["i"]], "x0": c["x0"], "x1": c["x1"], "y0": c["y0"], "y1": c["y1"]} for c in sorted(big, key=lambda c: c["x0"])]
for c in text:  # piezas sueltas (p. ej. un trozo del filete de la O) → letra más cercana
    if c["x1"] - c["x0"] < 12:
        cx = (c["x0"] + c["x1"]) / 2
        tgt = min(letters, key=lambda L_: 0 if L_["x0"] <= cx <= L_["x1"] else min(abs(cx - L_["x0"]), abs(cx - L_["x1"])))
        tgt["ids"].append(c["i"]); tgt["x0"] = min(tgt["x0"], c["x0"]); tgt["x1"] = max(tgt["x1"], c["x1"])
out_letters = []
for L_ in letters:
    m = np.isin(lab, L_["ids"])
    cols = []
    if L_["x1"] - L_["x0"] > 70:  # "tt": cortar por la columna con menos tinta en el centro
        xs = np.arange(int(L_["x0"] * S) + 60, int(L_["x1"] * S) - 60)
        cnt = m[:, xs].sum(0)
        cut = xs[np.argmin(cnt)]
        cols = [(L_["x0"], cut / S), (cut / S, L_["x1"])]
    else:
        cols = [(L_["x0"], L_["x1"])]
    for a, b_ in cols:
        mm = m.copy(); mm[:, :int(a * S)] = False; mm[:, int(b_ * S) + 1:] = False
        ys, xs = np.nonzero(mm)
        sub, ox, oy = crop(mm, (xs.min() / S, xs.max() / S, ys.min() / S, ys.max() / S))
        out_letters.append({"bbox": [round(xs.min() / S, 1), round(ys.min() / S, 1), round(xs.max() / S, 1), round(ys.max() / S, 1)], "d": trace(sub, ox, oy)})

# gotas: silueta (color + brillo) y brillo
def drop_from(mask_color, bbox, color):
    region = np.zeros_like(mask_color)
    x0, x1, y0, y1 = [int(round(v * S)) for v in bbox]
    region[y0:y1, x0:x1] = True
    col = mask_color & region
    col = nd.binary_opening(col, iterations=1)
    lab2, n2 = nd.label(col)
    if n2 > 1:  # quedarse con la componente más grande
        sizes = nd.sum(col, lab2, range(1, n2 + 1))
        col = lab2 == (np.argmax(sizes) + 1)
    sil = nd.binary_fill_holes(nd.binary_closing(col, iterations=3))
    hl = sil & (lum > 200) & (sat < 90)
    ys, xs = np.nonzero(sil)
    sub, ox, oy = crop(sil, (xs.min() / S, xs.max() / S, ys.min() / S, ys.max() / S))
    d = trace(sub, ox, oy)
    dh = ""
    if hl.sum() > 30:
        ys2, xs2 = np.nonzero(hl)
        sub2, ox2, oy2 = crop(hl, (xs2.min() / S, xs2.max() / S, ys2.min() / S, ys2.max() / S))
        dh = trace(sub2, ox2, oy2)
    med = [int(v) for v in np.median(IM4[col], 0)]
    return {"color": color or med, "bbox": [round(xs.min() / S, 1), round(ys.min() / S, 1), round(xs.max() / S, 1), round(ys.max() / S, 1)], "d": d, "hl": dh}


dk = dropK[0]
K_sil = np.isin(lab, [dk["i"]])
drops = [drop_from(K_sil, (dk["x0"] - 2, dk["x1"] + 2, dk["y0"] - 2, dk["y1"] + 2), [18, 18, 22])]
cyan = (b > 150) & (r < 120) & (g > 100) & (sat > 90)
yellow = (r > 200) & (g > 170) & (b < 90) & (sat > 110)
magenta = (r > 180) & (g < 120) & (b > 70) & (sat > 90)
drops.append(drop_from(cyan, (360, 408, 140, 215), None))
drops.append(drop_from(yellow, (405, 470, 150, 235), None))
drops.append(drop_from(magenta, (420, 505, 200, 250), None))
for d_, name in zip(drops, "KCYM"):
    d_["k"] = name

(HERE / "logo.json").write_text(json.dumps({"size": 512, "stripes": out_stripes, "letters": out_letters, "drops": drops}))
print("letras:", [l["bbox"] for l in out_letters])
print("gotas:", [(d["k"], d["bbox"], d["color"], bool(d["hl"])) for d in drops])
print("franjas:", [(s["k"], s["color"], s["floor"], s["exitTop"]) for s in out_stripes])
