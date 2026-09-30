// Animación del logo PlottInk — determinista: draw(t) es función pura del tiempo.
'use strict';

const DUR = 6.0;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out: t => 1 - Math.pow(1 - t, 3),
  out4: t => 1 - Math.pow(1 - t, 4),
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t, s = 1.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  expo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};
// resorte amortiguado: 0 → 1 con rebote
const spring = (t, f = 3.2, z = 5.5) => (t <= 0 ? 0 : 1 - Math.exp(-z * t) * Math.cos(2 * Math.PI * f * t));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function hash(i, s = 0) { let h = (i | 0) * 374761393 + (s | 0) * 668265263; h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16; return (h >>> 0) / 4294967296; }

let L, W, H, ctx, K, OX, OY;
function init(logo, w, h) {
  L = logo; W = w; H = h;
  const c = document.getElementById('c'); c.width = W; c.height = H; ctx = c.getContext('2d');
  // el logo (cuadro 512 u) ocupa el 88–90 % del lado corto; franjas extendidas llenan el resto
  const side = Math.min(W, H) * (W === H ? 0.9 : W > H ? 0.9 : 0.92);
  K = side / 512;
  OX = W / 2 - 256 * K + (W > H ? 0 : 0);
  OY = H / 2 - 256 * K + (H > W ? -0.02 * H : 0);
  L.letterPaths = L.letters.map(l => new Path2D(l.d));
  L.dropPaths = L.drops.map(d => ({ sil: new Path2D(d.d), hl: d.hl ? new Path2D(d.hl) : null }));
  // rango visible de cada franja (en índices de fila)
  const yTop = (0 - OY) / K - 6, yBot = (H - OY) / K + 6, xLeft = (0 - OX) / K - 6;
  L.stripes.forEach(s => {
    s.n = s.L.length;
    let ib = s.n - 1; while (ib > 0 && s.y0 + ib * s.step > yBot) ib--;
    let it = 0; while (it < ib && (s.y0 + it * s.step < yTop || s.R[it] < xLeft)) it++;
    s.ib = Math.min(s.n - 1, ib + 2); s.it = Math.max(0, it - 2);
  });
}

