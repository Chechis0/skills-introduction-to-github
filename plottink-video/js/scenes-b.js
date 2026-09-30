// ACTO III (1): corte, grabado, materiales, gran formato, vinilo, aviso luminoso.
'use strict';

// marcador de capítulo compartido por escenas consecutivas
const CHAPTERS = {
  cut: ['01', 'CORTE Y GRABADO LÁSER', 'cyan'], engrave: ['01', 'CORTE Y GRABADO LÁSER', 'cyan'], materials: ['01', 'CORTE Y GRABADO LÁSER', 'cyan'],
  largeformat: ['02', 'IMPRESIÓN Y ROTULACIÓN', 'magenta'], vinyl: ['02', 'IMPRESIÓN Y ROTULACIÓN', 'magenta'],
  sign: ['03', 'AVISOS Y SOUVENIRS', 'yellow'], souvenirs: ['03', 'AVISOS Y SOUVENIRS', 'yellow'],
};
function drawChapter(ctx, id, lt, dur, I) {
  const c = CHAPTERS[id]; if (!c) return;
  const prevSame = CHAPTERS[I.prev] && CHAPTERS[I.prev][0] === c[0];
  const nextSame = CHAPTERS[I.next] && CHAPTERS[I.next][0] === c[0];
  const pin = prevSame ? 1 : clamp((lt - 0.15) / 0.9);
  const pout = nextSame ? 0 : clamp((lt - (dur - 0.35)) / 0.3);
  chapter(ctx, c[0], c[1], E.P[c[2]], pin, pout);
}
// titular + etiqueta (una idea por escena)
function headline(ctx, text, p, pout = 0, o = {}) {
  const { W, H, U, V } = E;
  const size = (o.size || (V ? 70 : 62)) * U;
  const x = o.x ?? (V ? W / 2 : o.left ? 120 * U : W / 2);
  const y = o.y ?? (V ? H * 0.8 : H * 0.87);
  phrase(ctx, { text, x, y, size, font: 'serif', align: V ? 'center' : (o.left ? 'left' : 'center'), ...o.extra }, p, pout);
}

