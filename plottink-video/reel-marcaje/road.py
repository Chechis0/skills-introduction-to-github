"""Prepara la textura de carretera (media/carretera.jpg) para el fondo del reel:
centra la línea amarilla, escala a 1080 de ancho, devuelve grano fino de asfalto,
la vuelve continua en vertical (loop sin costura) y genera una versión con desenfoque de movimiento.

    python3 reel-marcaje/road.py media/carretera.jpg build/marcaje
"""
import sys
from pathlib import Path

import cv2
import numpy as np

src, out = Path(sys.argv[1]), Path(sys.argv[2])
im = cv2.imread(str(src)).astype(np.float32)
h, w = im.shape[:2]
hsv = cv2.cvtColor(im.astype(np.uint8), cv2.COLOR_BGR2HSV)
yellow = (hsv[..., 0] > 15) & (hsv[..., 0] < 35) & (hsv[..., 1] > 120) & (hsv[..., 2] > 120)
xc = int(np.argmax(yellow.sum(0)))                    # columna de la línea amarilla
half = min(xc, w - xc)
im = im[:, xc - half:xc + half]
W = 1080
scale = W / im.shape[1]
im = np.clip(cv2.resize(im, (W, int(round(im.shape[0] * scale))), interpolation=cv2.INTER_LANCZOS4), 0, 255)
# grano fino de asfalto (más fuerte en lo oscuro), para que no se vea ampliada
rng = np.random.default_rng(3)
lum = im.mean(2, keepdims=True) / 255
g = rng.normal(0, 1, im.shape[:2]).astype(np.float32)
g = cv2.GaussianBlur(g, (0, 0), 0.7)[..., None]
im = im + g * 9 * (1 - lum) ** 0.5
speck = (rng.random(im.shape[:2]) > 0.9975).astype(np.float32)
im += cv2.GaussianBlur(speck, (0, 0), 0.8)[..., None] * 60 * (1 - lum)
# loop vertical: la franja final se funde con el inicio
O = 260
H = im.shape[0] - O
tile = im[:H].copy()
a = np.linspace(0, 1, O, dtype=np.float32)[:, None, None]
tile[:O] = im[H:H + O] * (1 - a) + im[:O] * a
tile = np.clip(tile, 0, 255)
cv2.imwrite(str(out / "road.jpg"), tile.astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 93])
# versión con desenfoque de movimiento vertical (se usa a alta velocidad); se envuelve para no romper el loop
k = 61
ker = np.ones((k, 1), np.float32) / k
pad = np.concatenate([tile[-k:], tile, tile[:k]], 0)
blur = cv2.filter2D(pad, -1, ker)[k:-k]
cv2.imwrite(str(out / "road_blur.jpg"), np.clip(blur, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 93])
print("road.jpg", tile.shape[1], "×", tile.shape[0], "· línea amarilla en x =", xc, "de", w)