// ───────────────────────── franjas ─────────────────────────
function drawStripe(s, u) {
  if (u <= 0) return;
  const span = s.ib - s.it;
  const f = s.ib - u * span; // índice del frente (fraccional)
  const fi = Math.max(s.it, Math.floor(f));
  const fr = f - fi;
  const floorIdx = (s.floorY - s.y0) / s.step;
  const poly = (i0, i1, col) => { // de la fila i0 (abajo) a i1 (arriba, puede ser fraccional)
    if (i1 >= i0) return;
    ctx.beginPath();
    const P = (i, side) => {
      const a = Math.floor(i), b = Math.min(s.n - 1, a + 1), t = i - a;
      const x = lerp(s[side][a], s[side][b], t), y = s.y0 + i * s.step;
      return [OX + x * K, OY + y * K];
    };
    let p = P(i0, 'L'); ctx.moveTo(p[0], p[1]);
    for (let i = Math.floor(i0); i > i1; i--) { p = P(i, 'L'); ctx.lineTo(p[0], p[1]); }
    p = P(i1, 'L'); ctx.lineTo(p[0], p[1]); p = P(i1, 'R'); ctx.lineTo(p[0], p[1]);
    for (let i = Math.ceil(i1); i <= i0; i++) { p = P(i, 'R'); ctx.lineTo(p[0], p[1]); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };
  const front = fi + fr;
  // piso (tono del piso) y muro
  poly(s.ib, Math.max(front, floorIdx), rgb(s.floor));
  if (front < floorIdx) poly(floorIdx + 0.35, front, rgb(s.color));
}

// ───────────────────────── letras y gotas ─────────────────────────
function drawLetter(i, t0, t) {
  const l = L.letters[i];
  const p = clamp((t - t0) / 0.5);
  if (p <= 0) return;
  const [x0, y0, x1, y1] = l.bbox;
  const px = (x0 + x1) / 2, py = y1; // pivote: base de la letra
  const s = E.back(p, 2.2);
  const st = 0.14 * Math.sin(Math.min(1, p * 1.6) * Math.PI) * (1 - p); // estiramiento al salir
  const rot = (1 - E.out(p)) * (i % 2 ? 0.2 : -0.2);
  ctx.save();
  ctx.globalAlpha = clamp(p * 5);
  ctx.translate(OX + px * K, OY + py * K + (1 - E.out(p)) * 26 * K);
  ctx.rotate(rot); ctx.scale(Math.max(0.001, s * (1 - st * 0.5)), Math.max(0.001, s * (1 + st)));
  ctx.translate(-px * K, -py * K); ctx.scale(K, K);
  ctx.fillStyle = '#0b0b0d'; ctx.fill(L.letterPaths[i], 'evenodd');
  ctx.restore();
}
const SPLASH = [385, 232]; // origen de la salpicadura (sobre la K)
function drawDrop(j, t0, t) {
  const d = L.drops[j];
  const [x0, y0, x1, y1] = d.bbox;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const fl = 0.34, u = (t - t0) / fl;
  if (u <= 0) return;
  // vuelo en arco desde el origen hasta su posición
  const q = E.out(clamp(u));
  const sx = SPLASH[0], sy = SPLASH[1];
  const mx = (sx + cx) / 2 + (cy - sy) * 0.18, my = (sy + cy) / 2 - 40;
  const bz = (a, b, c, t2) => (1 - t2) * (1 - t2) * a + 2 * (1 - t2) * t2 * b + t2 * t2 * c;
  const x = bz(sx, mx, cx, q), y = bz(sy, my, cy, q);
  const x2 = bz(sx, mx, cx, Math.min(1, q + 0.02)), y2 = bz(sy, my, cy, Math.min(1, q + 0.02));
  const ang = Math.atan2(y2 - y, x2 - x);
  const speed = u < 1 ? (1 - q) : 0;
  const stretch = 1 + 0.9 * speed;
  // aterrizaje: resorte squash & stretch
  const land = u >= 1 ? spring((t - t0 - fl) , 3.4, 6.5) : 0;
  const wob = u >= 1 ? (1 - land) : 0;
  const sc = lerp(0.25, 1, E.out(clamp(u * 1.4)));
  ctx.save();
  ctx.translate(OX + x * K, OY + y * K);
  ctx.rotate(ang); ctx.scale(stretch * (1 + wob * 0.18), (1 / Math.sqrt(stretch)) * (1 - wob * 0.18)); ctx.rotate(-ang);
  ctx.scale(sc, sc);
  ctx.translate(-cx * K, -cy * K); ctx.scale(K, K);
  ctx.fillStyle = rgb(d.color); ctx.fill(L.dropPaths[j].sil, 'nonzero');
  if (L.dropPaths[j].hl) { ctx.globalAlpha = clamp(u * 2); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(L.dropPaths[j].hl, 'nonzero'); }
  ctx.restore();
  // gotitas satélite
  for (let k = 0; k < 3; k++) {
    const a = ang + (hash(j * 7 + k, 3) - 0.5) * 0.9, dist = (20 + hash(j * 7 + k, 4) * 40) * clamp(u * 1.2);
    const life = clamp(1 - (u - 0.2) / 1.4);
    if (u < 0.15 || life <= 0) continue;
    const r = (1.6 + hash(j * 7 + k, 5) * 2.4) * life;
    const bx = x + Math.cos(a) * dist, by = y + Math.sin(a) * dist + (u * u) * 12;
    ctx.fillStyle = rgb(d.color, life); ctx.beginPath(); ctx.arc(OX + bx * K, OY + by * K, r * K, 0, Math.PI * 2); ctx.fill();
  }
}

// ───────────────────────── cuadro ─────────────────────────
const T = { stripes: 0.2, stripeDur: 0.95, stripeGap: 0.075, letters: 1.02, letterGap: 0.055, flick: 1.62, drops: 1.72, dropGap: 0.075, gloss: 2.55, hold: 3.2 };
function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
  // leve empuje de cámara durante toda la pieza
  const push = 1 + 0.03 * E.inOut(clamp(t / DUR));
  ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  const base = ctx.getTransform();
  // franjas: de izquierda a derecha, suben desde el piso
  L.stripes.forEach((s, i) => { const t0 = T.stripes + i * T.stripeGap; const u = clamp((t - t0) / T.stripeDur); drawStripe(s, u <= 0 ? 0 : 1 - Math.pow(1 - u, 3.2)); });
  // letras
  L.letters.forEach((l, i) => {
    let t0 = T.letters + i * T.letterGap;
    ctx.setTransform(base);
    // la K "lanza" la tinta: pequeño rebote al salpicar
    if (i === L.letters.length - 1 && t > T.flick) {
      const k = t - T.flick; const b = Math.sin(Math.min(1, k / 0.32) * Math.PI) * Math.exp(-k * 3) * 0.07;
      const [x0, y0, x1, y1] = l.bbox; const px = OX + (x0 + x1) / 2 * K, py = OY + y1 * K;
      ctx.translate(px, py); ctx.scale(1 + b, 1 - b * 1.4); ctx.translate(-px, -py);
    }
    drawLetter(i, t0, t);
  });
  ctx.setTransform(base);
  // gotas CMYK (K, C, Y, M)
  L.drops.forEach((d, j) => drawDrop(j, T.drops + j * T.dropGap, t));
  // brillo que recorre las letras
  const g = seg(t, T.gloss, T.gloss + 0.7);
  if (g > 0 && g < 1) {
    ctx.save(); ctx.translate(OX, OY); ctx.scale(K, K);
    const clip = new Path2D(); L.letterPaths.forEach(p => clip.addPath(p)); ctx.clip(clip, 'evenodd');
    const gx = lerp(-60, 460, E.inOut(g));
    const gr = ctx.createLinearGradient(gx - 22, 200, gx + 22, 300);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.38)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(-10, 200, 530, 110); ctx.restore();
  }
}
window.LOGO_DUR = DUR; window.LOGO_T = T;
