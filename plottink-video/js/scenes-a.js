// ACTO I–II: gancho (láser → mandala → congelado → pregunta), logo, posicionamiento.
'use strict';

// ───────────────────────── MANDALA ─────────────────────────
const MANDALA = (() => {
  const line = [[0, 0], [1, 0]];
  const contour = circlePts(0, 0, 1, 220, 0, TAU);
  const pattern = [];
  pattern.push(circlePts(0, 0, 0.92, 170, 0));
  const petal = (a, r0, r1, w, n = 26) => {
    const pts = []; const ca = Math.cos(a), sa = Math.sin(a);
    for (let s = 0; s <= 1; s++) for (let i = 0; i <= n; i++) {
      const u = s ? 1 - i / n : i / n, r = lerp(r0, r1, u), off = Math.sin(Math.PI * u) * w * (s ? -1 : 1) * (0.6 + 0.4 * u);
      pts.push([ca * r - sa * off, sa * r + ca * off]);
    }
    return pts;
  };
  for (let k = 0; k < 16; k++) pattern.push(petal((k + 0.5) * TAU / 16, 0.3, 0.9, 0.12));
  for (let k = 0; k < 8; k++) pattern.push(petal(k * TAU / 8, 0.14, 0.5, 0.1));
  pattern.push(circlePts(0, 0, 0.3, 90), circlePts(0, 0, 0.14, 60), circlePts(0, 0, 0.05, 30));
  for (let k = 1; k < 16; k++) { const a = k * TAU / 16; pattern.push([[Math.cos(a) * 0.05, Math.sin(a) * 0.05], [Math.cos(a), Math.sin(a)]]); }
  const rho = Math.sin(Math.PI / 48);
  for (let k = 0; k < 48; k++) { const a = k * TAU / 48; pattern.push(circlePts(Math.cos(a), Math.sin(a), rho, 14, a - Math.PI / 2, Math.PI)); }
  for (let k = 0; k < 32; k++) { const a = (k + 0.5) * TAU / 32; pattern.push(circlePts(Math.cos(a) * 0.96, Math.sin(a) * 0.96, 0.017, 12)); }
  const all = makePath([line, contour, ...pattern]);
  const L1 = 1, L2 = TAU, L3 = all.L - L1 - L2;
  return { path: all, L1, L2, L3 };
})();

// progreso del láser (distancia recorrida) en función de la fracción de escena
function mandalaD(p, M) {
  const { L1, L2, L3 } = MANDALA;
  if (p < M.line) return 0;
  if (p < M.contour) return ease.inOut(seg(p, M.line, M.contour)) * L1;
  if (p < M.pattern) return L1 + ease.inOutSine(seg(p, M.contour, M.pattern)) * L2;
  return L1 + L2 + Math.pow(seg(p, M.pattern, 0.965), 1.55) * L3;
}

// polvo/partículas sobre el acrílico (posiciones mundo fijas)
const DUST = (() => {
  const R = rng(77), a = [];
  for (let i = 0; i < 520; i++) { const r = Math.sqrt(R()) * 3.2, t = R() * TAU; a.push({ x: Math.cos(t) * r, y: Math.sin(t) * r, z: 0, s: 0.002 + R() * 0.004, b: 0.15 + R() * 0.5 }); }
  for (let i = 0; i < 70; i++) { const r = Math.sqrt(R()) * 2.2, t = R() * TAU; a.push({ x: Math.cos(t) * r, y: Math.sin(t) * r, z: 0.03 + R() * 0.45, s: 0.003 + R() * 0.004, b: 0.3 + R() * 0.6, air: 1 }); }
  return a;
})();
const BOKEH = {};
function bokehSprite(rgb = '255,255,255') {
  if (BOKEH[rgb]) return BOKEH[rgb];
  const n = 64, c = mk(n, n), x = c.getContext('2d');
  const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, `rgba(${rgb},0.55)`); g.addColorStop(0.78, `rgba(${rgb},0.7)`); g.addColorStop(0.9, `rgba(${rgb},0.9)`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.beginPath(); x.arc(n / 2, n / 2, n / 2, 0, TAU); x.fill();
  return (BOKEH[rgb] = c);
}
let HOOK_L, HOOK_LB;

