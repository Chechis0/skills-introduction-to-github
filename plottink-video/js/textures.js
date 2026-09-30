// Texturas procedurales (se generan una sola vez por worker y se cachean).
'use strict';

const TEX = {};
const _texCache = {};
function cached(key, fn) { return _texCache[key] || (_texCache[key] = fn()); }

function pixelTex(w, h, fn) {
  const c = mk(w, h), x = c.getContext('2d'), id = x.createImageData(w, h), d = id.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const [r, g, b, a = 255] = fn(i, j); const k = (j * w + i) * 4;
    d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = a;
  }
  x.putImageData(id, 0, 0); return c;
}
const rgbOf = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Madera: veta longitudinal con ondulación y fibras
TEX.wood = (key, w, h, o) => cached('wood' + key, () => {
  const A = rgbOf(o.light), B = rgbOf(o.dark), s = o.seed || 1;
  const sx = o.sx || 900, sy = o.sy || 70, rings = o.rings || 9;
  return pixelTex(w, h, (i, j) => {
    const n = fbm(i / sx, j / sy, 4, s) + fbm(i / 180, j / 14, 2, s + 5) * 0.05;
    const b = n * rings, f = b - Math.floor(b);
    const late = Math.pow(1 - Math.abs(f * 2 - 1), o.sharp || 7); // madera tardía (líneas)
    const early = smooth(f) * 0.25;
    const pore = hash(Math.floor(i / 2) + Math.floor(j / 1) * 7919, s) > 0.9 ? 0.08 : 0;
    const slow = fbm(i / 400, j / 400, 2, s + 3) * 0.25;
    const t = clamp(late * (o.contrast || 0.55) + early * 0.3 + pore + slow - 0.08);
    const c = mix3(A, B, t); return [c[0], c[1], c[2]];
  });
});
// MDF: marrón uniforme con moteado fino
TEX.mdf = (w, h) => cached('mdf', () => pixelTex(w, h, (i, j) => {
  const n = fbm(i / 6, j / 6, 2, 4) * 0.5 + hash(i + j * 7919, 5) * 0.5;
  const c = mix3([160, 122, 84], [120, 88, 58], n * 0.8 + fbm(i / 200, j / 200, 2, 8) * 0.3); return c;
}));
// Cuero: granulado (poros) color coñac
TEX.leather = (w, h) => cached('leather', () => pixelTex(w, h, (i, j) => {
  const p = fbm(i / 7, j / 7, 3, 11), q = fbm(i / 2.5, j / 2.5, 1, 12);
  const pores = p > 0.56 ? (p - 0.56) * 3 : 0;
  const c = mix3([148, 82, 42], [96, 48, 22], clamp(pores + q * 0.25 + fbm(i / 150, j / 150, 2, 13) * 0.3)); return c;
}));
// Metal anodizado cepillado (gris oscuro)
TEX.metal = (w, h) => cached('metal', () => pixelTex(w, h, (i, j) => {
  const streak = noise2(i / 180, j * 1.7, 21) * 0.6 + noise2(i / 30, j * 3.1, 22) * 0.4;
  const v = 58 + streak * 34 + Math.sin(i / w * Math.PI) * 10; return [v, v + 2, v + 6];
}));
// Tela oscura (fieltro/lino) para el plano cenital de souvenirs
TEX.linen = (w, h) => cached('linen', () => pixelTex(w, h, (i, j) => {
  const weave = (Math.sin(i * 1.3) * 0.5 + 0.5) * (Math.sin(j * 1.3 + 1) * 0.5 + 0.5);
  const n = fbm(i / 3, j / 40, 2, 31) * 0.6 + fbm(i / 40, j / 3, 2, 32) * 0.4;
  const v = 22 + n * 12 + weave * 4; return [v, v - 1, v + 1];
}));
// Concreto para la fachada
TEX.concrete = (w, h) => cached('concrete', () => pixelTex(w, h, (i, j) => {
  const n = fbm(i / 90, j / 90, 5, 41), p = hash(i * 31 + j * 7717, 42);
  const v = 40 + n * 38 + (p > 0.985 ? -18 : 0); return [v, v + 1, v + 4];
}));
// Papel cálido (boceto)
TEX.paper = (w, h) => cached('paper', () => pixelTex(w, h, (i, j) => {
  const n = fbm(i / 3, j / 3, 2, 51) * 0.5 + fbm(i / 120, j / 120, 3, 52) * 0.5;
  return [236 - n * 22, 230 - n * 22, 218 - n * 24];
}));
// Acrílico humo (superficie del gancho): casi negro con micro-variación
TEX.acrylic = (w, h) => cached('acrylic', () => pixelTex(w, h, (i, j) => {
  const n = fbm(i / 260, j / 260, 3, 61);
  const v = 12 + n * 9; return [v, v, v + 3];
}));

