"""Oculta las placas del vehículo de forma disimulada en los cuadros ya preparados (build/marcaje).

- Placa lateral sobre la puerta blanca: se borra con la pintura de alrededor (convolución normalizada
  + grano), como si la puerta nunca hubiera tenido placa.
- Placa delantera (solo asoma al borde inferior): se rellena con el negro del bómper.
- Placas en las fotos de prueba impresas: desenfoque suave.

Cada placa se marca a mano como un cuadrilátero en un cuadro ancla y se sigue hacia adelante y atrás
con flujo óptico (Lucas-Kanade) sobre una zona de apoyo rígida (la placa, la parrilla, la hoja impresa);
la homografía ancla→cuadro lleva el cuadrilátero a cada cuadro. Si quedan muy pocos puntos (la placa sale
del encuadre) se extrapola con el último desplazamiento.

    python3 reel-marcaje/plates.py build/marcaje [--debug DIR]
"""
import sys
from pathlib import Path

import cv2
import numpy as np

OUT = Path(sys.argv[1])
DEBUG = Path(sys.argv[sys.argv.index("--debug") + 1]) if "--debug" in sys.argv else None

# carpeta, cuadros [f0, f1], cuadro ancla, zona de apoyo (polígono), placas [(cuadrilátero, modo)]
# coordenadas en píxeles del cuadro procesado (A/B 1920×1080, C 1456×1080), cuadros numerados desde 1
TRACKS = [
    # A 7.8–9.8 s: placa lateral entrando por la izquierda (también es el cuadro antes/después)
    ("A", 230, 300, 294, None, [([(166, 842), (530, 817), (550, 972), (198, 1014)], "light")]),
    # A 10.6–11.6 s: placa lateral grande
    ("A", 315, 353, 333, None, [([(600, 898), (962, 830), (974, 1000), (640, 1068)], "light")]),
    # A 15.2–16.2 s: placa delantera asomando bajo la parrilla
    ("A", 454, 490, 472, [(640, 880), (1240, 880), (1240, 1080), (640, 1080)],
     [([(738, 1040), (1122, 1056), (1128, 1200), (732, 1200)], "dark")]),
    # C 7.15–9.9 s: toma del costado, la placa entra por la derecha
    ("C", 212, 297, 295, None, [([(1190, 526), (1402, 530), (1406, 642), (1178, 648)], "light")]),
    # B 0.1–2.6 s: hoja con las fotos de prueba (dos placas pequeñas)
    ("B", 1, 82, 39, [(520, 0), (1335, 0), (1335, 985), (520, 985)],
     [([(986, 332), (1080, 332), (1080, 382), (986, 382)], "light"),
      ([(788, 708), (884, 708), (884, 758), (788, 758)], "light")]),
    # B 4.6–5.6 s: la misma hoja, lejos
    ("B", 136, 172, 154, [(972, 0), (1205, 0), (1205, 232), (972, 232)],
     [([(1122, 12), (1153, 12), (1153, 31), (1122, 31)], "light"),
      ([(1050, 137), (1088, 137), (1088, 161), (1050, 161)], "light")]),
]
HERO_FRAME = 235  # build/marcaje/hero.jpg y before.jpg salen de A/0235


def path(k, i):
    return OUT / k / f"{i:04d}.jpg"


def gray(im):
    return cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)


def poly_mask(shape, poly):
    m = np.zeros(shape[:2], np.uint8)
    cv2.fillPoly(m, [np.round(np.asarray(poly)).astype(np.int32)], 255)
    return m


def size_of(q):
    q = np.asarray(q, float)
    return np.linalg.norm(q[1] - q[0]), np.linalg.norm(q[3] - q[0])


LK = dict(winSize=(31, 31), maxLevel=4, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))