// Render del gancho. lt en segundos dentro de hook_laser; opts.freeze para el congelado.
function drawHook(ctx, lt, dur, M, opts = {}) {
  const { W, H, U, V } = E;
  const p = lt / dur;
  const fz = opts.freeze || 0; // segundos transcurridos desde el congelado
  const d = mandalaD(p, M);
  const dp = 0.004; const speed = (mandalaD(Math.min(1, p + dp), M) - d) / (dp * dur); // unidades/s
  const dot = MANDALA.path.at(d);
  // cámara
  const fov = 32, fl = (H / 2) / Math.tan(fov * Math.PI / 360);
  const Rpx = V ? 0.4 * W : 0.3 * H;
  const Dend = fl * 1 / Rpx;
  const kc = ease.inOut(seg(p, 0.3, 0.97));
  const kd = Math.pow(ease.inOut(seg(p, 0.22, 0.97)), 1.25);
  const elev = lerp(9, 84, kc) * Math.PI / 180;
  const az = (lerp(-112, -84, p) + fz * 1.6) * Math.PI / 180;
  const dist = lerp(0.5, Dend, kd) * (1 - fz * 0.012);
  const wt = ease.inOut(seg(p, 0.36, 0.8));
  const tgt = [lerp(dot[0], 0, wt), lerp(dot[1], 0, wt), 0];
  const cam = camera([tgt[0] + dist * Math.cos(elev) * Math.cos(az), tgt[1] + dist * Math.cos(elev) * Math.sin(az), dist * Math.sin(elev)], tgt, fov, W, H);
  const proj = (x, y, z = 0) => cam.project(x, y, z);
  const fdot = proj(dot[0], dot[1]);
  const zf = Math.hypot(cam.pos[0] - lerp(dot[0], 0, wt * 0.6), cam.pos[1] - lerp(dot[1], 0, wt * 0.6), cam.pos[2]);
  const aperture = 0.018;
  const coc = z => aperture * fl * Math.abs(1 / z - 1 / zf);
  const on = p >= M.dot ? ease.out(seg(p, M.dot, M.dot + 0.05)) : 0; // encendido del punto
  const cool = fz > 0 ? Math.exp(-fz * 1.4) : 1;

  // superficie: brillo amplio + calor alrededor del punto
  ctx.save();
  const sheen = ctx.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, Math.max(W, H) * 0.9);
  sheen.addColorStop(0, 'rgba(60,60,80,0.18)'); sheen.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sheen; ctx.fillRect(0, 0, W, H);
  if (on > 0) {
    const hr = (70 + 140 * clamp(speed / 10)) * U * (0.6 + 0.4 * (1 - kc));
    const hg = ctx.createRadialGradient(fdot[0], fdot[1], 0, fdot[0], fdot[1], hr * 3);
    hg.addColorStop(0, `rgba(255,150,60,${0.22 * on * cool})`); hg.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // bokeh: polvo en superficie y en el aire, iluminado por el láser
  const spr = bokehSprite('200,205,225'), sprW = bokehSprite('255,190,120');
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of DUST) {
    const q = proj(s.x, s.y, s.z); if (q[2] < 0.05) continue;
    const c = coc(q[2]); const r = Math.max(0.7 * U, s.s * fl / q[2]) + c;
    if (q[0] < -r || q[0] > W + r || q[1] < -r || q[1] > H + r) continue;
    const ld = Math.hypot(s.x - dot[0], s.y - dot[1], s.z);
    const lit = on * cool * 1.4 / (1 + (ld / 0.22) ** 2);
    const a = clamp((s.b * 0.07 + lit) / (1 + (c / (6 * U)) ** 1.3), 0, 0.9) * (s.air ? 0.8 : 1);
    if (a < 0.004) continue;
    ctx.globalAlpha = a;
    const sp = lit > 0.06 ? sprW : spr;
    ctx.drawImage(sp, q[0] - r, q[1] - r, r * 2, r * 2);
  }
  ctx.restore();

  // trazos: capa nítida + copia desenfocada, mezcladas por una máscara de foco por filas
  if (!HOOK_L) { HOOK_L = mk(W, H); HOOK_LB = mk(W / 3, H / 3); }
  const L = HOOK_L.getContext('2d');
  L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, W, H);
  const lw = Math.max(1.1 * U, 0.0052 * fl / zf);
  const map = (x, y) => proj(x, y);
  const hotLen = clamp(speed * 0.085, 0.03, 5.5);
  const coolEnd = Math.max(0, d - hotLen);
  if (d > 0) {
    L.lineCap = 'round'; L.lineJoin = 'round';
    L.strokeStyle = 'rgba(222,220,232,0.5)'; L.lineWidth = lw; MANDALA.path.stroke(L, 0, coolEnd + hotLen * 0.3, map);
    L.strokeStyle = 'rgba(255,255,255,0.35)'; L.lineWidth = lw * 0.35; MANDALA.path.stroke(L, 0, coolEnd + hotLen * 0.3, map);
  }
  // máscara de foco (filas de pantalla → profundidad del plano)
  const LB = HOOK_LB.getContext('2d');
  LB.setTransform(1, 0, 0, 1, 0, 0); LB.clearRect(0, 0, HOOK_LB.width, HOOK_LB.height);
  LB.filter = `blur(${(3.5 * U).toFixed(1)}px)`; LB.drawImage(HOOK_L, 0, 0, HOOK_LB.width, HOOK_LB.height); LB.filter = 'none';
  const rowCoc = y => { // intersección rayo-plano para la fila y (columna central)
    const ny = (H / 2 - y) / fl; const dir = [cam.f[0] + cam.u[0] * ny, cam.f[1] + cam.u[1] * ny, cam.f[2] + cam.u[2] * ny];
    if (dir[2] >= -1e-4) return 99; const tt = -cam.pos[2] / dir[2]; const z = tt; return coc(z);
  };
  ctx.save();
  ctx.globalAlpha = 1; ctx.drawImage(HOOK_LB, 0, 0, W, H);
  L.globalCompositeOperation = 'destination-in';
  const mg = L.createLinearGradient(0, 0, 0, H);
  for (let k = 0; k <= 16; k++) { const y = H * k / 16; mg.addColorStop(k / 16, `rgba(0,0,0,${clamp(1.3 - rowCoc(y) / (5 * U))})`); }
  L.fillStyle = mg; L.fillRect(0, 0, W, H); L.globalCompositeOperation = 'source-over';
  ctx.drawImage(HOOK_L, 0, 0);
  ctx.restore();

  // tramo caliente (cometa) — núcleo en la capa principal, halo en la capa emisiva
  if (d > 0 && cool > 0.02) {
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a0 = coolEnd + hotLen * k / n, a1 = coolEnd + hotLen * (k + 1) / n + 0.002, heat = (k + 1) / n;
      const col = heat > 0.8 ? [255, 244, 224] : heat > 0.45 ? [255, 190, 110] : [255, 130, 50];
      ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = `rgba(${col},${(0.25 + 0.75 * heat) * cool})`; ctx.lineWidth = lw * (0.8 + heat * 0.3);
      MANDALA.path.stroke(ctx, a0, a1, map); ctx.restore();
      glow(ctx, g => { g.lineCap = 'butt'; g.strokeStyle = `rgba(255,${Math.round(140 + 90 * heat)},${Math.round(60 + 100 * heat)},${0.7 * heat * cool})`; g.lineWidth = Math.min(lw * 3, 14 * U); MANDALA.path.stroke(g, a0, a1, map); });
    }
  }
  // humo, chispas, punto
  if (on > 0) {
    const posAt = te => { const pp = te / dur; const dd = mandalaD(pp, M); const pt = MANDALA.path.at(dd); return proj(pt[0], pt[1]); };
    if (!fz) smoke(ctx, lt, dur * M.line, dur, posAt, { alpha: 0.045 * (1 - kc * 0.7), rise: 90 * (1 - kc) + 10, scale: 1.4 - kc * 0.6 });
    const dens = te => { const pp = te / dur; return pp < M.line ? 0 : pp < M.contour ? 0.18 : pp < M.pattern ? 0.35 : 0.55 + 0.45 * seg(pp, M.pattern, 0.9); };
    sparks(ctx, lt, dur * M.line, dur, posAt, {
      rate: 420, life: 0.5, density: dens, freeze: fz ? dur : undefined,
      grav: lerp(1100, 120, kc), speed: lerp(620, 420, kc), spread: lerp(Math.PI * 1.1, TAU, kc), width: lerp(2.6, 1.6, kc),
    });
    const flick = 0.85 + 0.15 * Math.sin(lt * 90) * Math.sin(lt * 37);
    laserDot(ctx, fdot[0], fdot[1], on * (fz ? cool * 0.9 + 0.1 * Math.exp(-fz * 3) : flick), lerp(1.5, 0.9, kc));
  }
}