// ───────────────────────── CORTE ─────────────────────────
const ORNAMENT = (() => {
  const outer = []; for (let i = 0; i <= 480; i++) { const a = i / 480 * TAU; const r = 0.74 + 0.26 * Math.pow(Math.abs(Math.cos(4 * a)), 0.55); outer.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const holes = [circlePts(0, 0, 0.16, 48)];
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) * TAU / 8; holes.push(circlePts(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.07, 30)); }
  for (let k = 0; k < 8; k++) { // ranuras en gota hacia cada punta
    const a = k * TAU / 8, pts = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40, th = u * TAU; const rr = 0.47 + 0.2 * Math.cos(th) * 0.9, w = 0.055 * Math.sin(th) * (0.6 + 0.4 * Math.cos(th)); pts.push([Math.cos(a) * rr - Math.sin(a) * w, Math.sin(a) * rr + Math.cos(a) * w]); }
    holes.push(pts);
  }
  const path = makePath([...holes, outer]);
  const holeLen = path.L - makePath([outer]).L;
  return { outer, holes, path, holeLen };
})();
function ornamentPath(R, withHoles = true) {
  const p = new Path2D(); const add = pts => { pts.forEach((q, i) => (i ? p.lineTo(q[0] * R, q[1] * R) : p.moveTo(q[0] * R, q[1] * R))); p.closePath(); };
  add(ORNAMENT.outer); if (withHoles) ORNAMENT.holes.forEach(add); return p;
}
SC.cut = {
  draw(ctx, lt, dur, M, I) {
    const { W, H, U, V } = E; const p = lt / dur;
    const R = (V ? 330 : 300) * U, cx = V ? W / 2 : W * 0.56, cy = V ? H * 0.4 : H * 0.47;
    const rot = lerp(-0.06, 0.03, ease.inOutSine(p)), zoom = lerp(1.45, 1.0, ease.inOutSine(seg(p, 0, 0.7)));
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(zoom, zoom);
    // cama de panal
    const pat = ctx.createPattern(TEX.honeycomb(), 'repeat'); pat.setTransform(new DOMMatrix([1.6 * U, 0, 0, 1.6 * U, 0, 0]));
    ctx.fillStyle = pat; ctx.fillRect(-W * 1.2, -H * 1.2, W * 2.4, H * 2.4);
    const lift = ease.inOut(seg(p, M.lift, M.lift + 0.1));
    // lámina de acrílico humo (con hueco cuando la pieza sale)
    ctx.save();
    const sheet = new Path2D(); sheet.rect(-W * 1.2, -H * 1.2, W * 2.4, H * 2.4);
    if (lift > 0) sheet.addPath(ornamentPath(R, false));
    ctx.fillStyle = 'rgba(14,13,18,0.86)'; ctx.fill(sheet, 'evenodd');
    ctx.restore();
    // reflejo amplio sobre el acrílico
    const rg = ctx.createLinearGradient(-W, -H, W, H); rg.addColorStop(0.35, 'rgba(255,255,255,0)'); rg.addColorStop(0.47, 'rgba(200,205,230,0.06)'); rg.addColorStop(0.55, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(-W, -H, W * 2, H * 2);
    // progreso del corte: primero los agujeros internos, luego el contorno (como en taller)
    const cp = seg(p, M.laserOn, M.cutEnd), d = ORNAMENT.path.L * (cp < 0.6 ? ease.inOutSine(cp / 0.6) * ORNAMENT.holeLen / ORNAMENT.path.L : ORNAMENT.holeLen / ORNAMENT.path.L + ease.inOutSine((cp - 0.6) / 0.4) * (1 - ORNAMENT.holeLen / ORNAMENT.path.L));
    const map = (x, y) => [x * R, y * R];
    if (lift <= 0) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 3.2 * U; ORNAMENT.path.stroke(ctx, 0, d, map);
      ctx.strokeStyle = 'rgba(230,236,255,0.55)'; ctx.lineWidth = 1.1 * U; ORNAMENT.path.stroke(ctx, 0, d, map);
      // tramo caliente
      const hot = 0.12;
      ctx.strokeStyle = 'rgba(255,190,110,0.9)'; ctx.lineWidth = 2 * U; ORNAMENT.path.stroke(ctx, Math.max(0, d - hot), d, map);
      if (cp > 0 && cp < 1) glow(ctx, g => { g.strokeStyle = 'rgba(255,150,60,0.8)'; g.lineWidth = 8 * U; ORNAMENT.path.stroke(g, Math.max(0, d - hot * 1.5), d, map); });
    }
    // pieza levantada
    if (lift > 0) {
      const off = lift * 26 * U;
      ctx.save(); ctx.filter = `blur(${(4 + lift * 14) * U}px)`; ctx.fillStyle = `rgba(0,0,0,${0.75})`;
      ctx.translate(off * 0.5, off); ctx.fill(ornamentPath(R), 'evenodd'); ctx.restore();
      ctx.save(); ctx.translate(-off * 0.25, -off * 0.5); const sc = 1 + lift * 0.05; ctx.scale(sc, sc);
      const op = ornamentPath(R);
      ctx.fillStyle = 'rgba(24,22,30,0.97)'; ctx.fill(op, 'evenodd');
      const pg = ctx.createLinearGradient(-R, -R, R, R); pg.addColorStop(0, 'rgba(255,255,255,0.1)'); pg.addColorStop(0.45, 'rgba(255,255,255,0.02)'); pg.addColorStop(0.5, 'rgba(255,255,255,0.12)'); pg.addColorStop(0.56, 'rgba(255,255,255,0.02)'); pg.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = pg; ctx.fill(op, 'evenodd');
      // canto pulido: brillo en el borde
      ctx.strokeStyle = `rgba(235,240,255,${0.75 * lift})`; ctx.lineWidth = 1.4 * U; ctx.stroke(op);
      glow(ctx, g => { g.strokeStyle = `rgba(200,215,255,${0.25 * lift})`; g.lineWidth = 4 * U; g.stroke(op); });
      ctx.restore();
    }
    // punto láser + chispas + humo
    if (cp > 0 && cp < 1) {
      const pt = ORNAMENT.path.at(d); const m = ctx.getTransform(); const sp = m.transformPoint(new DOMPoint(pt[0] * R, pt[1] * R));
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const posAt = te => { const c2 = seg(te / dur, M.laserOn, M.cutEnd); const dd = ORNAMENT.path.L * (c2 < 0.6 ? ease.inOutSine(c2 / 0.6) * ORNAMENT.holeLen / ORNAMENT.path.L : ORNAMENT.holeLen / ORNAMENT.path.L + ease.inOutSine((c2 - 0.6) / 0.4) * (1 - ORNAMENT.holeLen / ORNAMENT.path.L)); const q = ORNAMENT.path.at(dd); const r2 = m.transformPoint(new DOMPoint(q[0] * R, q[1] * R)); return [r2.x, r2.y]; };
      smoke(ctx, lt, dur * M.laserOn, dur * M.cutEnd, posAt, { alpha: 0.05, rise: 40, scale: 0.8 });
      sparks(ctx, lt, dur * M.laserOn, dur * M.cutEnd, posAt, { rate: 240, life: 0.3, grav: 0, speed: 260, spread: TAU, density: () => 0.7, width: 1.6 });
      laserDot(ctx, sp.x, sp.y, 0.95, 0.9);
      ctx.restore();
    }
    ctx.restore();
    // lupa: 0.1 mm
    const ca = ease.out(seg(p, M.callout, M.callout + 0.1));
    if (ca > 0) {
      const edge = [Math.cos(0) * R, 0]; // punta derecha del ornamento
      const m = new DOMMatrix().translate(cx, cy).rotate(rot * 180 / Math.PI).scale(zoom * 1.05);
      const e = m.transformPoint(new DOMPoint(edge[0] * 0.99, edge[1]));
      const lr = (V ? 150 : 150) * U, lx = V ? W * 0.7 : W * 0.84, ly = V ? H * 0.64 : H * 0.3;
      ctx.save(); ctx.globalAlpha = ca;
      ctx.strokeStyle = 'rgba(242,238,232,0.5)'; ctx.lineWidth = 1 * U;
      ctx.beginPath(); ctx.arc(e.x, e.y, 16 * U, 0, TAU); ctx.stroke();
      const ang = Math.atan2(ly - e.y, lx - e.x);
      ctx.beginPath(); ctx.moveTo(e.x + Math.cos(ang) * 16 * U, e.y + Math.sin(ang) * 16 * U); ctx.lineTo(lx - Math.cos(ang) * lr, ly - Math.sin(ang) * lr); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, lr * ease.outBack(ca), 0, TAU); ctx.clip();
      ctx.fillStyle = '#0c0c10'; ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
      const pat2 = ctx.createPattern(TEX.honeycomb(), 'repeat'); pat2.setTransform(new DOMMatrix([5 * U, 0, 0, 5 * U, lx, ly])); ctx.globalAlpha = ca * 0.6; ctx.fillStyle = pat2; ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2); ctx.globalAlpha = ca;
      const gap = 9 * U;
      const slab = (x0, x1) => { const g2 = ctx.createLinearGradient(x0, 0, x1, 0); g2.addColorStop(0, '#1d1b24'); g2.addColorStop(1, '#2a2833'); ctx.fillStyle = g2; ctx.fillRect(x0, ly - lr, x1 - x0, lr * 2); };
      slab(lx - lr, lx - gap / 2); slab(lx + gap / 2, lx + lr);
      ctx.fillStyle = 'rgba(235,240,255,0.85)'; ctx.fillRect(lx - gap / 2 - 1.5 * U, ly - lr, 1.5 * U, lr * 2); ctx.fillRect(lx + gap / 2, ly - lr, 1.5 * U, lr * 2);
      // cota
      ctx.strokeStyle = E.P.laser; ctx.fillStyle = E.P.laser; ctx.lineWidth = 1.2 * U;
      const ay = ly - lr * 0.3;
      [[-1], [1]].forEach(([sg]) => { ctx.beginPath(); ctx.moveTo(lx + sg * (gap / 2 + 40 * U), ay); ctx.lineTo(lx + sg * gap / 2, ay); ctx.stroke(); ctx.beginPath(); ctx.moveTo(lx + sg * gap / 2, ay); ctx.lineTo(lx + sg * (gap / 2 + 9 * U), ay - 5 * U); ctx.lineTo(lx + sg * (gap / 2 + 9 * U), ay + 5 * U); ctx.fill(); });
      ctx.restore();
      ctx.strokeStyle = 'rgba(242,238,232,0.6)'; ctx.lineWidth = 1.2 * U; ctx.beginPath(); ctx.arc(lx, ly, lr * ease.outBack(ca), 0, TAU); ctx.stroke();
      ctx.restore();
      { const la2 = seg(p, M.callout + 0.04, M.callout + 0.14); if (la2 > 0) { ctx.save(); ctx.globalAlpha = la2; ctx.fillStyle = 'rgba(12,12,16,0.92)'; rrect(ctx, lx - 62 * U, ly + lr * 0.32 - 26 * U, 124 * U, 38 * U, 6 * U); ctx.fill(); ctx.restore(); } }
      label(ctx, { text: '0.1 mm', x: lx, y: ly + lr * 0.32, size: 22 * U, align: 'center', color: E.P.laser, alpha: 1, ls: 0.06 }, seg(p, M.callout + 0.04, M.callout + 0.14));
    }
    // titular
    const tp = seg(p, M.text, M.text + 0.14);
    if (V) {
      phrase(ctx, { text: '0.1 mm', x: W / 2, y: H * 0.8, size: 150 * U, font: 'sans', weight: 200, ls: -0.02 }, tp);
      label(ctx, { text: 'PRECISIÓN DE CORTE', x: W / 2, y: H * 0.8 + 62 * U, size: 20 * U, align: 'center', color: E.P.dim }, seg(p, M.text + 0.06, M.text + 0.2));
    } else {
      phrase(ctx, { text: '0.1 mm', x: 110 * U, y: H * 0.8, size: 150 * U, font: 'sans', weight: 200, align: 'left', ls: -0.02 }, tp);
      label(ctx, { text: 'PRECISIÓN DE CORTE', x: 118 * U, y: H * 0.8 + 52 * U, size: 17 * U, color: E.P.dim }, seg(p, M.text + 0.06, M.text + 0.2));
    }
    drawChapter(ctx, 'cut', lt, dur, I);
  },
};

