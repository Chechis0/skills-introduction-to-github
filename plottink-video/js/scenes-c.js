// ACTO III (2) y cierre: souvenirs, diseño, proceso, confianza, pieza final, CTA.
'use strict';

// ───────────────────────── SOUVENIRS (cenital) ─────────────────────────
function shadowed(ctx, fn, o = {}) {
  ctx.save(); ctx.shadowColor = `rgba(0,0,0,${o.a ?? 0.65})`; ctx.shadowBlur = (o.blur ?? 26) * E.U; ctx.shadowOffsetX = (o.dx ?? 8) * E.U; ctx.shadowOffsetY = (o.dy ?? 16) * E.U; fn(); ctx.restore();
}
const ITEMS = [
  { k: 'box', x: -560, y: -40, r: -0.05, v: [-190, -470], from: [-1, 0] },
  { k: 'mug', x: -120, y: -250, r: 0.2, v: [240, -500], from: [0, -1] },
  { k: 'tag', x: 150, y: -250, r: 0.2, name: 'Sofía', mat: 'birch', v: [100, -170], from: [0, -1] },
  { k: 'tag', x: 280, y: -230, r: -0.1, name: 'Mateo', mat: 'acrylic', v: [240, -150], from: [0, -1] },
  { k: 'tag', x: 405, y: -260, r: 0.28, name: 'Valen', mat: 'walnut', v: [370, -190], from: [1, -1] },
  { k: 'plaque', x: -60, y: 120, r: 0.04, v: [-230, -60], from: [0, 1] },
  { k: 'notebook', x: 560, y: 60, r: -0.12, v: [190, 260], from: [1, 0] },
  { k: 'minitag', x: -330, y: 290, r: -0.4, v: [-300, 330], from: [-1, 1] },
  { k: 'pen', x: 300, y: 190, r: 1.25, v: [-120, 520], from: [1, 1] },
];
function drawItem(ctx, it, nameK) {
  const U = E.U;
  const woodTex = mat => mat === 'walnut' ? TEX.wood('walnut', 700, 700, { light: '#9A6A45', dark: '#5E3A22', seed: 21, rings: 11 }) : TEX.wood('birch', 900, 900, { light: '#E8D0A6', dark: '#C49A66', seed: 3 });
  const engraveText = (txt, x, y, font, col, k) => {
    if (k <= 0) return; ctx.save(); ctx.font = font; ctx.textAlign = 'center'; ctx.fillStyle = col;
    const w = ctx.measureText(txt).width; ctx.beginPath(); ctx.rect(x - w / 2 - 4, y - 200, (w + 8) * k, 400); ctx.clip(); ctx.fillText(txt, x, y); ctx.restore();
    if (k < 1) { const lx = x - w / 2 + w * k; laserDot(ctx, lx, y - 10 * U, 0.8, 0.45); }
  };
  if (it.k === 'mug') {
    const R = 120 * U;
    shadowed(ctx, () => { ctx.fillStyle = '#E9E7E3'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); rrect(ctx, R * 0.85, -26 * U, 80 * U, 52 * U, 24 * U); ctx.fill(); });
    ctx.fillStyle = '#1b1b1f'; rrect(ctx, R * 1.05, -10 * U, 42 * U, 20 * U, 10 * U); ctx.fill();
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, 0, 0, 0, R); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#CFCCC7'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    const c = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.84); c.addColorStop(0, '#8A5A36'); c.addColorStop(0.8, '#5B3A22'); c.addColorStop(1, '#3a2414'); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, R * 0.84, 0, TAU); ctx.fill();
    // latte art: corazón
    ctx.fillStyle = 'rgba(245,228,200,0.92)'; ctx.beginPath(); ctx.moveTo(0, R * 0.42); ctx.bezierCurveTo(-R * 0.6, 0, -R * 0.35, -R * 0.5, 0, -R * 0.2); ctx.bezierCurveTo(R * 0.35, -R * 0.5, R * 0.6, 0, 0, R * 0.42); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2 * U; ctx.beginPath(); ctx.arc(0, 0, R * 0.98, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
  } else if (it.k === 'tag') {
    const w = 110 * U, h = 190 * U;
    shadowed(ctx, () => { ctx.fillStyle = it.mat === 'acrylic' ? 'rgba(160,210,235,0.35)' : '#8a6a44'; rrect(ctx, -w / 2, -h / 2, w, h, 22 * U); ctx.fill(); }, { blur: 16, dy: 10, dx: 5 });
    ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 22 * U); ctx.clip();
    if (it.mat === 'acrylic') { const g = ctx.createLinearGradient(-w, -h, w, h); g.addColorStop(0, 'rgba(120,190,225,0.5)'); g.addColorStop(1, 'rgba(40,90,130,0.55)'); ctx.fillStyle = g; ctx.fillRect(-w, -h, 2 * w, 2 * h); }
    else ctx.drawImage(woodTex(it.mat), -w / 2, -h / 2, w * 2.2, h * 2.2);
    ctx.restore();
    ctx.strokeStyle = it.mat === 'acrylic' ? 'rgba(210,240,255,0.8)' : 'rgba(40,20,5,0.7)'; ctx.lineWidth = 1.5 * U; rrect(ctx, -w / 2, -h / 2, w, h, 22 * U); ctx.stroke();
    ctx.fillStyle = '#141418'; ctx.beginPath(); ctx.arc(0, -h / 2 + 22 * U, 9 * U, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#B9BBC2'; ctx.lineWidth = 4 * U; ctx.beginPath(); ctx.arc(0, -h / 2 - 16 * U, 32 * U, 0, TAU); ctx.stroke();
    ctx.save(); ctx.rotate(-Math.PI / 2);
    engraveText(it.name, -10 * U, 12 * U, `italic 400 ${54 * U}px ${FONTS.serif}`, it.mat === 'acrylic' ? 'rgba(245,250,255,0.9)' : it.mat === 'walnut' ? 'rgba(30,15,5,0.85)' : 'rgba(80,45,20,0.9)', nameK);
    ctx.restore();
  } else if (it.k === 'box') {
    const s = 360 * U;
    shadowed(ctx, () => { ctx.fillStyle = '#6b4a2e'; ctx.fillRect(-s / 2, -s / 2, s, s); });
    ctx.save(); ctx.beginPath(); ctx.rect(-s / 2, -s / 2, s, s); ctx.clip(); ctx.drawImage(woodTex('birch'), -s / 2, -s / 2, s * 1.6, s * 1.6);
    const lg = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); lg.addColorStop(0, 'rgba(255,245,225,0.15)'); lg.addColorStop(1, 'rgba(0,0,0,0.25)'); ctx.fillStyle = lg; ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
    ctx.strokeStyle = 'rgba(90,55,25,0.8)'; ctx.lineWidth = 2 * U; ctx.strokeRect(-s / 2 + 22 * U, -s / 2 + 22 * U, s - 44 * U, s - 44 * U);
    engraveText('Laura & Andrés', 0, 10 * U, `italic 400 ${58 * U}px ${FONTS.serif}`, 'rgba(80,45,20,0.9)', nameK);
    engraveText('14 · 02 · 2027', 0, 70 * U, `400 ${20 * U}px ${FONTS.mono}`, 'rgba(80,45,20,0.8)', nameK);
  } else if (it.k === 'plaque') {
    const w = 280 * U, h = 340 * U;
    shadowed(ctx, () => { ctx.fillStyle = 'rgba(40,60,80,0.35)'; rrect(ctx, -w / 2, -h / 2, w, h, 10 * U); ctx.fill(); }, { a: 0.5 });
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, 'rgba(200,230,255,0.22)'); g.addColorStop(0.5, 'rgba(120,160,200,0.1)'); g.addColorStop(1, 'rgba(200,230,255,0.2)');
    ctx.fillStyle = g; rrect(ctx, -w / 2, -h / 2, w, h, 10 * U); ctx.fill();
    ctx.strokeStyle = 'rgba(220,240,255,0.85)'; ctx.lineWidth = 2 * U; ctx.stroke();
    // estrella grabada
    ctx.save(); ctx.translate(0, -60 * U); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 26 * U : 62 * U; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath();
    ctx.fillStyle = `rgba(240,248,255,${0.75 * clamp(nameK * 3)})`; ctx.fill(); ctx.restore();
    engraveText('MEJOR EQUIPO', 0, 60 * U, `600 ${24 * U}px ${FONTS.sans}`, 'rgba(240,248,255,0.85)', nameK);
    engraveText('2026', 0, 100 * U, `400 ${20 * U}px ${FONTS.mono}`, 'rgba(240,248,255,0.7)', nameK);
  } else if (it.k === 'notebook') {
    const w = 300 * U, h = 400 * U;
    shadowed(ctx, () => { ctx.fillStyle = '#3a1f10'; rrect(ctx, -w / 2, -h / 2, w, h, 14 * U); ctx.fill(); });
    ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 14 * U); ctx.clip(); ctx.drawImage(TEX.leather(600, 600), -w / 2, -h / 2, w * 1.4, h * 1.4); ctx.restore();
    ctx.fillStyle = '#1a0d06'; ctx.fillRect(w / 2 - 44 * U, -h / 2, 10 * U, h);
    ctx.save(); ctx.globalAlpha = clamp(nameK * 2); ctx.translate(-10 * U, -30 * U); drawOrigenBadge(ctx, 70 * U, 'rgba(50,22,8,0.85)'); ctx.restore();
  } else if (it.k === 'minitag') {
    const R = 58 * U;
    ctx.strokeStyle = '#B99A6A'; ctx.lineWidth = 3 * U; ctx.beginPath(); ctx.moveTo(0, -R); ctx.bezierCurveTo(40 * U, -140 * U, 110 * U, -60 * U, 160 * U, -150 * U); ctx.stroke();
    shadowed(ctx, () => { ctx.fillStyle = '#7a5a36'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); }, { blur: 12, dy: 8, dx: 4 });
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip(); ctx.drawImage(woodTex('birch'), -R, -R, R * 4, R * 4); ctx.restore();
    ctx.fillStyle = '#141418'; ctx.beginPath(); ctx.arc(0, -R + 14 * U, 6 * U, 0, TAU); ctx.fill();
    engraveText('L & A', 0, 16 * U, `italic 400 ${36 * U}px ${FONTS.serif}`, 'rgba(80,45,20,0.9)', nameK);
  } else if (it.k === 'pen') {
    const L = 300 * U;
    shadowed(ctx, () => { const g = ctx.createLinearGradient(0, -9 * U, 0, 9 * U); g.addColorStop(0, '#3a3b42'); g.addColorStop(0.4, '#6b6d76'); g.addColorStop(1, '#141418'); ctx.fillStyle = g; rrect(ctx, -L / 2, -9 * U, L, 18 * U, 9 * U); ctx.fill(); }, { blur: 10, dy: 8, dx: 4 });
    ctx.fillStyle = '#C9CCD3'; ctx.fillRect(-L / 2 + 30 * U, -11 * U, 90 * U, 5 * U);
    engraveText('ORIGEN', 40 * U, 5 * U, `600 ${13 * U}px ${FONTS.sans}`, 'rgba(235,235,240,0.85)', nameK);
  }
}
SC.souvenirs = {
  draw(ctx, lt, dur, M, I) {
    const { W, H, U, V } = E; const p = lt / dur;
    const lin = ctx.createPattern(TEX.linen(512, 512), 'repeat'); lin.setTransform(new DOMMatrix([1.5 * U, 0, 0, 1.5 * U, 0, 0]));
    ctx.fillStyle = lin; ctx.fillRect(0, 0, W, H);
    const sp = ctx.createRadialGradient(W * 0.45, H * 0.4, 0, W / 2, H / 2, Math.max(W, H) * 0.7); sp.addColorStop(0, 'rgba(255,240,220,0.08)'); sp.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = sp; ctx.fillRect(0, 0, W, H);
    const zoom = lerp(1.06, 1, ease.out(p)) * (V ? 0.9 : 1);
    ctx.save(); ctx.translate(W / 2, V ? H * 0.42 : H * 0.47); ctx.scale(zoom, zoom); ctx.rotate(lerp(0.015, -0.01, p));
    ITEMS.forEach((it, i) => {
      const t0 = M.place + (M.placeEnd - M.place) * (i / ITEMS.length);
      const k = ease.outQuart(clamp((p - t0) / 0.07));
      if (k <= 0) return;
      let [x, y] = V ? it.v : [it.x, it.y + 40];
      const fx = x + it.from[0] * 1400, fy = y + it.from[1] * 1100;
      const nameT = M.names + (i % 5) * 0.03;
      const nk = clamp((p - nameT) / 0.08);
      ctx.save(); ctx.translate(lerp(fx, x, k) * U, lerp(fy, y, k) * U); ctx.rotate(it.r + (1 - k) * 0.4);
      drawItem(ctx, it, nk);
      ctx.restore();
    });
    ctx.restore();
    const tv = ctx.createLinearGradient(0, H * 0.72, 0, H); tv.addColorStop(0, 'rgba(8,8,12,0)'); tv.addColorStop(1, 'rgba(8,8,12,0.9)'); ctx.fillStyle = tv; ctx.fillRect(0, H * 0.72, W, H * 0.28);
    headline(ctx, 'Con nombre *propio.*', seg(p, M.text, M.text + 0.16), 0, { y: V ? H * 0.84 : H * 0.9 });
    drawChapter(ctx, 'souvenirs', lt, dur, I);
  },
};