SC.hook_laser = {
  draw(ctx, lt, dur, M) {
    E.letterbox = 1; E.grainAmt = 0.06;
    drawHook(ctx, lt, dur, M);
  },
};

SC.hook_question = {
  draw(ctx, lt, dur, M) {
    E.letterbox = 1; E.grainAmt = 0.06;
    const hook = E.list.find(s => s.id === 'hook_laser');
    const hd = hook ? hook.dur : 7;
    const p = lt / dur;
    drawHook(ctx, hd, hd, E.TL.scenes.hook_laser.marks, { freeze: lt + 0.0001 });
    // oscurecer suavemente: todo queda suspendido
    // rack focus hacia fuera: el mandala se desenfoca detrás de la frase
    const df = ease.inOut(seg(p, 0.06, 0.36));
    if (df > 0) {
      if (!SC.hook_question.B) SC.hook_question.B = mk(E.W / 4, E.H / 4);
      const B = SC.hook_question.B, b = B.getContext('2d');
      b.filter = `blur(${(2.5 * E.U).toFixed(1)}px)`; b.clearRect(0, 0, B.width, B.height); b.drawImage(E.S, 0, 0, B.width, B.height); b.filter = 'none';
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = df; ctx.drawImage(B, 0, 0, E.W, E.H); ctx.restore();
    }
    const dim = ease.inOut(seg(p, 0.04, 0.3)) * 0.6 + ease.inOut(seg(p, M.black, 1)) * 0.4;
    ctx.fillStyle = `rgba(4,4,7,${dim})`; ctx.fillRect(0, 0, E.W, E.H);
    E.bloom = 1 - dim * 0.8;
    const { W, H, U, V } = E;
    phrase(ctx, {
      text: V ? '¿Y si tu idea\npudiera existir\n*mañana?*' : '¿Y si tu idea pudiera existir *mañana?*',
      x: W / 2, y: H / 2 + (V ? 0 : 20 * U), size: (V ? 86 : 72) * U, font: 'serif', color: E.P.ink, lh: 1.1, stagger: 0.5,
    }, seg(p, M.textIn, M.textIn + 0.38), seg(p, M.textOut, M.black));
  },
};