// ───────────────────────── GRABADO ─────────────────────────
let ENGR;
function engraveAssets(iw, ih) {
  if (ENGR && ENGR.iw === iw) return ENGR;
  const img = TEX.engraveImage(300, 190);
  const c = mk(iw, ih), x = c.getContext('2d');
  const cw = iw / img.w, chh = ih / img.h;
  x.fillStyle = 'rgba(58,32,16,0.93)';
  for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) if (img.bits[j * img.w + i]) { x.beginPath(); x.arc((i + 0.5) * cw, (j + 0.5) * chh, cw * 0.62, 0, TAU); x.fill(); }
  // relieve: sombra y luz desplazadas
  const sh = mk(iw, ih), sx = sh.getContext('2d'); sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(20,10,4,1)'; sx.fillRect(0, 0, iw, ih);
  const hl = mk(iw, ih), hx = hl.getContext('2d'); hx.drawImage(c, 0, 0); hx.globalCompositeOperation = 'source-in'; hx.fillStyle = 'rgba(255,238,205,1)'; hx.fillRect(0, 0, iw, ih);
  return (ENGR = { iw, ih, c, sh, hl, rows: img.h });
}
SC.engrave = {
  draw(ctx, lt, dur, M, I) {
    const { W, H, U, V } = E; const p = lt / dur;
    const zoom = lerp(1.0, 1.1, ease.inOutSine(p));
    const cx = W / 2, cy = V ? H * 0.4 : H * 0.45;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.rotate(-0.02);
    // tabla de arce
    const wood = TEX.wood('maple', 1100, 800, { light: '#EAD5AE', dark: '#C9A577', seed: 9, sx: 1200, sy: 90, rings: 7, contrast: 0.45 });
    const bw = V ? W * 1.3 : W * 1.2, bh = V ? H * 0.62 : H * 1.2;
    ctx.drawImage(wood, -bw / 2, -bh / 2, bw, bh);
    // luz rasante general
    const lg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); lg.addColorStop(0, 'rgba(255,240,215,0.12)'); lg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = lg; ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    const iw = Math.round(V ? W * 0.86 : W * 0.5), ih = Math.round(iw * 190 / 300);
    const A = engraveAssets(iw, ih);
    const rp = seg(p, M.raster, M.rasterEnd), row = rp * A.rows, rowsDone = Math.floor(row);
    const ox = -iw / 2, oy = -ih / 2 - (V ? 0 : 20 * U);
    const hDone = (rowsDone / A.rows) * ih;
    const sweep = ease.inOut(seg(p, M.sweep, 1));
    if (hDone > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(ox - 4, oy - 4, iw + 8, hDone + 4); ctx.clip();
      ctx.globalAlpha = 0.5; ctx.drawImage(A.sh, ox + 1.4 * U, oy + 1.8 * U);
      ctx.globalAlpha = 1; ctx.drawImage(A.c, ox, oy);
      if (sweep > 0) { // la luz rasante revela la textura
        ctx.save(); const lx = lerp(ox - iw * 0.4, ox + iw * 1.4, sweep);
        const sg = ctx.createLinearGradient(lx - iw * 0.25, 0, lx + iw * 0.25, 0); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.5, 'rgba(0,0,0,1)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
        const tmp = mk(iw, ih), tx = tmp.getContext('2d'); tx.drawImage(A.hl, 0, 0); tx.globalCompositeOperation = 'destination-in'; tx.setTransform(1, 0, 0, 1, -ox, -oy); tx.fillStyle = sg; tx.fillRect(ox, oy, iw, ih);
        ctx.globalAlpha = 0.55; ctx.drawImage(tmp, ox - 1.2 * U, oy - 1.2 * U); ctx.restore();
        const bg = ctx.createLinearGradient(lx - iw * 0.3, 0, lx + iw * 0.3, 0); bg.addColorStop(0, 'rgba(255,235,200,0)'); bg.addColorStop(0.5, 'rgba(255,235,200,0.1)'); bg.addColorStop(1, 'rgba(255,235,200,0)');
        ctx.fillStyle = bg; ctx.fillRect(ox - iw, oy - ih, iw * 3, ih * 3);
      }
      ctx.restore();
    }
    // fila en curso: cabezal barriendo (bustrofedón)
    if (rp > 0 && rp < 1) {
      const fr = row - rowsDone, dir = rowsDone % 2 ? -1 : 1;
      const hx = ox + (dir > 0 ? fr : 1 - fr) * iw, hy = oy + hDone + ih / A.rows * 0.5;
      ctx.save(); ctx.beginPath(); ctx.rect(dir > 0 ? ox : hx, oy + hDone, dir > 0 ? hx - ox : ox + iw - hx, ih / A.rows + 1); ctx.clip(); ctx.drawImage(A.c, ox, oy); ctx.restore();
      const m = ctx.getTransform(); const sp = m.transformPoint(new DOMPoint(hx, hy));
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const posAt = te => { const r2 = seg(te / dur, M.raster, M.rasterEnd) * A.rows, rd = Math.floor(r2), f2 = r2 - rd, d2 = rd % 2 ? -1 : 1; const q = m.transformPoint(new DOMPoint(ox + (d2 > 0 ? f2 : 1 - f2) * iw, oy + (rd / A.rows) * ih)); return [q.x, q.y]; };
      smoke(ctx, lt, dur * M.raster, dur * M.rasterEnd, posAt, { alpha: 0.03, rise: 60, scale: 0.8, rate: 20 });
      sparks(ctx, lt, dur * M.raster, dur * M.rasterEnd, posAt, { rate: 160, life: 0.18, grav: 0, speed: 160, spread: TAU, density: () => 0.5, width: 1.3 });
      laserDot(ctx, sp.x, sp.y, 0.85, 0.7);
      ctx.restore();
    }
    ctx.restore();
    // viñeta cálida para enfocar
    const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.65); vg.addColorStop(0.5, 'rgba(10,8,6,0)'); vg.addColorStop(1, 'rgba(10,8,6,0.75)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // velo inferior para el texto
    const tv = ctx.createLinearGradient(0, H * 0.62, 0, H); tv.addColorStop(0, 'rgba(10,10,15,0)'); tv.addColorStop(1, `rgba(10,10,15,${0.85 * seg(p, M.text - 0.1, M.text)})`);
    ctx.fillStyle = tv; ctx.fillRect(0, H * 0.62, W, H * 0.38);
    headline(ctx, 'Grabado que se puede *tocar.*', seg(p, M.text, M.text + 0.16));
    drawChapter(ctx, 'engrave', lt, dur, I);
  },
};

