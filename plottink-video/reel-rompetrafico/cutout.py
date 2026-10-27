"""Recorta el rompetráfico de la foto del taller → media/rompetrafico-mascara.png

1. Segmentación con BiRefNet (rembg, modelo birefnet-general).
2. Ajustes: se rellena el hombro izquierdo de la base con su borde recto real
   (el modelo lo dejó curvo) y se cierra un poco el borde para quitar halos del fondo.

    pip install "rembg[cpu]" opencv-python-headless
    python3 reel-rompetrafico/cutout.py      (≈1 min en CPU; descarga el modelo la primera vez)
La máscara resultante se versiona, así que el build normal no necesita el modelo.
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

HERE = Path(__file__).resolve().parent
SRC = HERE / "media" / "rompetrafico-terminado.jpg"
OUT = HERE / "media" / "rompetrafico-mascara.png"

im = Image.open(SRC).convert("RGB")
mask = np.array(remove(im, session=new_session("birefnet-general"), only_mask=True)).astype(np.float32) / 255

# hombro izquierdo de la base: borde recto de (437,1178) a (533,1099), todo lo de abajo es tabla
quad = np.array([[437, 1178], [533, 1099], [533, 1190], [437, 1190]], np.int32)
fill = np.zeros(mask.shape, np.uint8)
cv2.fillPoly(fill, [quad], 1)
mask = np.maximum(mask, fill.astype(np.float32))

# cerrar ~1 px el borde (evita el halo del fondo) y suavizar el antialias
mask = np.clip((mask - 0.12) / 0.8, 0, 1)
mask = cv2.GaussianBlur(mask, (0, 0), 0.6)
# quitar islas pequeñas sueltas del fondo
lab_n, lab, stats, _ = cv2.connectedComponentsWithStats((mask > 0.5).astype(np.uint8))
keep = np.zeros_like(mask)
big = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
keep[lab == big] = 1
keep = cv2.dilate(keep, np.ones((5, 5), np.uint8))
mask *= keep

Image.fromarray((mask * 255).astype(np.uint8)).save(OUT)
ys, xs = np.nonzero(mask > 0.5)
print(OUT, "bbox", xs.min(), ys.min(), xs.max(), ys.max())