def track(k, f0, f1, fa, support):
    """Homografías {cuadro: H} que llevan coordenadas del ancla a cada cuadro."""
    ga = gray(cv2.imread(str(path(k, fa))))
    sup = np.asarray(support, np.float32)
    Hs = {fa: np.eye(3)}
    for rng in (range(fa + 1, f1 + 1), range(fa - 1, f0 - 1, -1)):
        H = np.eye(3)
        g_prev = ga
        p0 = cv2.goodFeaturesToTrack(ga, 400, 0.01, 6, mask=poly_mask(ga.shape, sup))
        cur, anc = p0.reshape(-1, 2), p0.reshape(-1, 2).copy()
        dH = np.eye(3)
        for i in rng:
            im = cv2.imread(str(path(k, i)))
            if im is None:
                break
            g = gray(im)
            ok = np.zeros(0, bool)
            if len(cur):
                nxt, st, _ = cv2.calcOpticalFlowPyrLK(g_prev, g, cur.reshape(-1, 1, 2).astype(np.float32), None, **LK)
                back, st2, _ = cv2.calcOpticalFlowPyrLK(g, g_prev, nxt, None, **LK)
                fb = np.linalg.norm(back.reshape(-1, 2) - cur, axis=1)
                nxt = nxt.reshape(-1, 2)
                inside = (nxt[:, 0] >= 2) & (nxt[:, 1] >= 2) & (nxt[:, 0] < g.shape[1] - 2) & (nxt[:, 1] < g.shape[0] - 2)
                ok = (st.ravel() == 1) & (st2.ravel() == 1) & (fb < 1.0) & inside
                cur, anc = nxt[ok], anc[ok]
            Hn = None
            if len(cur) >= 10:
                Hn, inl = cv2.findHomography(anc, cur, cv2.RANSAC, 3.0)
                if Hn is not None:
                    inl = inl.ravel().astype(bool)
                    cur, anc = cur[inl], anc[inl]
            elif len(cur) >= 3:
                A, inl = cv2.estimateAffinePartial2D(anc, cur, method=cv2.RANSAC, ransacReprojThreshold=3.0)
                if A is not None:
                    Hn = np.vstack([A, [0, 0, 1]])
            if Hn is None:
                Hn = dH @ H  # sin puntos: sigue con el último movimiento
            dH = Hn @ np.linalg.inv(H)
            H = Hn
            Hs[i] = H
            # reponer puntos dentro de la zona de apoyo proyectada
            if len(cur) < 150:
                m = poly_mask(g.shape, cv2.perspectiveTransform(sup.reshape(-1, 1, 2), H).reshape(-1, 2))
                for p in cur:
                    cv2.circle(m, (int(p[0]), int(p[1])), 8, 0, -1)
                new = cv2.goodFeaturesToTrack(g, 400 - len(cur), 0.01, 6, mask=m)
                if new is not None:
                    new = new.reshape(-1, 2)
                    cur = np.vstack([cur, new])
                    anc = np.vstack([anc, cv2.perspectiveTransform(new.reshape(-1, 1, 2), np.linalg.inv(H)).reshape(-1, 2)])
            g_prev = g
    return Hs


def warp(q, H):
    return cv2.perspectiveTransform(np.asarray(q, np.float32).reshape(-1, 1, 2), H).reshape(-1, 2)


def dist(shape, q):
    """Distancia (px) de cada píxel al cuadrilátero; 0 adentro."""
    return cv2.distanceTransform(255 - poly_mask(shape, q), cv2.DIST_L2, 5)


def soft(d, grow, feather):
    hard = d <= grow
    return cv2.GaussianBlur(hard.astype(np.float32), (0, 0), feather), hard