// ───────────────────────── LOGO (wordmark recortado por láser) ─────────────────────────
// posiciones de las gotas CMYK relativas al wordmark (unidades de fuente, del logo original)
const DROPS = [
  { c: 'key', x: 3480, y: -1260, r: 150, from: [4200, -380] },
  { c: 'cyan', x: 4430, y: -1420, r: 125, from: [4350, -420] },
  { c: 'yellow', x: 5090, y: -1140, r: 132, from: [4450, -380] },
  { c: 'magenta', x: 5420, y: -700, r: 118, from: [4500, -300] },
];
function wordmarkLayout(cx, cy, width) {
  const G = E.glyphs.wordmark; const bx0 = G.bbox[0], bx1 = 5560, by0 = -1640, by1 = G.bbox[3];
  const s = width / (bx1 - bx0);
  const ox = cx - (bx0 + bx1) / 2 * s, oy = cy - (by0 + by1) / 2 * s + 90 * s;
  const tx = (x, y) => [ox + x * s, oy + y * s];
  const letters = G.letters.map(l => {
    const contours = l.contours.map(c => c.map(([x, y]) => tx(x, y)));
    const path = new Path2D(); contours.forEach(c => { c.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1]))); path.closePath(); });
    return { ch: l.ch, contours, path };
  });
  return { s, tx, letters, top: oy + by0 * s, bottom: oy + by1 * s };
}
function drawWordmark(ctx, WL, alphaFn, o = {}) {
  const s = WL.s;
  WL.letters.forEach((l, i) => {
    const a = alphaFn ? alphaFn(i) : 1; if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = o.fill || E.P.ink; ctx.fill(l.path, 'nonzero');
    ctx.clip(l.path);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = o.inline || '#0A0A0F'; ctx.lineWidth = 2 * (40 + 15) * s; ctx.stroke(l.path);
    ctx.strokeStyle = o.fill || E.P.ink; ctx.lineWidth = 2 * 40 * s; ctx.stroke(l.path);
    ctx.restore();
  });
}
function drawDrops(ctx, WL, p, o = {}) {
  DROPS.forEach((d, k) => {
    const q = o.static ? 1 : ease.outBack(clamp(p * 1.0 - k * 0.12, 0, 1) / 1 * 1);
    const qa = o.static ? 1 : clamp((p - k * 0.12) * 6);
    if (qa <= 0) return;
    const [fx, fy] = WL.tx(d.from[0], d.from[1]); const [tx, ty] = WL.tx(d.x, d.y);
    const x = lerp(fx, tx, q), y = lerp(fy, ty, q);
    const rot = Math.atan2(fy - ty, fx - tx) + Math.PI / 2 + Math.PI; // punta hacia el origen de la salpicadura
    const col = d.c === 'key' ? '#1a1a20' : E.P[d.c];
    ctx.save(); ctx.globalAlpha *= qa;
    drop(ctx, x, y, d.r * WL.s * lerp(0.4, 1, clamp(q)), col, rot, { rim: d.c === 'key' ? 'rgba(242,238,232,0.55)' : null });
    ctx.restore();
  });
}

