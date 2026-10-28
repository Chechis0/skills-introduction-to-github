"""Genera la van "antes del marcaje" a partir del cuadro del costado ya marcado (recorrido-van.mp4, 7.8 s):
borra el vinilo azul/cian/navy dentro de la carrocería y rellena con la pintura blanca y su sombreado
(convolución normalizada). El polígono de la carrocería es específico de ese cuadro (848×478).

    python3 reel-marcaje/unwrap.py despues.png antes.png mascara.png
"""
import sys
import cv2
import numpy as np

src, out_before, out_mask = sys.argv[1:4]
im = cv2.imread(src)
h, w = im.shape[:2]
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(np.float32)
H, S, V = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
lum = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
# carrocería (panel trasero): polígono menos el arco de la rueda
body = np.zeros((h, w), np.uint8)
cv2.fillPoly(body, [np.array([(112, 38), (600, 33), (648, 39), (684, 57), (697, 100), (689, 200), (686, 322), (668, 337), (580, 399), (420, 432), (118, 434)], np.int32)], 1)
cv2.circle(body, (522, 472), 99, 0, -1)
blue = (H > 175) & (H < 262)
vinyl = (blue & (S > 0.2)) | (blue & (S > 0.07) & (lum < 175))
vinyl = vinyl & (body > 0)
xs = np.arange(w)[None, :].repeat(h, 0)
vinyl &= ~((xs > 672) & (S < 0.32))          # borde trasero: no tocar el caucho negro
vinyl = vinyl.astype(np.uint8)
vinyl = cv2.morphologyEx(vinyl, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
vinyl = cv2.medianBlur(vinyl * 255, 5) // 255
vinyl = cv2.dilate(vinyl, np.ones((3, 3), np.uint8), iterations=2) & body
# pintura visible para estimar color y sombreado
valid = ((1 - vinyl) * (lum > 150) * body).astype(np.float32)
def nconv(sig):
    num = cv2.GaussianBlur(im.astype(np.float32) * valid[..., None], (0, 0), sig)
    den = cv2.GaussianBlur(valid, (0, 0), sig)[..., None]
    return num / np.maximum(den, 1e-4), den
f1, d1 = nconv(14)
f2, _ = nconv(60)
wgt = np.clip(d1 * 5, 0, 1)
fill = f1 * wgt + f2 * (1 - wgt)
m = cv2.GaussianBlur(vinyl.astype(np.float32), (0, 0), 1.0)[..., None]
out = im * (1 - m) + fill * m
out += np.random.default_rng(1).normal(0, 2.0, out.shape) * m
cv2.imwrite(out_before, np.clip(out, 0, 255).astype(np.uint8))
cv2.imwrite(out_mask, (cv2.GaussianBlur(vinyl.astype(np.float32), (0, 0), 1.0) * 255).astype(np.uint8))