// ───────────────────────── MATERIALES ─────────────────────────
const MATS = ['ACRÍLICO', 'MDF', 'CUERO', 'VIDRIO', 'METAL', 'MADERA'];
const _tok = {};
function tokenSprite(kind, size) {
  const key = kind + size; if (_tok[key]) return _tok[key];
  const pad = size * 0.2, c = mk(size + pad * 2, size + pad * 2), x = c.getContext('2d'), r = size / 2, cx = c.width / 2, cy = c.height / 2;
  const clipC = () => { x.beginPath(); x.arc(cx, cy, r, 0, TAU); };
  const badge = (col, comp = 'source-over', alpha = 1) => { const m = mk(c.width, c.height), mx = m.getContext('2d'); mx.translate(cx, cy); drawOrigenBadge(mx, r * 0.8, col); x.save(); x.globalAlpha = alpha; x.globalCompositeOperation = comp; x.drawImage(m, 0, 0); x.restore(); };
  // sombra
  x.save(); x.filter = `blur(${size * 0.035}px)`; x.fillStyle = 'rgba(0,0,0,0.7)'; x.beginPath(); x.arc(cx + size * 0.02, cy + size * 0.05, r, 0, TAU); x.fill(); x.restore();
  const edge = { 'ACRÍLICO': 'rgba(120,200,235,0.55)', MDF: '#3b2412', CUERO: '#4a2410', VIDRIO: 'rgba(120,190,150,0.6)', METAL: '#1a1b1f', MADERA: '#3a1f10' }[kind];
  x.fillStyle = edge; x.beginPath(); x.arc(cx, cy + size * 0.02, r, 0, TAU); x.fill();
  x.save(); clipC(); x.clip();
  if (kind === 'ACRÍLICO') {
    const g = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, 'rgba(90,170,210,0.55)'); g.addColorStop(1, 'rgba(20,60,90,0.6)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    badge('rgba(235,248,255,0.8)');
  } else if (kind === 'MDF') {
    x.drawImage(TEX.mdf(600, 600), cx - r, cy - r, size, size); badge('#5a3b22', 'multiply'); badge('#5a3b22', 'multiply', 0.6);
  } else if (kind === 'CUERO') {
    x.drawImage(TEX.leather(600, 600), cx - r, cy - r, size, size); badge('#6a3a1c', 'multiply');
    x.setLineDash([size * 0.025, size * 0.018]); x.strokeStyle = 'rgba(240,210,170,0.7)'; x.lineWidth = size * 0.007; x.beginPath(); x.arc(cx, cy, r * 0.92, 0, TAU); x.stroke(); x.setLineDash([]);
  } else if (kind === 'VIDRIO') {
    const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r); g.addColorStop(0, 'rgba(210,235,225,0.22)'); g.addColorStop(1, 'rgba(120,170,150,0.3)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); badge('rgba(245,250,248,0.72)');
  } else if (kind === 'METAL') {
    x.drawImage(TEX.metal(600, 600), cx - r, cy - r, size, size); badge('rgba(240,240,245,0.95)');
  } else if (kind === 'MADERA') {
    x.drawImage(TEX.wood('walnut', 700, 700, { light: '#9A6A45', dark: '#5E3A22', seed: 21, rings: 11 }), cx - r, cy - r, size, size); badge('#3a1f0f', 'multiply'); badge('#3a1f0f', 'multiply', 0.5);
  }
  // luz de estudio
  const lg = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r); lg.addColorStop(0, 'rgba(255,255,255,0.22)'); lg.addColorStop(0.45, 'rgba(255,255,255,0.02)'); lg.addColorStop(1, 'rgba(0,0,0,0.3)');
  x.fillStyle = lg; x.fillRect(0, 0, c.width, c.height);
  x.restore();
  if (kind === 'ACRÍLICO' || kind === 'VIDRIO') { x.strokeStyle = kind === 'VIDRIO' ? 'rgba(160,220,190,0.8)' : 'rgba(190,235,255,0.85)'; x.lineWidth = size * 0.008; clipC(); x.stroke(); }
  return (_tok[key] = c);
}
const SWATCHES = (() => {
  const cols = ['#C8102E', '#F2A900', '#FFD100', '#00843D', '#0072CE', '#6A2C91', '#E10098', '#111111', '#F4F4F4', '#B8B8BC', '#D4AF37', '#FF6A13',
    '#E8D0A6', '#9A6A45', '#C49A66', '#A0784F', '#7B4B2A', '#D9C7A3', '#1CB0E3', '#2E2E33', '#8B5A3C', '#C6A27E', '#6E6E73', '#EDE6D6',
    '#3F704D', '#9E1B32', '#A5D6EE', '#F8D94A', '#7B9FD4', '#E3173E', '#5C4033', '#DADADA', '#B87333', '#264653', '#E9C46A', '#F4A261'];
  return cols.map((c, i) => ({ c, kind: i % 5 }));
})();
SC.materials = {
  draw(ctx, lt, dur, M, I) {
    const { W, H, U, V } = E; const p = lt / dur;
    const steps = [M.s0, M.s1, M.s2, M.s3, M.s4, M.s5];
    let k = 0; for (let i = 0; i < 6; i++) if (p >= steps[i]) k = i;
    const nextT = k < 5 ? steps[k + 1] : M.pull;
    const tr = k < 5 ? ease.inOut(clamp((p - (nextT - 0.045)) / 0.045)) : 0;
    const pos = k + tr; // posición de cámara en fichas
    const R = (V ? 250 : 210) * U, gap = R * 2.9;
    const cy = V ? H * 0.43 : H * 0.46;
    const kPull = ease.inOut(seg(p, M.pull, M.pull + 0.16));
    // foco de luz
    const sg = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, Math.max(W, H) * 0.55); sg.addColorStop(0, 'rgba(40,40,52,0.9)'); sg.addColorStop(1, 'rgba(10,10,15,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    if (kPull < 1) {
      const kt = clamp(kPull * 2.2); ctx.save(); ctx.globalAlpha = 1 - kt;
      const sc = lerp(1, 0.6, kt);
      for (let i = 0; i < 6; i++) {
        const x = W / 2 + (i - pos) * gap * sc; if (x < -gap || x > W + gap) continue;
        const spr = tokenSprite(MATS[i], Math.round(R * 2));
        const foc = 1 - Math.min(1, Math.abs(i - pos));
        const s = sc * (0.86 + 0.14 * foc), sw = spr.width * s;
        const bob = Math.sin((lt + i) * 1.3) * 3 * U;
        ctx.save(); ctx.translate(x, cy + bob); ctx.rotate((i - pos) * 0.08 + Math.sin(lt * 0.7 + i) * 0.02);
        ctx.globalAlpha = (1 - kt) * (0.45 + 0.55 * foc);
        ctx.drawImage(spr, -sw / 2, -sw / 2, sw, sw); ctx.restore();
      }
      ctx.restore();
      // etiqueta del material en foco
      const li = Math.round(pos), la = 1 - Math.abs(pos - li) * 2;
      label(ctx, { text: MATS[li], x: W / 2, y: cy + R + (V ? 110 : 84) * U, size: (V ? 26 : 22) * U, align: 'center', color: E.P.ink, alpha: 0.9 * la * (1 - kPull), ls: 0.3 }, 1);
      label(ctx, { text: String(li + 1).padStart(2, '0') + ' / +30', x: W / 2, y: cy + R + (V ? 150 : 118) * U, size: (V ? 17 : 15) * U, align: 'center', color: E.P.dim, alpha: 0.9 * la * (1 - kPull), ls: 0.2 }, 1);
    }
    // muestrario completo
    if (kPull > 0) {
      const cols = V ? 6 : 9, rows = Math.ceil(SWATCHES.length / cols);
      const cell = (V ? 150 : 150) * U * lerp(1.5, 1, ease.out(kPull)), sw = cell * 0.78;
      const gx = W / 2 - (cols - 1) * cell / 2, gy = (V ? H * 0.4 : H * 0.42) - (rows - 1) * cell / 2;
      SWATCHES.forEach((s, i) => {
        const cx2 = gx + (i % cols) * cell, cy2 = gy + Math.floor(i / cols) * cell;
        const a = ease.out(clamp((p - M.pull - 0.05 - hash(i, 4) * 0.1) / 0.08));
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(cx2, cy2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; rrect(ctx, -sw / 2 + 3 * U, -sw / 2 + 6 * U, sw, sw, 8 * U); ctx.fill();
        ctx.fillStyle = s.c; rrect(ctx, -sw / 2, -sw / 2, sw, sw, 8 * U); ctx.fill();
        ctx.save(); ctx.clip();
        if (s.kind === 1) { ctx.globalAlpha = a * 0.35; ctx.drawImage(TEX.wood('sw', 300, 300, { light: '#ffffff', dark: '#5a4030', seed: 5 }), -sw / 2, -sw / 2, sw, sw); }
        if (s.kind === 2) { ctx.globalAlpha = a * 0.25; ctx.drawImage(TEX.metal(600, 600), -sw / 2, -sw / 2, sw, sw); }
        const lg = ctx.createLinearGradient(-sw / 2, -sw / 2, sw / 2, sw / 2); lg.addColorStop(0, 'rgba(255,255,255,0.28)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.globalAlpha = a; ctx.fillStyle = lg; ctx.fillRect(-sw / 2, -sw / 2, sw, sw);
        ctx.restore(); ctx.restore();
      });
      const tv = ctx.createLinearGradient(0, H * 0.62, 0, H); tv.addColorStop(0, 'rgba(10,10,15,0)'); tv.addColorStop(0.5, `rgba(10,10,15,${0.9 * kPull})`); tv.addColorStop(1, `rgba(10,10,15,${0.9 * kPull})`);
      ctx.fillStyle = tv; ctx.fillRect(0, H * 0.62, W, H * 0.38);
    }
    headline(ctx, '*+30* materiales.', seg(p, M.text, M.text + 0.14), 0, { size: V ? 80 : 70 });
    drawChapter(ctx, 'materials', lt, dur, I);
  },
};

// ───────────────────────── GRAN FORMATO (pendón) ─────────────────────────
let BANNER;
function bannerArt(bw, bh) {
  if (BANNER && BANNER.bw === bw) return BANNER.c;
  const c = mk(bw, bh), x = c.getContext('2d'), P = E.P;
  const sky = x.createLinearGradient(0, 0, 0, bh * 0.7); sky.addColorStop(0, '#12355B'); sky.addColorStop(0.55, '#E86A4A'); sky.addColorStop(1, '#F6C25B');
  x.fillStyle = sky; x.fillRect(0, 0, bw, bh);
  // arcos arcoíris (guiño al logo de PlottInk)
  const cxA = bw * 0.5, cyA = bh * 0.62;
  P.rainbow.forEach((col, i) => { x.strokeStyle = col; x.lineWidth = bw * 0.045; x.beginPath(); x.arc(cxA, cyA, bw * (0.62 - i * 0.052), Math.PI, TAU); x.stroke(); });
  x.fillStyle = '#FFE9A8'; x.beginPath(); x.arc(cxA, cyA, bw * 0.23, 0, TAU); x.fill();
  const ridge = (y0, amp, col, s) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, bh); for (let i = 0; i <= 60; i++) { const u = i / 60; x.lineTo(u * bw, y0 - amp * (0.5 + 0.5 * Math.sin(u * 7 + s)) - amp * 0.6 * fbm(u * 5, s, 3, s)); } x.lineTo(bw, bh); x.fill(); };
  ridge(bh * 0.66, bh * 0.08, '#7B2E6B', 1); ridge(bh * 0.72, bh * 0.07, '#4A1F5C', 3); ridge(bh * 0.8, bh * 0.05, '#1E1338', 5);
  x.fillStyle = '#16102A'; x.fillRect(0, bh * 0.8, bw, bh * 0.2);
  x.fillStyle = '#FFF6E6'; x.textAlign = 'center';
  x.font = `700 ${bw * 0.19}px ${FONTS.sans}`; x.letterSpacing = `${bw * 0.012}px`; x.fillText('ORIGEN', bw / 2, bh * 0.2);
  x.font = `italic 400 ${bw * 0.075}px ${FONTS.serif}`; x.letterSpacing = '0px'; x.fillText('café de montaña', bw / 2, bh * 0.27);
  x.font = `500 ${bw * 0.034}px ${FONTS.mono}`; x.letterSpacing = `${bw * 0.008}px`; x.fillStyle = 'rgba(255,246,230,0.85)'; x.fillText('TOSTIÓN MEDIA · 100% COLOMBIANO', bw / 2, bh * 0.9);
  BANNER = { bw, c }; return c;
}
SC.largeformat = {
  draw(ctx, lt, dur, M, I) {
    const { W, H, U, V } = E; const p = lt / dur;
    const push = lerp(1, 1.06, ease.inOutSine(p));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
    // estudio: pared + piso
    const floorY = V ? H * 0.74 : H * 0.84;
    const wall = ctx.createLinearGradient(0, 0, 0, floorY); wall.addColorStop(0, '#0B0B10'); wall.addColorStop(1, '#17171E'); ctx.fillStyle = wall; ctx.fillRect(0, 0, W, floorY);
    const fl = ctx.createLinearGradient(0, floorY, 0, H); fl.addColorStop(0, '#15151B'); fl.addColorStop(1, '#09090D'); ctx.fillStyle = fl; ctx.fillRect(0, floorY, W, H - floorY);
    const bh = Math.round(floorY - (V ? 0.2 : 0.13) * H), bw = Math.round(bh / 2.3);
    const bx = V ? W / 2 : W * 0.64, by = floorY - 14 * U;
    // luz de estudio sobre la pared
    const spot = ctx.createRadialGradient(bx, by - bh * 0.5, 0, bx, by - bh * 0.5, bh * 0.9); spot.addColorStop(0, 'rgba(255,240,220,0.08)'); spot.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = spot; ctx.fillRect(0, 0, W, H);
    const rise = ease.inOut(seg(p, M.rise, M.riseEnd)) * 1.0;
    const settle = Math.sin(clamp((p - M.riseEnd) / 0.08) * Math.PI) * 6 * U * (1 - clamp((p - M.riseEnd) / 0.08));
    const vis = bh * rise;
    const art = bannerArt(bw, bh);
    if (vis > 1) {
      // reflejo en el piso
      ctx.save(); ctx.globalAlpha = 0.14; ctx.translate(bx, by + 20 * U); ctx.scale(1, -1);
      ctx.drawImage(art, 0, 0, bw, vis, -bw / 2, 0, bw, vis); ctx.restore();
      const rf = ctx.createLinearGradient(0, by, 0, by + bh * 0.4); rf.addColorStop(0, 'rgba(10,10,14,0.2)'); rf.addColorStop(1, 'rgba(10,10,14,1)'); ctx.fillStyle = rf; ctx.fillRect(bx - bw, by + 14 * U, bw * 2, bh * 0.45);
      // el pendón sube desde el cassette: se ve la parte superior de la impresión
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40 * U; ctx.shadowOffsetX = 14 * U;
      ctx.drawImage(art, 0, 0, bw, vis, bx - bw / 2, by - vis - settle, bw, vis); ctx.restore();
      const sh = ctx.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0); sh.addColorStop(0, 'rgba(0,0,0,0.22)'); sh.addColorStop(0.3, 'rgba(255,255,255,0.05)'); sh.addColorStop(0.6, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = sh; ctx.fillRect(bx - bw / 2, by - vis - settle, bw, vis);
      // barra superior
      ctx.fillStyle = '#9EA1A8'; ctx.fillRect(bx - bw / 2 - 3 * U, by - vis - settle - 7 * U, bw + 6 * U, 8 * U);
      // mástil
      ctx.fillStyle = 'rgba(150,152,160,0.5)'; ctx.fillRect(bx + bw * 0.46, by - vis, 3 * U, vis);
    }
    // cassette
    const cg = ctx.createLinearGradient(0, by - 18 * U, 0, by + 16 * U); cg.addColorStop(0, '#C9CCD3'); cg.addColorStop(0.5, '#7E828B'); cg.addColorStop(1, '#3A3C42');
    ctx.fillStyle = cg; rrect(ctx, bx - bw / 2 - 16 * U, by - 16 * U, bw + 32 * U, 32 * U, 16 * U); ctx.fill();
    ctx.restore();
    // texto
    if (V) headline(ctx, 'Color fiel,\na *gran escala.*', seg(p, M.text, M.text + 0.16), 0, { y: H * 0.86, size: 64 });
    else headline(ctx, 'Color fiel,\na *gran escala.*', seg(p, M.text, M.text + 0.16), 0, { left: true, y: H * 0.5, size: 76, extra: { lh: 1.1 } });
    drawChapter(ctx, 'largeformat', lt, dur, I);
  },
};