let LOGO_L;
SC.logo = {
  draw(ctx, lt, dur, M) {
    const { W, H, U, V } = E; const p = lt / dur;
    E.letterbox = 1 - ease.inOut(seg(p, M.bars, 0.95));
    const push = 1 + 0.035 * ease.inOut(p);
    ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
    const WL = (LOGO_L && LOGO_L.W === W) ? LOGO_L.WL : (LOGO_L = { W, WL: wordmarkLayout(W / 2, H / 2 - (V ? 40 : 30) * U, V ? W * 0.74 : W * 0.5) }).WL;
    // trayectoria del láser por todos los contornos
    if (!LOGO_L.path) {
      LOGO_L.path = makePath(WL.letters.flatMap(l => l.contours));
      let acc = 0; LOGO_L.ends = WL.letters.map(l => { l.contours.forEach(c => { for (let i = 1; i < c.length; i++) acc += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]); }); return acc; });
    }
    const P = LOGO_L.path;
    const tp = seg(p, M.trace, M.traceEnd); const d = P.L * (tp * 0.85 + ease.inOut(tp) * 0.15);
    const tNow = lt;
    // relleno de cada letra al terminar su contorno
    const fillAt = LOGO_L.ends.map(e => { const u = e / P.L; return (M.trace + (M.traceEnd - M.trace) * u) * dur; });
    const alpha = i => ease.out(clamp((tNow - fillAt[i]) / 0.35));
    // contorno enfriado
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(242,238,232,0.55)'; ctx.lineWidth = 1.4 * U;
    P.stroke(ctx, 0, d);
    ctx.restore();
    drawWordmark(ctx, WL, alpha);
    // brasa en los bordes de la letra recién liberada
    WL.letters.forEach((l, i) => {
      const k = clamp((tNow - fillAt[i]) / 0.7); if (k <= 0 || k >= 1) return;
      glow(ctx, g => { g.strokeStyle = `rgba(255,170,80,${(1 - k) * 0.9})`; g.lineWidth = 5 * U; g.stroke(l.path); });
    });
    // cometa caliente + chispas + punto
    if (tp > 0 && tp < 1) {
      const hot = 0.035 * P.L;
      for (let k = 0; k < 5; k++) {
        const a0 = d - hot * (1 - k / 5), a1 = d - hot * (1 - (k + 1) / 5), h = (k + 1) / 5;
        ctx.save(); ctx.strokeStyle = `rgba(255,${Math.round(150 + 100 * h)},${Math.round(70 + 150 * h)},${h})`; ctx.lineWidth = 2 * U; P.stroke(ctx, Math.max(0, a0), a1); ctx.restore();
        glow(ctx, g => { g.strokeStyle = `rgba(255,170,80,${h * 0.8})`; g.lineWidth = 7 * U; P.stroke(g, Math.max(0, a0), a1); });
      }
      const pt = P.at(d);
      const posAt = te => { const u = seg(te / dur, M.trace, M.traceEnd); return P.at(P.L * (u * 0.85 + ease.inOut(u) * 0.15)); };
      sparks(ctx, lt, dur * M.trace, dur * M.traceEnd, posAt, { rate: 300, life: 0.35, grav: 700, speed: 420, density: () => 0.6, width: 1.8 });
      laserDot(ctx, pt[0], pt[1], 1, 0.8);
    } else if (tp >= 1) {
      // chispas residuales tras apagar
      const posAt = te => { const u = seg(te / dur, M.trace, M.traceEnd); return P.at(P.L * (u * 0.85 + ease.inOut(u) * 0.15)); };
      sparks(ctx, lt, dur * M.trace, dur * M.traceEnd, posAt, { rate: 300, life: 0.35, grav: 700, speed: 420, density: () => 0.6, width: 1.8 });
    }
    // gotas CMYK
    drawDrops(ctx, WL, seg(p, M.fill, M.fill + 0.3));
    // subtítulo
    const sub = V ? 'CENTRO DE SERVICIOS GRÁFICOS\nCORTE Y GRABADO LÁSER' : 'CENTRO DE SERVICIOS GRÁFICOS  ·  CORTE Y GRABADO LÁSER';
    phrase(ctx, { text: sub, x: W / 2, y: WL.bottom + (V ? 110 : 92) * U, size: (V ? 26 : 21) * U, font: 'sans', weight: 400, ls: 0.2, color: E.P.dim, lh: 1.7, stagger: 0.15, blur: 6, valign: 'top' }, seg(p, M.sub, M.sub + 0.3));
    if (p > 0.97) E.fade = 0; // corte seco a la siguiente escena
  },
};