// ───────────────────────── DISEÑO (boceto → vector → listo para corte) ─────────────────────────
SC.design = {
  draw(ctx, lt, dur, M, I) {
    const { W, H, U, V } = E; const p = lt / dur;
    const R = (V ? 330 : 280) * U, cx = W / 2, cy = V ? H * 0.42 : H * 0.44;
    const kv = ease.inOut(seg(p, M.vector, M.vectorEnd)); // 0 = papel/boceto, 1 = vector
    // papel → lienzo oscuro
    ctx.save(); ctx.globalAlpha = 1 - kv;
    ctx.drawImage(TEX.paper(1024, 1024), 0, 0, W, W > H ? W : H);
    const pv = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7); pv.addColorStop(0, 'rgba(0,0,0,0)'); pv.addColorStop(1, 'rgba(60,45,30,0.45)'); ctx.fillStyle = pv; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    if (kv > 0) { ctx.save(); ctx.globalAlpha = kv * 0.07; ctx.strokeStyle = '#A0AABE'; ctx.lineWidth = 1; const st = 40 * U; for (let x = cx % st; x < W; x += st) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = cy % st; y < H; y += st) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } ctx.restore(); }
    const sk = seg(p, M.sketch, M.sketchEnd);
    const polys = [circlePts(0, 0, 1, 120), ...ORIGEN.polys];
    // trazos de lápiz: 2 pasadas temblorosas por trazo, el temblor desaparece al vectorizar
    const jit = (1 - kv);
    polys.forEach((pl, pi) => {
      for (let pass = 0; pass < (kv > 0.95 ? 1 : 2); pass++) {
        const pts = pl.map(([x, y], j) => {
          const n1 = (noise2(j * 0.15 + pass * 10, pi * 3.1, 7) - 0.5) * 0.05 * jit, n2 = (noise2(j * 0.15 + pass * 10, pi * 3.1 + 50, 8) - 0.5) * 0.05 * jit;
          return [cx + (x + n1) * R, cy + (y + n2) * R];
        });
        const path = makePath([pts]);
        const d = path.L * clamp(sk * polys.length - pi * 0.85, 0, 1);
        if (d <= 0) continue;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = kv > 0 ? mix('#3A3A40', '#F2EEE8', kv) : 'rgba(55,52,58,0.75)';
        ctx.globalAlpha = pass ? 0.45 * (1 - kv) : 1;
        ctx.lineWidth = lerp(2.4, 1.6, kv) * U;
        path.stroke(ctx, 0, kv > 0 ? path.L : d); ctx.restore();
      }
    });
    // líneas de construcción del boceto
    if (kv < 1 && sk > 0.05) { ctx.save(); ctx.globalAlpha = 0.18 * (1 - kv) * clamp(sk * 3); ctx.strokeStyle = '#555'; ctx.lineWidth = 1 * U; ctx.beginPath(); ctx.moveTo(cx - R * 1.3, cy); ctx.lineTo(cx + R * 1.3, cy); ctx.moveTo(cx, cy - R * 1.3); ctx.lineTo(cx, cy + R * 1.3); ctx.stroke(); ctx.restore(); }
    // nodos
    const na = seg(p, M.vector + 0.04, M.vectorEnd);
    if (na > 0) {
      const nodes = [[1, 0], [0, 1], [-1, 0], [0, -1], ...ORIGEN.ridge];
      nodes.forEach(([x, y], i) => { const a = ease.outBack(clamp(na * nodes.length * 0.5 - i * 0.4)); if (a <= 0) return; const s = 9 * U * a; ctx.fillStyle = E.P.bg; ctx.strokeStyle = E.P.cyan; ctx.lineWidth = 1.4 * U; ctx.fillRect(cx + x * R - s / 2, cy + y * R - s / 2, s, s); ctx.strokeRect(cx + x * R - s / 2, cy + y * R - s / 2, s, s); });
    }
    // previsualización de la trayectoria del láser
    const pv2 = seg(p, M.preview, 0.97);
    if (pv2 > 0) {
      const all = makePath(polys.map(pl => pl.map(([x, y]) => [cx + x * R, cy + y * R])));
      ctx.save(); ctx.setLineDash([10 * U, 8 * U]); ctx.lineDashOffset = -lt * 60 * U; ctx.strokeStyle = hexA(E.P.laser, 0.9); ctx.lineWidth = 1.6 * U;
      all.stroke(ctx, 0, all.L * ease.inOut(pv2)); ctx.restore();
      const pt = all.at(all.L * ease.inOut(pv2)); if (pv2 < 1) laserDot(ctx, pt[0], pt[1], 0.7, 0.6);
      label(ctx, { text: 'origen_logo.svg  ·  LISTO PARA CORTE', x: cx, y: cy + R + 70 * U, size: 16 * U, align: 'center', color: E.P.laser, alpha: 0.9 }, seg(p, M.preview + 0.06, M.preview + 0.2));
    }
    const tv = ctx.createLinearGradient(0, H * 0.72, 0, H); tv.addColorStop(0, 'rgba(10,10,15,0)'); tv.addColorStop(1, `rgba(10,10,15,${0.6 * kv})`); ctx.fillStyle = tv; ctx.fillRect(0, H * 0.72, W, H * 0.28);
    phrase(ctx, { text: V ? '¿No tienes el arte?\n*Lo creamos.*' : '¿No tienes el arte? *Lo creamos.*', x: W / 2, y: V ? H * 0.82 : H * 0.9, size: (V ? 70 : 62) * U, font: 'serif', color: mix('#2A2622', '#F2EEE8', clamp(kv * 1.5)) }, seg(p, M.text - 0.3, M.text - 0.14));
  },
};