// Cama de panal (honeycomb) de la cortadora láser
TEX.honeycomb = () => cached('honey', () => {
  const r = 14, w = Math.round(r * 3), h = Math.round(r * Math.sqrt(3) * 2), c = mk(w * 4, h * 4), x = c.getContext('2d');
  x.fillStyle = '#16171b'; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#34363d'; x.lineWidth = 2.2;
  const hex = (cx, cy) => { x.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; x[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.stroke(); };
  for (let gy = -1; gy < 10; gy++) for (let gx = -1; gx < 10; gx++) hex(gx * r * 3, gy * r * Math.sqrt(3) * 2), hex(gx * r * 3 + r * 1.5, gy * r * Math.sqrt(3) * 2 + r * Math.sqrt(3));
  return c;
});

// ───────── Motivo "ORIGEN" (cliente ficticio que recorre la película) ─────────
// Insignia: anillo + sol + cordillera. Unidades: radio 1.
const ORIGEN = {
  ring: circlePts(0, 0, 0.84, 120),
  sun: circlePts(0.2, -0.2, 0.2, 60),
  ridge: [[-0.62, 0.3], [-0.3, -0.18], [-0.1, 0.05], [0.16, -0.2], [0.44, 0.08], [0.62, 0.3]],
  base: [[-0.7, 0.3], [0.7, 0.3]],
};
ORIGEN.polys = [ORIGEN.ring, ORIGEN.sun, ORIGEN.ridge, ORIGEN.base];

// dibuja la insignia grabada (relleno de cordillera + sol) en coordenadas locales (radio r)
function drawOrigenBadge(ctx, r, col, o = {}) {
  ctx.save(); ctx.scale(r, r);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = (o.lw || 0.035);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  polyPath(ctx, ORIGEN.ring, true); ctx.stroke();
  polyPath(ctx, ORIGEN.sun, true); o.fillSun === false ? ctx.stroke() : ctx.fill();
  ctx.beginPath(); ORIGEN.ridge.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1]));
  if (o.fillRidge === false) ctx.stroke(); else { ctx.lineTo(0.62, 0.3); ctx.lineTo(-0.62, 0.3); ctx.closePath(); ctx.fill(); }
  if (o.text !== false) {
    ctx.font = `600 ${0.17}px ${FONTS.sans}`; ctx.letterSpacing = '0.04px'; ctx.textAlign = 'center';
    ctx.fillText(o.text || 'ORIGEN', 0, 0.6);
  }
  ctx.restore();
}

// ───────── Imagen para grabado: paisaje del Valle de Cocora (tramado Floyd–Steinberg) ─────────
TEX.engraveImage = (w, h) => cached('engimg', () => {
  // escala de grises procedimental
  const g = new Float32Array(w * h);
  const palm = (x, y, px, base, top, s) => { // palma de cera: tronco delgado + corona
    const trunk = Math.abs(x - px - Math.sin((y - top) * 0.03) * 2) < s * 0.9 && y > top && y < base;
    let crown = 0;
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI / 2 + (k - 4) * 0.36; const L = s * 16;
      for (let u = 0.1; u <= 1; u += 0.08) {
        const fx = px + Math.cos(a) * L * u, fy = top + Math.sin(a) * L * u + u * u * L * 0.55;
        if (Math.hypot(x - fx, y - fy) < s * (1.4 - u)) crown = 1;
      }
    }
    return trunk || crown;
  };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = i / w, y = j / h;
    let v = 0.92 - y * 0.35; // cielo
    const sd = Math.hypot(x - 0.66, y - 0.3); if (sd < 0.11) v = 1.0; else v += 0.18 * Math.exp(-sd * 7);
    const m1 = 0.52 + 0.1 * Math.sin(x * 7 + 1) + 0.05 * fbm(x * 8, 1, 3, 71); if (y > m1) v = 0.62 - (y - m1) * 0.4;
    const m2 = 0.64 + 0.08 * Math.sin(x * 5 + 3) + 0.06 * fbm(x * 10, 2, 3, 72); if (y > m2) v = 0.36 - (y - m2) * 0.3 + fbm(x * 30, y * 30, 2, 73) * 0.1;
    const m3 = 0.8 + 0.05 * Math.sin(x * 9) + 0.04 * fbm(x * 14, 3, 3, 74); if (y > m3) v = 0.14 + fbm(x * 40, y * 40, 2, 75) * 0.12;
    // nubes
    v += Math.max(0, fbm(x * 5, y * 12, 4, 76) - 0.62) * (y < 0.5 ? 0.9 : 0);
    const px = i, py = j;
    if (palm(px, py, w * 0.2, h * 0.9, h * 0.34, w * 0.004) || palm(px, py, w * 0.31, h * 0.93, h * 0.44, w * 0.0035) || palm(px, py, w * 0.84, h * 0.95, h * 0.4, w * 0.0038) || palm(px, py, w * 0.52, h * 0.9, h * 0.58, w * 0.0026)) v = 0.05;
    g[j * w + i] = clamp(v);
  }
  // Floyd–Steinberg → 1 = quemado
  const out = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, old = g[k], nw = old < 0.5 ? 0 : 1, err = old - nw; out[k] = nw ? 0 : 1;
    if (i + 1 < w) g[k + 1] += err * 7 / 16;
    if (j + 1 < h) { if (i > 0) g[k + w - 1] += err * 3 / 16; g[k + w] += err * 5 / 16; if (i + 1 < w) g[k + w + 1] += err / 16; }
  }
  return { w, h, bits: out };
});

window.TEX = TEX;