// ───────────────────────── VINILO EN VITRINA ─────────────────────────
function vinylArt(ctx, cx, cy, s, col) {
  ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.textAlign = 'center';
  ctx.font = `600 ${150 * s}px ${FONTS.sans}`; ctx.letterSpacing = `${22 * s}px`; ctx.fillText('ORIGEN', cx + 11 * s, cy);
  ctx.font = `italic 400 ${58 * s}px ${FONTS.serif}`; ctx.letterSpacing = '0px'; ctx.fillText('café de montaña', cx, cy + 82 * s);
  ctx.translate(cx, cy - 220 * s); drawOrigenBadge(ctx, 70 * s, col, { text: false });
  ctx.restore();
}
SC.vinyl = {
  draw(ctx, lt, dur, M, I) {
    const { W, H, U, V } = E; const p = lt / dur;
    // interior del café desenfocado
    ctx.fillStyle = '#0d0b0a'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      const x = hash(i, 1) * W, y = H * (0.15 + hash(i, 2) * 0.7), r = (30 + hash(i, 3) * 70) * U;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); const warm = hash(i, 4) > 0.3;
      g.addColorStop(0, warm ? 'rgba(255,170,90,0.16)' : 'rgba(160,190,255,0.08)'); g.addColorStop(0.85, warm ? 'rgba(255,170,90,0.12)' : 'rgba(160,190,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + lt * 6 * U, y, r, 0, TAU); ctx.fill();
    }
    // reflejos del vidrio
    const rg = ctx.createLinearGradient(0, 0, W, H); rg.addColorStop(0.2, 'rgba(255,255,255,0)'); rg.addColorStop(0.3, 'rgba(200,215,240,0.07)'); rg.addColorStop(0.36, 'rgba(255,255,255,0)'); rg.addColorStop(0.62, 'rgba(255,255,255,0)'); rg.addColorStop(0.66, 'rgba(200,215,240,0.05)'); rg.addColorStop(0.7, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    const s = (V ? 0.95 : 1.05) * U * lerp(1, 1.04, p), cx = W / 2, cy = V ? H * 0.46 : H * 0.55;
    const sqx = lerp(cx - 640 * s, cx + 640 * s, ease.inOut(seg(p, M.squeegee, M.squeegeeEnd)));
    const peel = ease.inOut(seg(p, M.peel, M.peelEnd));
    // vinilo: detrás de la espátula ya adherido, delante con aire
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, sqx, H); ctx.clip(); vinylArt(ctx, cx, cy, s, 'rgba(250,248,244,0.97)'); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(sqx, 0, W - sqx, H); ctx.clip(); vinylArt(ctx, cx, cy, s, 'rgba(235,232,228,0.6)'); ctx.restore();
    // cinta de transferencia (papel translúcido con retícula) que se despega en diagonal
    const tx0 = cx - 620 * s, ty0 = cy - 330 * s, tw = 1240 * s, th = 480 * s;
    const pl = lerp(-0.1, 1.15, peel); // posición de la línea de despegue (0..1 a lo largo de la diagonal)
    ctx.save();
    ctx.beginPath(); ctx.rect(tx0, ty0, tw, th); ctx.clip();
    const lineAt = u => u * (tw + th); // x+y proyectada
    ctx.beginPath(); ctx.moveTo(tx0 + lineAt(pl), ty0); ctx.lineTo(tx0 + tw + th, ty0); ctx.lineTo(tx0 + tw + th, ty0 + th); ctx.lineTo(tx0 + lineAt(pl) - th, ty0 + th); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgba(232,222,196,0.2)'; ctx.fillRect(tx0, ty0, tw, th);
    ctx.strokeStyle = 'rgba(120,110,90,0.18)'; ctx.lineWidth = 1 * U;
    for (let gx = tx0; gx < tx0 + tw; gx += 40 * s) { ctx.beginPath(); ctx.moveTo(gx, ty0); ctx.lineTo(gx, ty0 + th); ctx.stroke(); }
    for (let gy = ty0; gy < ty0 + th; gy += 40 * s) { ctx.beginPath(); ctx.moveTo(tx0, gy); ctx.lineTo(tx0 + tw, gy); ctx.stroke(); }
    ctx.restore();
    if (peel > 0 && peel < 1) { // rizo de la cinta
      ctx.save(); ctx.beginPath(); ctx.rect(tx0 - 60 * s, ty0 - 60 * s, tw + 120 * s, th + 120 * s); ctx.clip();
      const x1 = tx0 + lineAt(pl), x2 = x1 - th;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 34 * s; ctx.beginPath(); ctx.moveTo(x1 + 10 * s, ty0 + 8 * s); ctx.lineTo(x2 + 10 * s, ty0 + th + 8 * s); ctx.stroke();
      const cg = ctx.createLinearGradient(x1 - 20 * s, 0, x1 + 20 * s, 0); cg.addColorStop(0, 'rgba(250,244,228,0.95)'); cg.addColorStop(0.5, 'rgba(210,200,176,0.95)'); cg.addColorStop(1, 'rgba(160,150,130,0.95)');
      ctx.strokeStyle = 'rgba(236,228,206,0.92)'; ctx.lineWidth = 26 * s; ctx.beginPath(); ctx.moveTo(x1, ty0); ctx.lineTo(x2, ty0 + th); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x1 - 8 * s, ty0); ctx.lineTo(x2 - 8 * s, ty0 + th); ctx.stroke();
      ctx.restore();
    }
    // espátula (squeegee)
    const sqa = 1 - seg(p, M.squeegeeEnd, M.squeegeeEnd + 0.05);
    if (p > M.squeegee - 0.03 && sqa > 0) {
      ctx.save(); ctx.globalAlpha = sqa; ctx.translate(sqx, cy - 70 * s); ctx.rotate(0.12);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; rrect(ctx, 10 * s, -270 * s, 40 * s, 560 * s, 14 * s); ctx.fill();
      const sg = ctx.createLinearGradient(-30 * s, 0, 30 * s, 0); sg.addColorStop(0, '#2C5E8A'); sg.addColorStop(0.5, '#3E7DB3'); sg.addColorStop(1, '#23496B');
      ctx.fillStyle = sg; rrect(ctx, -30 * s, -280 * s, 60 * s, 560 * s, 14 * s); ctx.fill();
      ctx.fillStyle = '#2b2b30'; ctx.fillRect(-36 * s, -280 * s, 12 * s, 560 * s); // fieltro
      ctx.restore();
    }
    const tv = ctx.createLinearGradient(0, H * 0.7, 0, H); tv.addColorStop(0, 'rgba(10,10,15,0)'); tv.addColorStop(1, 'rgba(10,10,15,0.85)'); ctx.fillStyle = tv; ctx.fillRect(0, H * 0.7, W, H * 0.3);
    headline(ctx, 'Vinilos que *visten* tu marca.', seg(p, M.text, M.text + 0.2), 0, { y: V ? H * 0.82 : H * 0.9 });
    drawChapter(ctx, 'vinyl', lt, dur, I);
  },
};