// ───────────────────────── PROCESO ─────────────────────────
const STEPS = ['Cuéntanos tu idea.', 'Cotización y prueba del arte.', 'Producción láser.', 'Control y entrega.'];
function chatCard(ctx, cx, cy, s, t, o = {}) {
  const U = E.U * s, w = 620 * U, h = o.reply === false ? 250 * U : 380 * U;
  ctx.save(); ctx.translate(cx - w / 2, cy - h / 2);
  shadowed(ctx, () => { ctx.fillStyle = '#16161D'; rrect(ctx, 0, 0, w, h, 26 * U); ctx.fill(); }, { blur: 40, dy: 24 });
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1 * U; rrect(ctx, 0, 0, w, h, 26 * U); ctx.stroke();
  // cabecera
  ctx.fillStyle = '#25D366'; ctx.beginPath(); ctx.arc(40 * U, 42 * U, 16 * U, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4 * U; ctx.beginPath(); ctx.arc(40 * U, 42 * U, 8 * U, 0.6, TAU - 0.9); ctx.stroke();
  ctx.fillStyle = E.P.ink; ctx.font = `500 ${22 * U}px ${FONTS.sans}`; ctx.fillText('PlottInk', 70 * U, 40 * U);
  ctx.fillStyle = E.P.dim; ctx.font = `400 ${15 * U}px ${FONTS.mono}`; ctx.fillText('WhatsApp · en línea', 70 * U, 62 * U);
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, 84 * U, w, 1 * U);
  // mensaje del cliente (se escribe)
  const msg = 'Hola, ¿me cotizan 50 llaveros\nen madera con mi logo?';
  const n = Math.floor(msg.length * clamp(t / 0.45));
  if (t > 0) {
    const bw = 440 * U, bh = 96 * U, bx = w - bw - 24 * U, by = 106 * U;
    ctx.fillStyle = '#244F3E'; rrect(ctx, bx, by, bw, bh, 18 * U); ctx.fill();
    ctx.fillStyle = E.P.ink; ctx.font = `400 ${23 * U}px ${FONTS.sans}`;
    msg.slice(0, n).split('\n').forEach((ln, i) => ctx.fillText(ln, bx + 22 * U, by + 40 * U + i * 30 * U));
  }
  if (o.reply !== false) {
    const rt = clamp((t - 0.55) / 0.3);
    if (rt > 0) {
      const bw = 470 * U, bh = 96 * U, bx = 24 * U, by = 226 * U;
      ctx.globalAlpha = ease.out(clamp(rt * 3));
      ctx.fillStyle = '#23232C'; rrect(ctx, bx, by, bw, bh, 18 * U); ctx.fill();
      ctx.fillStyle = E.P.ink; ctx.font = `400 ${23 * U}px ${FONTS.sans}`;
      if (rt < 0.35) { for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 12 + i)); ctx.beginPath(); ctx.arc(bx + 30 * U + i * 18 * U, by + 48 * U, 5 * U, 0, TAU); ctx.fill(); } }
      else { ['¡Claro! Hoy te enviamos la', 'cotización y la prueba del arte.'].forEach((ln, i) => ctx.fillText(ln, bx + 22 * U, by + 40 * U + i * 30 * U)); }
    }
  }
  ctx.restore();
}
function keychainGrid(ctx, cx, cy, s, fn) {
  const U = E.U * s, cols = 10, rows = 4, cw = 70 * U, ch = 110 * U;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = cx + (i - (cols - 1) / 2) * cw, y = cy + (j - (rows - 1) / 2) * ch;
    fn(x, y, i + j * cols, cw * 0.72, ch * 0.8);
  }
}
SC.process = {
  draw(ctx, lt, dur, M, I) {
    const { W, H, U, V } = E; const p = lt / dur;
    const bounds = [M.s1, M.s2, M.s3, M.s4, M.trust, 1];
    let k = 0; for (let i = 0; i < 5; i++) if (p >= bounds[i]) k = i;
    const lp = (p - bounds[k]) / (bounds[k + 1] - bounds[k]);
    const inA = ease.out(clamp(lp / 0.12)), outA = 1 - ease.inOut(clamp((lp - 0.9) / 0.1));
    const cx = W / 2, cy = V ? H * 0.42 : H * 0.44, s = V ? 1.25 : 1.15;
    const fade = inA * (k < 4 ? outA : 1);
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(0, (1 - inA) * 30 * U);
    if (k === 0) chatCard(ctx, cx, cy, s, lp);
    if (k === 1) {
      // cotización + prueba del arte
      const w = 560 * U * s, h = 420 * U * s, x0 = cx - w / 2 - (V ? 0 : 130 * U), y0 = cy - h / 2;
      shadowed(ctx, () => { ctx.fillStyle = '#F3EFE7'; rrect(ctx, x0, y0, w, h, 14 * U); ctx.fill(); }, { blur: 40, dy: 24 });
      ctx.fillStyle = '#1b1b20'; ctx.font = `600 ${24 * U * s}px ${FONTS.sans}`; ctx.fillText('Cotización', x0 + 36 * U * s, y0 + 58 * U * s);
      ctx.font = `400 ${15 * U * s}px ${FONTS.mono}`; ctx.fillStyle = '#6b6870'; ctx.fillText('N.º 0427', x0 + w - 130 * U * s, y0 + 56 * U * s);
      const rows = [['Llaveros madera 3 mm', '× 50'], ['Grabado láser, 1 cara', '✓'], ['Prueba del arte', '✓'], ['Cotización', 'Sin costo']];
      rows.forEach(([a, b], i) => {
        const ra = clamp(lp * 5 - i * 0.5); if (ra <= 0) return; ctx.globalAlpha = fade * ra;
        const yy = y0 + (120 + i * 58) * U * s;
        ctx.fillStyle = '#2a2830'; ctx.font = `400 ${21 * U * s}px ${FONTS.sans}`; ctx.fillText(a, x0 + 36 * U * s, yy);
        ctx.textAlign = 'right'; ctx.font = `500 ${19 * U * s}px ${FONTS.mono}`; ctx.fillStyle = i === 3 ? '#0E7FA8' : '#2a2830'; ctx.fillText(b, x0 + w - 36 * U * s, yy); ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x0 + 36 * U * s, yy + 20 * U * s, w - 72 * U * s, 1);
      });
      ctx.globalAlpha = fade;
      // mockup del llavero + sello
      if (!V) {
        const mx = cx + 300 * U, my = cy;
        ctx.save(); ctx.translate(mx, my); ctx.rotate(0.12);
        drawItem(ctx, { k: 'tag', mat: 'birch', name: 'ORIGEN' }, 1); ctx.restore();
      }
      const st = ease.outBack(clamp((lp - 0.45) / 0.12));
      if (st > 0) {
        ctx.save(); ctx.translate(V ? cx + 120 * U : cx + 150 * U, cy + 120 * U * s); ctx.rotate(-0.18); ctx.scale(lerp(1.8, 1, st), lerp(1.8, 1, st)); ctx.globalAlpha = fade * clamp(st);
        ctx.strokeStyle = E.P.magenta; ctx.lineWidth = 4 * U; rrect(ctx, -170 * U, -40 * U, 340 * U, 80 * U, 10 * U); ctx.stroke();
        ctx.fillStyle = E.P.magenta; ctx.font = `700 ${30 * U}px ${FONTS.sans}`; ctx.textAlign = 'center'; ctx.letterSpacing = `${4 * U}px`; ctx.fillText('ARTE APROBADO', 0, 11 * U);
        ctx.restore();
      }
    }
    if (k === 2) {
      // cama láser con 40 llaveros: el láser salta de pieza en pieza
      const bedW = (V ? 820 : 900) * U, bedH = (V ? 560 : 520) * U;
      ctx.save(); ctx.beginPath(); rrect(ctx, cx - bedW / 2, cy - bedH / 2, bedW, bedH, 12 * U); ctx.clip();
      const pat = ctx.createPattern(TEX.honeycomb(), 'repeat'); pat.setTransform(new DOMMatrix([1.2 * U, 0, 0, 1.2 * U, 0, 0])); ctx.fillStyle = pat; ctx.fillRect(cx - bedW / 2, cy - bedH / 2, bedW, bedH);
      ctx.restore();
      const prog = clamp((lp - 0.05) / 0.85) * 40;
      keychainGrid(ctx, cx, cy, V ? 1.1 : 1, (x, y, i, w, h) => {
        ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; rrect(ctx, -w / 2 + 3 * U, -h / 2 + 5 * U, w, h, 10 * U); ctx.fill();
        ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 10 * U); ctx.clip(); ctx.drawImage(TEX.wood('birch', 900, 900, { light: '#E8D0A6', dark: '#C49A66', seed: 3 }), -w / 2 - (i % 7) * 20, -h / 2 - (i % 5) * 30, w * 4, h * 4); ctx.restore();
        ctx.fillStyle = '#141418'; ctx.beginPath(); ctx.arc(0, -h / 2 + 10 * U, 4 * U, 0, TAU); ctx.fill();
        if (i < prog) { ctx.save(); ctx.translate(0, 8 * U); ctx.globalAlpha *= clamp(prog - i); drawOrigenBadge(ctx, w * 0.36, 'rgba(80,45,20,0.9)', { text: false }); ctx.restore(); }
        ctx.restore();
      });
      if (prog < 40 && prog > 0) {
        const i = Math.floor(prog), cols = 10, cw = 70 * U * (V ? 1.1 : 1), ch = 110 * U * (V ? 1.1 : 1);
        const x = cx + ((i % cols) - 4.5) * cw + Math.sin(lt * 40) * 8 * U, y = cy + (Math.floor(i / cols) - 1.5) * ch + 8 * U + Math.cos(lt * 33) * 8 * U;
        laserDot(ctx, x, y, 0.9, 0.7);
        const posAt = te => { const lp3 = (te / dur - bounds[2]) / (bounds[3] - bounds[2]); const j = Math.floor(clamp((lp3 - 0.05) / 0.85) * 40); return [cx + ((j % cols) - 4.5) * cw, cy + (Math.floor(j / cols) - 1.5) * ch + 8 * U]; };
        sparks(ctx, lt, dur * bounds[2], lt, posAt, { rate: 200, life: 0.2, grav: 0, speed: 180, spread: TAU, width: 1.3 });
      }
      label(ctx, { text: 'ENTREGA 24–72 H EN TRABAJOS PEQUEÑOS', x: cx, y: cy + bedH / 2 + 50 * U, size: (V ? 19 : 16) * U, align: 'center', color: E.P.dim, alpha: 0.95 }, clamp((lp - 0.2) / 0.3));
    }
    if (k === 3) {
      // control pieza por pieza → mapa de envíos
      const kc = clamp(lp / 0.4), km = ease.inOut(clamp((lp - 0.42) / 0.12));
      if (km < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - km;
        keychainGrid(ctx, cx, cy, V ? 1.1 : 1, (x, y, i, w, h) => {
          ctx.save(); ctx.translate(x, y);
          ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 10 * U); ctx.clip(); ctx.drawImage(TEX.wood('birch', 900, 900, { light: '#E8D0A6', dark: '#C49A66', seed: 3 }), -w / 2 - (i % 7) * 20, -h / 2 - (i % 5) * 30, w * 4, h * 4); ctx.restore();
          ctx.save(); ctx.translate(0, 8 * U); drawOrigenBadge(ctx, w * 0.36, 'rgba(80,45,20,0.9)', { text: false }); ctx.restore();
          const c = ease.outBack(clamp(kc * 44 - i)); if (c > 0) { ctx.fillStyle = E.P.cyan; ctx.beginPath(); ctx.arc(w / 2 - 4 * U, -h / 2 + 4 * U, 13 * U * c, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6 * U; ctx.beginPath(); ctx.moveTo(w / 2 - 10 * U, -h / 2 + 4 * U); ctx.lineTo(w / 2 - 5 * U, -h / 2 + 9 * U); ctx.lineTo(w / 2 + 3 * U, -h / 2 - 2 * U); ctx.stroke(); }
          ctx.restore();
        });
        ctx.restore();
      }
      if (km > 0) {
        const co = E.colombia.mainland; const lon0 = -74.2, lat0 = 4.3;
        const sc = (V ? 60 : 44) * U * lerp(1.15, 1, km);
        const pj = ([lon, lat]) => [cx + (lon - lon0) * sc, cy - (lat - lat0) * sc * 1.0 - (V ? 0 : 10 * U)];
        ctx.save(); ctx.globalAlpha *= km;
        ctx.beginPath(); co.forEach((q, i) => { const [x, y] = pj(q); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
        ctx.fillStyle = 'rgba(242,238,232,0.035)'; ctx.fill(); ctx.strokeStyle = 'rgba(242,238,232,0.5)'; ctx.lineWidth = 1.3 * U; ctx.stroke();
        const cities = [[-75.58, 6.24], [-76.53, 3.45], [-74.8, 10.96], [-75.48, 10.39], [-73.12, 7.12], [-75.7, 4.81], [-77.28, 1.21], [-72.5, 7.89], [-73.63, 4.14], [-74.2, 11.24]];
        const bog = pj([-74.07, 4.71]);
        const rp = clamp((lp - 0.5) / 0.45);
        cities.forEach((c, i) => {
          const a = clamp(rp * cities.length * 0.6 - i * 0.5); if (a <= 0) return;
          const [x, y] = pj(c); const mx2 = (bog[0] + x) / 2, my2 = (bog[1] + y) / 2 - Math.hypot(x - bog[0], y - bog[1]) * 0.35;
          const ar = makePath([Array.from({ length: 30 }, (_, j) => { const u = j / 29; return [(1 - u) * (1 - u) * bog[0] + 2 * (1 - u) * u * mx2 + u * u * x, (1 - u) * (1 - u) * bog[1] + 2 * (1 - u) * u * my2 + u * u * y]; })]);
          ctx.strokeStyle = hexA(E.P.laser, 0.75); ctx.lineWidth = 1.5 * U; ar.stroke(ctx, 0, ar.L * ease.inOut(a));
          if (a >= 1) { ctx.fillStyle = E.P.ink; ctx.beginPath(); ctx.arc(x, y, 3.5 * U, 0, TAU); ctx.fill(); }
          else { const q = ar.at(ar.L * ease.inOut(a)); glow(ctx, g => { g.fillStyle = 'rgba(255,190,110,0.9)'; g.beginPath(); g.arc(q[0], q[1], 5 * U, 0, TAU); g.fill(); }); }
        });
        ctx.fillStyle = E.P.laser; ctx.beginPath(); ctx.arc(bog[0], bog[1], 6 * U, 0, TAU); ctx.fill();
        glow(ctx, g => { g.fillStyle = 'rgba(255,180,90,0.9)'; g.beginPath(); g.arc(bog[0], bog[1], 10 * U, 0, TAU); g.fill(); });
        label(ctx, { text: 'BOGOTÁ', x: bog[0] + 14 * U, y: bog[1] + 5 * U, size: 13 * U, color: E.P.laser, alpha: 0.95 }, clamp(km * 2));
        ctx.restore();
        label(ctx, { text: 'ENVÍOS A TODO EL PAÍS', x: V ? cx : cx + 330 * U, y: V ? cy + 470 * U : cy + 40 * U, size: (V ? 19 : 16) * U, align: V ? 'center' : 'left', color: E.P.ink, alpha: 0.9 }, clamp((lp - 0.55) / 0.25));
      }
    }
    ctx.restore();
    // riel de pasos con gotas CMYK
    if (k < 4 || lp < 0.2) {
      const ra = k < 4 ? 1 : 1 - clamp(lp / 0.2);
      const rx0 = W / 2 - (V ? 340 : 360) * U, rx1 = W / 2 + (V ? 340 : 360) * U, ry = V ? H * 0.86 : H * 0.92;
      ctx.save(); ctx.globalAlpha = ra;
      ctx.strokeStyle = 'rgba(242,238,232,0.18)'; ctx.lineWidth = 1 * U; ctx.beginPath(); ctx.moveTo(rx0, ry); ctx.lineTo(rx1, ry); ctx.stroke();
      const pos = Math.min(3, k + ease.inOut(clamp((lp - 0.85) / 0.15)) * (k < 3 ? 1 : 0));
      const dx = lerp(rx0, rx1, pos / 3);
      ctx.strokeStyle = hexA(E.P.laser, 0.8); ctx.beginPath(); ctx.moveTo(rx0, ry); ctx.lineTo(dx, ry); ctx.stroke();
      const cols = ['cyan', 'magenta', 'yellow', 'key'];
      for (let i = 0; i < 4; i++) {
        const x = lerp(rx0, rx1, i / 3), done = i <= k;
        if (done) drop(ctx, x, ry - 4 * U, 7 * U, cols[i] === 'key' ? '#EDEAE4' : E.P[cols[i]], 0);
        else { ctx.fillStyle = E.P.bg; ctx.strokeStyle = 'rgba(242,238,232,0.3)'; ctx.beginPath(); ctx.arc(x, ry, 5 * U, 0, TAU); ctx.fill(); ctx.stroke(); }
        label(ctx, { text: '0' + (i + 1), x, y: ry + 34 * U, size: 13 * U, align: 'center', color: done ? E.P.ink : E.P.dim, alpha: 0.9 }, 1);
      }
      if (k < 4) laserDot(ctx, dx, ry, 0.6, 0.45);
      ctx.restore();
    }
    // título del paso (una frase a la vez)
    if (k < 4) phrase(ctx, { text: STEPS[k], x: W / 2, y: V ? H * 0.78 : H * 0.83, size: (V ? 60 : 50) * U, font: 'serif' }, clamp(lp / 0.25), clamp((lp - 0.88) / 0.12));
    else {
      phrase(ctx, { text: 'Cotización sin costo.\nRespuesta en *24 horas.*', x: W / 2, y: H / 2, size: (V ? 84 : 84) * U, font: 'serif', lh: 1.15 }, clamp(lp / 0.35));
    }
  },
};