def paint_fill(im, q, paint, seed):
    """Borra la placa con la pintura que la rodea (blanca de la puerta o negra del bómper)."""
    w, h = size_of(q)
    s = max(w, h)
    d = dist(im.shape, q)
    grow = 0.06 * s + 8 if paint == "light" else 0.02 * s + 6  # la placa tiene grosor y sombra
    m, _ = soft(d, grow, 0.012 * s + 1.5)
    ring = (d > grow + 6) & (d <= 0.45 * s + 30)
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    lum = gray(im)
    good = ((lum > 135) & (hsv[..., 1] < 70)) if paint == "light" else (lum < 70)
    valid = (ring & good).astype(np.float32)
    if valid.sum() < 200:
        return blur(im, q)
    imf = im.astype(np.float32)
    # convolución normalizada a baja resolución (el relleno es suave) y de vuelta al tamaño original
    f = max(1, round(s / 80))
    sz = (max(1, im.shape[1] // f), max(1, im.shape[0] // f))
    num_s = cv2.resize(imf * valid[..., None], sz, interpolation=cv2.INTER_AREA)
    den_s = cv2.resize(valid, sz, interpolation=cv2.INTER_AREA)

    def nconv(sig):
        num = cv2.GaussianBlur(num_s, (0, 0), sig / f, borderType=cv2.BORDER_CONSTANT)
        den = cv2.GaussianBlur(den_s, (0, 0), sig / f, borderType=cv2.BORDER_CONSTANT)
        return num / np.maximum(den, 1e-5)[..., None], den

    f1, d1 = nconv(0.12 * s + 6)
    f2, _ = nconv(0.5 * s + 25)
    a = np.clip(d1 * 8, 0, 1)[..., None]
    fill = cv2.resize(f1 * a + f2 * (1 - a), (im.shape[1], im.shape[0]), interpolation=cv2.INTER_LINEAR)
    # grano con la misma fuerza que el de la pintura de alrededor
    hi = imf - cv2.GaussianBlur(imf, (0, 0), 1.5)
    hv = hi[valid > 0]
    sd = 1.4826 * float(np.median(np.abs(hv - np.median(hv))))  # robusto: ignora bordes y letras
    n = np.random.default_rng(seed).normal(0, 1, im.shape[:2]).astype(np.float32)
    n = cv2.GaussianBlur(n, (0, 0), 0.8)
    n *= 0.9 * sd / (n.std() + 1e-6)
    fill += n[..., None]
    mm = m[..., None]
    return np.clip(imf * (1 - mm) + fill * mm, 0, 255).astype(np.uint8)


def blur(im, q):
    w, h = size_of(q)
    s = min(w, h)
    b = cv2.GaussianBlur(im, (0, 0), 0.22 * s + 1.5)
    m, _ = soft(dist(im.shape, q), 0.25 * s + 2, 0.15 * s + 1)
    m = m[..., None]
    return np.clip(im * (1 - m) + b * m, 0, 255).astype(np.uint8)


def cover(im, q, mode, seed):
    """Trabaja sobre un recorte alrededor de la placa (los desenfoques grandes en el cuadro entero son lentos)."""
    s = max(size_of(q))
    pad = int(1.6 * s + 120)
    x0, y0 = np.floor(q.min(axis=0)).astype(int) - pad
    x1, y1 = np.ceil(q.max(axis=0)).astype(int) + pad
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(im.shape[1], x1), min(im.shape[0], y1)
    if x1 <= x0 or y1 <= y0:
        return im
    roi = np.ascontiguousarray(im[y0:y1, x0:x1])
    ql = q - np.array([x0, y0], np.float32)
    im = im.copy()
    im[y0:y1, x0:x1] = blur(roi, ql) if mode == "blur" else paint_fill(roi, ql, mode, seed)
    return im


hero_quads = None
for k, f0, f1, fa, support, plates in TRACKS:
    if support is None:  # la placa misma como zona de apoyo (un poco ampliada)
        support = plates[0][0]
        c = np.mean(support, axis=0)
        support = [tuple(c + 1.15 * (np.array(p) - c)) for p in support]
    Hs = track(k, f0, f1, fa, support)
    for i in sorted(Hs):
        im = cv2.imread(str(path(k, i)))
        for j, (q, mode) in enumerate(plates):
            im = cover(im, warp(q, Hs[i]), mode, i * 10 + j)
        cv2.imwrite(str(path(k, i)), im, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if DEBUG and i % 6 == 0:
            DEBUG.mkdir(parents=True, exist_ok=True)
            d = im.copy()
            for q, _ in plates:
                cv2.polylines(d, [np.round(warp(q, Hs[i])).astype(np.int32)], True, (0, 0, 255), 2)
            cv2.imwrite(str(DEBUG / f"{k}{i:04d}.jpg"), cv2.resize(d, None, fx=0.5, fy=0.5))
    if k == "A" and f0 <= HERO_FRAME <= f1 and hero_quads is None:
        hero_quads = [(warp(q, Hs[HERO_FRAME]), mode) for q, mode in plates]
    print(f"{k} {f0}-{f1}: {len(Hs)} cuadros, {len(plates)} placa(s)")

# fotos fijas antes/después: mismo encuadre que A/0235
for name in ("hero.jpg", "before.jpg"):
    im = cv2.imread(str(OUT / name))
    for q, mode in hero_quads:
        im = cover(im, q, mode, 7)
    cv2.imwrite(str(OUT / name), im, [cv2.IMWRITE_JPEG_QUALITY, 95])
print("antes/después listos")