// ───────────────────────── POSICIONAMIENTO ─────────────────────────
let COASTER;
function coasterSprite(size) {
  if (COASTER && COASTER.size === size) return COASTER.c;
  const pad = size * 0.18, c = mk(size + pad * 2, size + pad * 2), x = c.getContext('2d'), r = size / 2, cx = c.width / 2, cy = c.height / 2;
  // sombra
  x.save(); x.filter = `blur(${size * 0.03}px)`; x.fillStyle = 'rgba(0,0,0,0.65)'; x.beginPath(); x.arc(cx + size * 0.02, cy + size * 0.045, r * 1.01, 0, TAU); x.fill(); x.restore();
  // canto (grosor)
  x.fillStyle = '#5a3a20'; x.beginPath(); x.arc(cx, cy + size * 0.018, r, 0, TAU); x.fill();
  // cara superior: madera
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.clip();
  const wood = TEX.wood('birch', 900, 900, { light: '#E8D0A6', dark: '#C49A66', seed: 3 });
  x.drawImage(wood, cx - r, cy - r, size, size);
  // grabado: máscara opaca → multiplicar (se ve la veta a través del quemado) + relieve
  const m = mk(c.width, c.height), mx = m.getContext('2d');
  mx.translate(cx, cy); drawOrigenBadge(mx, r * 0.92, '#6E4A2E');
  x.save(); x.globalAlpha = 0.5; x.globalCompositeOperation = 'screen'; x.drawImage(m, size * 0.003, size * 0.004); x.restore();
  x.save(); x.globalCompositeOperation = 'multiply'; x.drawImage(m, 0, 0); x.drawImage(m, 0, 0); x.restore();
  // borde carbonizado del corte láser
  const eg = x.createRadialGradient(cx, cy, r * 0.9, cx, cy, r);
  eg.addColorStop(0, 'rgba(60,30,10,0)'); eg.addColorStop(0.8, 'rgba(60,30,10,0.25)'); eg.addColorStop(1, 'rgba(40,20,5,0.85)');
  x.fillStyle = eg; x.fillRect(0, 0, c.width, c.height);
  // luz
  const lg = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  lg.addColorStop(0, 'rgba(255,245,225,0.22)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.25)');
  x.fillStyle = lg; x.fillRect(0, 0, c.width, c.height);
  x.restore();
  COASTER = { size, c };
  return c;
}