// ───────────────────────── AVISO LUMINOSO ─────────────────────────
SC.sign = {
  draw(ctx, lt, dur, M, I) {
    const { W, H, U, V } = E; const p = lt / dur;
    const push = lerp(1.0, 1.07, ease.inOutSine(p));
    const horizon = V ? H * 0.2 : H * 0.24;
    // cielo al anochecer (paralaje lenta)
    const sky = ctx.createLinearGradient(0, 0, 0, horizon); sky.addColorStop(0, '#0A1026'); sky.addColorStop(0.7, '#1B2A52'); sky.addColorStop(1, '#6B4A6A');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon + 2);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
    // fachada de concreto
    const cw = TEX.concrete(900, 900);
    const pat = ctx.createPattern(cw, 'repeat'); pat.setTransform(new DOMMatrix([1.2 * U, 0, 0, 1.2 * U, 0, 0]));
    ctx.fillStyle = pat; ctx.fillRect(-W * 0.1, horizon, W * 1.2, H * 1.1);
    const wallShade = ctx.createLinearGradient(0, horizon, 0, H); wallShade.addColorStop(0, 'rgba(20,24,45,0.55)'); wallShade.addColorStop(1, 'rgba(5,5,10,0.85)');
    ctx.fillStyle = wallShade; ctx.fillRect(-W * 0.1, horizon, W * 1.2, H * 1.1);
    // cornisa
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-W * 0.1, horizon, W * 1.2, 16 * U);
    // letras corpóreas
    const s = (V ? 0.68 : 1) * U, cx = W / 2 + (V ? 0 : 60 * U), cy = V ? H * 0.47 : H * 0.56;
    const text = 'ORIGEN'; ctx.font = `600 ${200 * s}px ${FONTS.sans}`; ctx.letterSpacing = `${26 * s}px`;
    const widths = [...text].map(ch => ctx.measureText(ch).width + 26 * s);
    const total = widths.reduce((a, b) => a + b, 0) - 26 * s;
    const badgeR = 105 * s, badgeX = V ? cx : cx - total / 2 - badgeR - 60 * s, badgeY = V ? cy - 250 * s : cy - 70 * s;
    let x = V ? cx - total / 2 : cx - total / 2 + 40 * s;
    const on = i => { // encendido letra por letra con parpadeo
      const t0 = M.on + (M.onEnd - M.on) * (i / 7); const u = (p - t0) * dur;
      if (u < 0) return 0; if (u < 0.12) return (Math.sin(u * 180) > 0 ? 0.8 : 0.1); return clamp(0.6 + u * 3);
    };
    const letters = [...text].map((ch, i) => { const o = { ch, x, i: i + 1 }; x += widths[i]; return o; });
    const totalOn = letters.reduce((a, l) => a + on(l.i), on(0)) / 7;
    // luz sobre la pared (halo)
    if (totalOn > 0) {
      const hg = ctx.createRadialGradient(cx, cy - 60 * s, 0, cx, cy - 60 * s, 900 * s); hg.addColorStop(0, `rgba(255,214,160,${0.28 * totalOn})`); hg.addColorStop(1, 'rgba(255,200,140,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    }
    const depth = 16;
    letters.forEach(l => {
      const k = on(l.i);
      ctx.textAlign = 'left';
      // halo trasero (retroiluminado)
      if (k > 0) glow(ctx, g => { g.font = ctx.font; g.letterSpacing = ctx.letterSpacing; g.fillStyle = `rgba(255,190,120,${0.55 * k})`; g.fillText(l.ch, l.x + 8 * s, cy + 8 * s); });
      for (let d = depth; d > 0; d--) { ctx.fillStyle = d === depth ? '#050507' : `rgb(${22 + d},${22 + d},${27 + d})`; ctx.fillText(l.ch, l.x + d * 0.7 * s, cy + d * 0.9 * s); }
      ctx.fillStyle = k > 0 ? mix('#2A2A30', '#FFF3DC', clamp(k)) : '#26262C';
      ctx.fillText(l.ch, l.x, cy);
      if (k > 0) glow(ctx, g => { g.font = ctx.font; g.letterSpacing = ctx.letterSpacing; g.fillStyle = `rgba(255,236,205,${0.9 * k})`; g.fillText(l.ch, l.x, cy); });
    });
    // insignia luminosa
    const kb = on(0);
    ctx.save(); ctx.translate(badgeX, badgeY);
    for (let d = depth; d > 0; d -= 2) { ctx.save(); ctx.translate(d * 0.7 * s, d * 0.9 * s); drawOrigenBadge(ctx, badgeR, `rgb(${20 + d},${20 + d},${25 + d})`, { text: false, lw: 0.07 }); ctx.restore(); }
    drawOrigenBadge(ctx, badgeR, kb > 0 ? mix('#2A2A30', '#FFE2A8', clamp(kb)) : '#26262C', { text: false, lw: 0.07 });
    if (kb > 0) glow(ctx, g => { drawOrigenBadge(g, badgeR, `rgba(255,200,120,${0.9 * kb})`, { text: false, lw: 0.07 }); });
    ctx.restore();
    ctx.restore();
    // capa de ambiente: tono azul del anochecer
    ctx.fillStyle = 'rgba(20,30,70,0.12)'; ctx.fillRect(0, 0, W, H);
    const tv = ctx.createLinearGradient(0, H * 0.72, 0, H); tv.addColorStop(0, 'rgba(8,8,14,0)'); tv.addColorStop(1, 'rgba(8,8,14,0.9)'); ctx.fillStyle = tv; ctx.fillRect(0, H * 0.72, W, H * 0.28);
    headline(ctx, 'Tu marca, *encendida.*', seg(p, M.text, M.text + 0.16), 0, { y: V ? H * 0.8 : H * 0.9 });
    drawChapter(ctx, 'sign', lt, dur, I);
  },
};