SC.trust_short = {
  draw(ctx, lt, dur, M) {
    const { W, H, U, V } = E; const p = lt / dur;
    const ca = 1 - ease.inOut(seg(p, M.trust - 0.06, M.trust + 0.02));
    if (ca > 0) { ctx.save(); ctx.globalAlpha = ca * ease.out(seg(p, 0, 0.06)); chatCard(ctx, W / 2, V ? H * 0.42 : H * 0.46, V ? 1.25 : 1, seg(p, M.chat, M.trust - 0.04) * 1.1, { reply: false }); ctx.restore(); }
    phrase(ctx, { text: 'Cotización sin costo.\nRespuesta en *24 horas.*', x: W / 2, y: H / 2, size: 84 * U, font: 'serif', lh: 1.15 }, seg(p, M.trust, M.trust + 0.25));
  },
};

// ───────────────────────── PIEZA FINAL (luz suave) ─────────────────────────
SC.close_piece = {
  draw(ctx, lt, dur, M) {
    const { W, H, U, V } = E; const p = lt / dur;
    E.grainAmt = 0.065;
    const fov = 30, fl = (H / 2) / Math.tan(fov * Math.PI / 360);
    const elev = lerp(52, 60, ease.inOutSine(p)) * Math.PI / 180, az = lerp(-100, -82, ease.inOutSine(p)) * Math.PI / 180;
    const Rpx = V ? 0.4 * W : 0.3 * H, dist = fl / Rpx * lerp(1.06, 0.94, ease.inOutSine(p)) * 1.05;
    const cam = camera([dist * Math.cos(elev) * Math.cos(az), dist * Math.cos(elev) * Math.sin(az), dist * Math.sin(elev)], [0, 0, 0], fov, W, H);
    const oy = V ? -H * 0.08 : -H * 0.04;
    const pj = (x, y, z = 0) => { const q = cam.project(x, y, z); return [q[0], q[1] + oy, q[2]]; };
    // superficie: pizarra oscura con charco de luz
    const lx = lerp(W * 0.2, W * 0.8, ease.inOutSine(p));
    const pool = ctx.createRadialGradient(W / 2, H / 2 + oy, 0, W / 2, H / 2 + oy, Math.max(W, H) * 0.6); pool.addColorStop(0, 'rgba(48,44,52,0.9)'); pool.addColorStop(1, 'rgba(10,10,15,0)');
    ctx.fillStyle = pool; ctx.fillRect(0, 0, W, H);
    const th = 0.06; // grosor del disco
    const ring = (r, z) => circlePts(0, 0, r, 160).map(([x, y]) => pj(x, y, z));
    // sombra
    ctx.save(); ctx.filter = `blur(${22 * U}px)`; ctx.fillStyle = 'rgba(0,0,0,0.8)'; polyPath(ctx, circlePts(0.07, 0.1, 1.06, 90).map(([x, y]) => pj(x, y, 0))); ctx.fill(); ctx.restore();
    // canto
    const top = ring(1.06, th), bot = ring(1.06, 0);
    ctx.fillStyle = '#0c0c10'; polyPath(ctx, bot); ctx.fill();
    for (let i = 0; i < top.length - 1; i++) {
      const a = i / (top.length - 1) * TAU; const lit = 0.5 + 0.5 * Math.cos(a - (-2.2 + p * 1.2));
      ctx.fillStyle = `rgb(${18 + lit * 40},${18 + lit * 40},${22 + lit * 46})`;
      ctx.beginPath(); ctx.moveTo(top[i][0], top[i][1]); ctx.lineTo(top[i + 1][0], top[i + 1][1]); ctx.lineTo(bot[i + 1][0], bot[i + 1][1]); ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath(); ctx.fill();
    }
    // cara superior: acrílico negro brillante
    ctx.save(); polyPath(ctx, top); ctx.fillStyle = '#101015'; ctx.fill(); ctx.clip();
    // mandala esmerilado (el mismo del gancho)
    ctx.strokeStyle = 'rgba(226,224,236,0.62)'; ctx.lineWidth = 1.5 * U; ctx.lineCap = 'round';
    MANDALA.path.stroke(ctx, 0, MANDALA.path.L, (x, y) => pj(x * 0.9, y * 0.9, th));
    // barrido de luz especular
    const sweepX = lerp(-0.3, 1.3, ease.inOutSine(seg(p, 0, 1)));
    const sg = ctx.createLinearGradient(W * (sweepX - 0.3), 0, W * (sweepX + 0.1), H);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,246,232,0.16)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // brillo del borde pulido
    ctx.strokeStyle = 'rgba(240,240,255,0.35)'; ctx.lineWidth = 1.2 * U; polyPath(ctx, top); ctx.stroke();
    // motas de polvo en el haz de luz
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const x = (hash(i, 1) * 1.3 - 0.15) * W + Math.sin(lt * 0.4 + i) * 20 * U, y = ((hash(i, 2) + lt * 0.012 * (0.5 + hash(i, 3))) % 1) * H;
      const beam = Math.exp(-(((x - lx) / (W * 0.25)) ** 2));
      const a = 0.25 * beam * (0.3 + hash(i, 4)); if (a < 0.01) continue;
      const r = (1 + hash(i, 5) * 5) * U;
      ctx.fillStyle = `rgba(255,236,210,${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // haz volumétrico tenue
    const bm = ctx.createLinearGradient(lx - W * 0.2, 0, lx + W * 0.2, 0); bm.addColorStop(0, 'rgba(255,240,220,0)'); bm.addColorStop(0.5, 'rgba(255,240,220,0.035)'); bm.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = bm; ctx.fillRect(0, 0, W, H);
    const tv = ctx.createLinearGradient(0, H * 0.7, 0, H); tv.addColorStop(0, 'rgba(10,10,15,0)'); tv.addColorStop(1, 'rgba(10,10,15,0.9)'); ctx.fillStyle = tv; ctx.fillRect(0, H * 0.7, W, H * 0.3);
    phrase(ctx, { text: V ? 'Convertimos tus ideas\nen piezas *reales.*' : 'Convertimos tus ideas en piezas *reales.*', x: W / 2, y: V ? H * 0.8 : H * 0.88, size: (V ? 68 : 62) * U, font: 'serif', lh: 1.12 }, seg(p, M.text, M.text + 0.3), seg(p, 0.94, 1.0));
    E.fade = ease.inOut(seg(p, 0.9, 1)) * 0.9;
  },
};

// ───────────────────────── OUTRO: logo + llamado a la acción ─────────────────────────
let OUTRO_L;
SC.outro = {
  draw(ctx, lt, dur, M) {
    const { W, H, U, V } = E; const p = lt / dur;
    E.grainAmt = 0.06;
    const kc = ease.inOut(seg(p, M.cta - 0.06, M.cta + 0.08));
    const baseY = H / 2 - (V ? 40 : 30) * U;
    const lift = kc * (V ? 230 : 150) * U;
    const width = (V ? W * 0.74 : W * 0.46) * lerp(1, 0.86, kc);
    const WL = wordmarkLayout(W / 2, baseY - lift, width);
    const la = ease.out(seg(p, M.logo, M.logo + 0.12));
    ctx.save(); ctx.globalAlpha = la; ctx.filter = la < 1 ? `blur(${((1 - la) * 10 * U).toFixed(1)}px)` : 'none';
    drawWordmark(ctx, WL, null);
    ctx.restore();
    drawDrops(ctx, WL, seg(p, M.logo + 0.03, M.logo + 0.2));
    // subtítulo
    phrase(ctx, { text: 'CENTRO DE SERVICIOS GRÁFICOS', x: W / 2, y: WL.bottom + (V ? 80 : 64) * U, size: (V ? 24 : 18) * U, font: 'sans', weight: 400, ls: 0.24, color: E.P.dim, blur: 4, stagger: 0.2 }, seg(p, M.logo + 0.08, M.logo + 0.22), seg(p, M.fade, 1));
    // línea láser que separa logo y CTA
    const lp2 = seg(p, M.cta - 0.02, M.cta + 0.1);
    const ly = WL.bottom + (V ? 170 : 120) * U, lw = (V ? 520 : 560) * U;
    if (lp2 > 0) {
      const x1 = W / 2 - lw / 2 + lw * ease.inOut(lp2);
      ctx.strokeStyle = `rgba(242,238,232,${0.25 * (1 - seg(p, M.fade, 1))})`; ctx.lineWidth = 1 * U; ctx.beginPath(); ctx.moveTo(W / 2 - lw / 2, ly); ctx.lineTo(x1, ly); ctx.stroke();
      if (lp2 < 1) laserDot(ctx, x1, ly, 0.8, 0.5);
    }
    // CTA
    const ca = seg(p, M.cta + 0.04, M.cta + 0.2), cb = seg(p, M.cta + 0.1, M.cta + 0.26), out = seg(p, M.fade, 1);
    if (V) {
      phrase(ctx, { text: 'Cotiza por WhatsApp', x: W / 2, y: ly + 90 * U, size: 38 * U, font: 'sans', weight: 300, color: E.P.dim, stagger: 0.3 }, ca, out);
      phrase(ctx, { text: '301 630 0242', x: W / 2, y: ly + 180 * U, size: 78 * U, font: 'sans', weight: 500, ls: 0.02, stagger: 0.3 }, ca, out);
      phrase(ctx, { text: '@plottink.co  ·  www.plottink.co', x: W / 2, y: ly + 270 * U, size: 28 * U, font: 'mono', weight: 400, color: E.P.ink, alpha: 0.75, stagger: 0.2, blur: 4 }, cb, out);
    } else {
      phrase(ctx, { text: 'Cotiza por WhatsApp  ·  *301 630 0242*', x: W / 2, y: ly + 88 * U, size: 50 * U, font: 'sans', weight: 300, color: E.P.dim, itColor: E.P.ink, em: 'color', stagger: 0.25 }, ca, out);
      phrase(ctx, { text: '@plottink.co  ·  www.plottink.co', x: W / 2, y: ly + 160 * U, size: 27 * U, font: 'mono', weight: 400, color: E.P.ink, alpha: 0.75, stagger: 0.2, blur: 4 }, cb, out);
    }
    E.fade = ease.inOut(seg(p, M.fade, 1));
    // logo y gotas se desvanecen con el fade global
  },
};