SC.positioning = {
  draw(ctx, lt, dur, M) {
    const { W, H, U, V } = E; const p = lt / dur;
    E.grainAmt = 0.07;
    const R = (V ? 300 : 250) * U, cx = W / 2, cy = V ? H * 0.42 : H * 0.45;
    const kPull = ease.inOut(seg(p, M.pull, 0.97));
    const zoom = lerp(1, V ? 0.2 : 0.17, kPull) * (1 + 0.04 * ease.inOut(seg(p, 0, M.pull)));
    const kMat = ease.inOut(seg(p, M.materialize, M.materialize + 0.1));
    // fondo CAD: retícula fina
    ctx.save();
    const gridA = (1 - kMat * 0.6) * (1 - kPull);
    if (gridA > 0.01) {
      ctx.strokeStyle = `rgba(160,170,190,${0.07 * gridA})`; ctx.lineWidth = 1;
      const step = 40 * U * zoom;
      for (let x = (cx % step); x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = (cy % step); y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }
    ctx.restore();
    // cama de panal al alejarse
    const bedA = ease.inOut(seg(p, M.pull - 0.04, M.pull + 0.14));
    if (bedA > 0) {
      ctx.save(); ctx.globalAlpha = bedA * 0.9;
      const pat = ctx.createPattern(TEX.honeycomb(), 'repeat');
      const s = 0.9 * U * zoom * 4; pat.setTransform(new DOMMatrix([s, 0, 0, s, cx, cy]));
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
      const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7); vg.addColorStop(0, 'rgba(10,10,15,0)'); vg.addColorStop(1, 'rgba(10,10,15,0.85)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    const spr = coasterSprite(Math.round(R * 2));
    const sprScale = (R * 2) / (spr.width / 1.36);
    // rejilla de producción
    if (kPull > 0) {
      const sp = R * 2.34 * zoom, rr = R * zoom;
      const nx = Math.ceil(W / sp / 2) + 1, ny = Math.ceil(H / sp / 2) + 1;
      for (let j = -ny; j <= ny; j++) for (let i = -nx; i <= nx; i++) {
        if (!i && !j) continue;
        const x = cx + i * sp, y = cy + j * sp; if (x < -sp || x > W + sp || y < -sp || y > H + sp) continue;
        const dd = Math.hypot(i, j) / Math.hypot(nx, ny);
        const a = ease.outBack(clamp((p - M.pull - 0.03 - dd * 0.22) / 0.08));
        if (a <= 0) continue;
        const sw = spr.width * (rr * 2 / (spr.width / 1.36)) * a;
        ctx.globalAlpha = clamp(a); ctx.drawImage(spr, x - sw / 2, y - sw / 2, sw, sw); ctx.globalAlpha = 1;
      }
    }
    // pieza central
    ctx.save(); ctx.translate(cx, cy); ctx.scale(zoom, zoom);
    if (kMat > 0) { const sw = spr.width * sprScale; ctx.globalAlpha = kMat; ctx.drawImage(spr, -sw / 2, -sw / 2, sw, sw); ctx.globalAlpha = 1; }
    // capa vectorial (archivo)
    const va = (1 - kMat) * ease.out(seg(p, 0, 0.06));
    if (va > 0.01) {
      ctx.globalAlpha = va;
      const draw = ease.inOut(seg(p, 0.0, 0.2));
      ctx.lineWidth = 1.6 * U / zoom; ctx.strokeStyle = E.P.ink; ctx.lineJoin = 'round';
      const outline = makePath([circlePts(0, 0, R, 160), ...ORIGEN.polys.map(pl => pl.map(([x, y]) => [x * R * 0.92, y * R * 0.92]))]);
      outline.stroke(ctx, 0, outline.L * draw);
      // nodos y manejadores (azul cian de la marca)
      const nodeA = seg(p, 0.1, 0.18);
      if (nodeA > 0) {
        ctx.globalAlpha = va * nodeA;
        const nodes = [[R, 0], [0, R], [-R, 0], [0, -R], ...ORIGEN.ridge.map(([x, y]) => [x * R * 0.92, y * R * 0.92])];
        ctx.strokeStyle = E.P.cyan; ctx.fillStyle = E.P.bg; ctx.lineWidth = 1.4 * U;
        [[R, 0, 0, 1], [0, R, 1, 0], [-R, 0, 0, 1], [0, -R, 1, 0]].forEach(([x, y, hx, hy]) => { ctx.beginPath(); ctx.moveTo(x - hx * R * 0.55, y - hy * R * 0.55); ctx.lineTo(x + hx * R * 0.55, y + hy * R * 0.55); ctx.stroke(); [[-1], [1]].forEach(([sg]) => { ctx.beginPath(); ctx.arc(x + sg * hx * R * 0.55, y + sg * hy * R * 0.55, 3.2 * U, 0, TAU); ctx.fill(); ctx.stroke(); }); });
        nodes.forEach(([x, y]) => { ctx.fillRect(x - 4.5 * U, y - 4.5 * U, 9 * U, 9 * U); ctx.strokeRect(x - 4.5 * U, y - 4.5 * U, 9 * U, 9 * U); });
        // caja de selección
        ctx.setLineDash([6 * U, 5 * U]); ctx.strokeStyle = hexA(E.P.cyan, 0.6); ctx.strokeRect(-R * 1.08, -R * 1.08, R * 2.16, R * 2.16); ctx.setLineDash([]);
        // cota
        ctx.strokeStyle = 'rgba(242,238,232,0.5)'; ctx.lineWidth = 1 * U;
        const yy = R * 1.26; ctx.beginPath(); ctx.moveTo(-R, yy); ctx.lineTo(R, yy); ctx.moveTo(-R, yy - 8 * U); ctx.lineTo(-R, yy + 8 * U); ctx.moveTo(R, yy - 8 * U); ctx.lineTo(R, yy + 8 * U); ctx.stroke();
        ctx.restore(); ctx.save();
        label(ctx, { text: 'Ø 90 mm', x: cx, y: cy + (R * 1.26 + 30 * U) * zoom, size: 15 * U, align: 'center', color: E.P.ink, alpha: 0.7 * va }, nodeA);
        label(ctx, { text: 'origen_posavasos.svg', x: cx - R * 1.08 * zoom, y: cy - (R * 1.08 + 16 * U) * zoom, size: 14 * U, color: E.P.cyan, alpha: 0.85 * va }, nodeA);
      }
    }
    ctx.restore();
    // textos (una frase a la vez)
    const ty = V ? H * 0.76 : H * 0.885, size = (V ? 66 : 58) * U;
    phrase(ctx, { text: 'Del archivo…', x: W / 2, y: ty, size, font: 'serif' }, seg(p, M.t1, M.t1 + 0.12), seg(p, M.materialize - 0.02, M.materialize + 0.04));
    phrase(ctx, { text: '…a la pieza *real.*', x: W / 2, y: ty, size, font: 'serif' }, seg(p, M.t2, M.t2 + 0.1), seg(p, M.pull - 0.02, M.pull + 0.04));
    if (kPull > 0) { // velo para legibilidad sobre la rejilla
      const vg = ctx.createRadialGradient(W / 2, ty - size * 0.3, 0, W / 2, ty - size * 0.3, size * 7);
      vg.addColorStop(0, `rgba(8,8,12,${0.82 * seg(p, M.t3 - 0.04, M.t3 + 0.04)})`); vg.addColorStop(1, 'rgba(8,8,12,0)');
      ctx.save(); ctx.translate(W / 2, ty - size * 0.3); ctx.scale(1, 0.32); ctx.translate(-W / 2, -(ty - size * 0.3));
      ctx.fillStyle = vg; ctx.fillRect(0, ty - size * 8, W, size * 16); ctx.restore();
    }
    phrase(ctx, { text: 'Una pieza. *O mil.*', x: W / 2, y: ty, size, font: 'serif' }, seg(p, M.t3, M.t3 + 0.1));
  },
};
