// PlottInk film — motor de render determinista.
// Cada cuadro es una función pura del tiempo: renderFrame(t) puede llamarse en cualquier orden
// (los workers de render trabajan en paralelo sobre rangos distintos).
'use strict';

const E = {};          // estado global del motor
const SC = {};         // registro de escenas: SC[id] = { init?, draw(ctx, lt, dur, M, I) }

// ───────────────────────── utilidades matemáticas ─────────────────────────
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = t => t * t * (3 - 2 * t);
const ease = {
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  in: t => t * t * t,
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const TAU = Math.PI * 2;

// hash estable → [0,1)
function hash(i, s = 0) {
  let h = (i | 0) * 374761393 + (s | 0) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// value noise 2D suave
function noise2(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const r = (i, j) => hash(i * 7919 + j * 104729, s);
  const u = smooth(xf), v = smooth(yf);
  return lerp(lerp(r(xi, yi), r(xi + 1, yi), u), lerp(r(xi, yi + 1), r(xi + 1, yi + 1), u), v);
}
function fbm(x, y, oct = 4, s = 0) {
  let a = 0.5, f = 1, v = 0, n = 0;
  for (let i = 0; i < oct; i++) { v += a * noise2(x * f, y * f, s + i * 17); n += a; a *= 0.5; f *= 2.03; }
  return v / n;
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const c = (s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, t));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

// ───────────────────────── cámara 3D mínima (plano z=0) ─────────────────────────
function camera(pos, target, fovDeg, W, H) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const f = norm(sub(target, pos));
  let up = [0, 0, 1]; if (Math.abs(dot(f, up)) > 0.999) up = [0, -1, 0];
  const r = norm(cross(f, up)); const u = cross(r, f);
  const fl = (H / 2) / Math.tan((fovDeg * Math.PI / 180) / 2);
  return {
    pos, f, r, u, fl,
    project(x, y, z = 0) {
      const d = [x - pos[0], y - pos[1], z - pos[2]];
      const zc = dot(d, f); const xc = dot(d, r); const yc = dot(d, u);
      return [W / 2 + (xc / zc) * fl, H / 2 - (yc / zc) * fl, zc];
    },
  };
}

// ───────────────────────── texto editorial ─────────────────────────
const FONTS = {
  serif: "'Instrument Serif', Georgia, serif",
  sans: "'Inter Tight', 'Liberation Sans', sans-serif",
  mono: "'JetBrains Mono', 'DejaVu Sans Mono', monospace",
  brand: "'Fredoka', 'Inter Tight', sans-serif",
};
function fontStr(o) { return `${o.italic ? 'italic ' : ''}${o.weight || 400} ${o.size}px ${FONTS[o.font || 'sans']}`; }

// Frase con revelado palabra por palabra (alpha + subida + desenfoque → nitidez).
// pin: 0→1 entrada, pout: 0→1 salida. segmentos: '*palabra*' = cursiva.
function phrase(ctx, o, pin, pout = 0) {
  if (pin <= 0 || pout >= 1) return;
  ctx.save();
  const lines = String(o.text).split('\n');
  const lh = (o.lh || 1.12) * o.size;
  ctx.textBaseline = 'alphabetic';
  if (o.ls !== undefined) ctx.letterSpacing = (o.ls * o.size) + 'px';
  // tokens
  const toks = []; let idx = 0;
  lines.forEach((ln, li) => {
    const words = ln.split(' ').filter(Boolean);
    words.forEach(w => { const it = /^\*.*\*[.,?!:]*$/.test(w) || (o.italicAll); toks.push({ w: w.replace(/\*/g, ''), li, it, i: idx++ }); });
  });
  const n = toks.length; const stagger = o.stagger ?? 0.55;
  const space = o.size * 0.26;
  // medir
  const itOf = t => (t.it && o.em !== 'color') || o.italic;
  const widths = toks.map(t => { ctx.font = fontStr({ ...o, italic: itOf(t) }); return ctx.measureText(t.w).width; });
  const lineW = lines.map((_, li) => toks.reduce((s, t, k) => s + (t.li === li ? widths[k] + space : 0), 0) - space);
  const totalH = (lines.length - 1) * lh;
  const outA = 1 - ease.inOut(clamp(pout));
  let cursor = {};
  toks.forEach((t, k) => {
    const align = o.align || 'center';
    if (cursor[t.li] === undefined) cursor[t.li] = align === 'center' ? o.x - lineW[t.li] / 2 : align === 'right' ? o.x - lineW[t.li] : o.x;
    const x = cursor[t.li]; cursor[t.li] += widths[k] + space;
    const y = o.y - (o.valign === 'bottom' ? totalH : o.valign === 'top' ? 0 : totalH / 2) + t.li * lh;
    const wp = ease.out(clamp(pin * (n * stagger + 1) - k * stagger));
    if (wp <= 0) return;
    const a = wp * outA * (o.alpha ?? 1);
    ctx.globalAlpha = a;
    ctx.font = fontStr({ ...o, italic: itOf(t) });
    const bl = (1 - wp) * (o.blur ?? 10) * E.U + (pout > 0 ? ease.in(pout) * 6 * E.U : 0);
    ctx.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none';
    ctx.fillStyle = (t.it && o.itColor) ? o.itColor : (o.color || E.P.ink);
    ctx.textAlign = 'left';
    ctx.fillText(t.w, x, y + (1 - wp) * o.size * 0.28);
  });
  ctx.restore();
}
// etiqueta técnica monoespaciada (aparece con tipeo)
function label(ctx, o, p, pout = 0) {
  if (p <= 0 || pout >= 1) return;
  ctx.save();
  ctx.font = fontStr({ font: 'mono', weight: o.weight || 400, size: o.size });
  ctx.letterSpacing = ((o.ls ?? 0.18) * o.size) + 'px';
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'alphabetic';
  const n = Math.ceil(o.text.length * clamp(p * 1.2));
  let s = o.text.slice(0, n);
  ctx.globalAlpha = (o.alpha ?? 0.8) * (1 - ease.inOut(clamp(pout))) * clamp(p * 4);
  ctx.fillStyle = o.color || E.P.ink;
  if (o.align === 'center') {
    // centrar el texto completo aunque se esté tipeando
    const full = ctx.measureText(o.text).width; ctx.textAlign = 'left'; ctx.fillText(s, o.x - full / 2, o.y);
  } else ctx.fillText(s, o.x, o.y);
  ctx.restore();
}

// marcador de capítulo: gota CMYK + número + nombre
function chapter(ctx, num, name, color, p, pout) {
  if (p <= 0 || pout >= 1) return;
  const U = E.U, V = E.V;
  const x = V ? 72 * U : 96 * U, y = V ? 196 * U : 92 * U;
  const a = ease.out(clamp(p * 2)) * (1 - ease.inOut(clamp(pout)));
  ctx.save();
  // velo oscuro suave para que la etiqueta se lea sobre fondos claros
  ctx.save(); ctx.globalAlpha = a * 0.55; ctx.translate(x + 200 * U, y - 6 * U); ctx.scale(1, 0.22);
  const vg = ctx.createRadialGradient(0, 0, 0, 0, 0, 300 * U); vg.addColorStop(0, 'rgba(6,6,9,0.9)'); vg.addColorStop(1, 'rgba(6,6,9,0)');
  ctx.fillStyle = vg; ctx.fillRect(-300 * U, -300 * U, 600 * U, 600 * U); ctx.restore();
  ctx.globalAlpha = a;
  drop(ctx, x + 7 * U, y - 7 * U, 9 * U, color, 0.35);
  ctx.restore();
  label(ctx, { text: num, x: x + 26 * U, y, size: 15 * U, color: E.P.ink, alpha: 0.9 }, p, pout);
  label(ctx, { text: name, x: x + 70 * U, y, size: 15 * U, color: E.P.dim, alpha: 0.9 }, clamp(p - 0.1), pout);
}

// gota de tinta estilo logo (cuerpo redondo + punta), con brillo especular
function drop(ctx, x, y, r, color, rot = 0, opts = {}) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -r * 2.1);
  ctx.bezierCurveTo(r * 0.35, -r * 1.35, r, -r * 0.75, r, 0);
  ctx.arc(0, 0, r, 0, Math.PI, false);
  ctx.bezierCurveTo(-r, -r * 0.75, -r * 0.35, -r * 1.35, 0, -r * 2.1);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  if (opts.rim) { ctx.strokeStyle = opts.rim; ctx.lineWidth = Math.max(1, r * 0.08); ctx.stroke(); }
  // brillo
  ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.35, r * 0.18, r * 0.42, 0.35, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
  ctx.restore();
}

// ───────────────────────── capas y post-proceso ─────────────────────────
function initEngine(opts) {
  const { W, H, timeline, cut, glyphs, colombia } = opts;
  Object.assign(E, { W, H, V: H > W, U: Math.min(W, H) / 1080, TL: timeline, P: timeline.palette, cut, glyphs, colombia });
  E.fps = timeline.fps;
  E.canvas = document.getElementById('c');
  E.canvas.width = W; E.canvas.height = H;
  E.out = E.canvas.getContext('2d');
  E.S = mk(W, H); E.s = E.S.getContext('2d');
  E.G = mk(W / 2, H / 2); E.g = E.G.getContext('2d');
  E.B1 = mk(W / 4, H / 4); E.b1 = E.B1.getContext('2d');
  E.B2 = mk(W / 10, H / 10); E.b2 = E.B2.getContext('2d');
  // viñeta
  E.VIG = mk(W, H); { const c = E.VIG.getContext('2d'); const r = Math.hypot(W, H) / 2; const gr = c.createRadialGradient(W / 2, H / 2, r * 0.35, W / 2, H / 2, r * 1.02); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0.62)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); }
  // grano: teselas de ruido gris medio
  E.grain = [];
  for (let k = 0; k < 6; k++) {
    const n = 256, c = mk(n, n), x = c.getContext('2d'), id = x.createImageData(n, n), R = rng(1000 + k);
    for (let i = 0; i < n * n; i++) { const g = 128 + (R() + R() + R() - 1.5) * 150; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = clamp(g, 0, 255); id.data[i * 4 + 3] = 255; }
    x.putImageData(id, 0, 0); E.grain.push(c);
  }
  // lista de escenas del corte
  const list = timeline.cuts[cut].scenes; let t0 = 0;
  E.list = list.map(([id, dur]) => { const s = { id, start: t0, dur, def: timeline.scenes[id] }; t0 += dur; return s; });
  E.total = t0;
  for (const k in SC) if (SC[k].init && E.list.some(s => s.id === k)) SC[k].init();
}

// glow(fn): dibuja en la capa emisiva con la misma transformación que la capa principal
function glow(ctx, fn) {
  const m = ctx.getTransform();
  E.g.save();
  E.g.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, 0, 0]).multiply(m));
  E.g.globalAlpha = ctx.globalAlpha;
  fn(E.g);
  E.g.restore();
}

function sceneAt(t) {
  for (let i = 0; i < E.list.length; i++) { const s = E.list[i]; if (t < s.start + s.dur || i === E.list.length - 1) return { s, i }; }
}

function renderFrame(t) {
  const { W, H, s, g, out } = E;
  const { s: sc, i } = sceneAt(t);
  const lt = clamp(t - sc.start, 0, sc.dur);
  E.t = t; E.frame = Math.round(t * E.fps); E.letterbox = 0; E.grainAmt = 0.075; E.vig = 1; E.bloom = 1;
  s.setTransform(1, 0, 0, 1, 0, 0); s.globalAlpha = 1; s.globalCompositeOperation = 'source-over'; s.filter = 'none';
  s.fillStyle = E.P.bg; s.fillRect(0, 0, W, H);
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W / 2, H / 2);
  const M = {}; const marks = (sc.def && sc.def.marks) || {};
  for (const k in marks) M[k] = marks[k];
  const I = { index: i, cut: E.cut, next: E.list[i + 1] && E.list[i + 1].id, prev: E.list[i - 1] && E.list[i - 1].id, t };
  s.save();
  if (SC[sc.id]) SC[sc.id].draw(s, lt, sc.dur, M, I);
  else { s.fillStyle = '#444'; s.font = `${40 * E.U}px monospace`; s.textAlign = 'center'; s.fillText(sc.id, W / 2, H / 2); }
  s.restore();

  // composición final
  out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = 1; out.filter = 'none';
  out.globalCompositeOperation = 'source-over';
  out.drawImage(E.S, 0, 0);
  if (E.bloom > 0) {
    const { b1, b2, B1, B2 } = E;
    b1.clearRect(0, 0, B1.width, B1.height); b1.filter = `blur(${(3 * E.U).toFixed(1)}px)`; b1.drawImage(E.G, 0, 0, B1.width, B1.height); b1.filter = 'none';
    b2.clearRect(0, 0, B2.width, B2.height); b2.filter = `blur(${(5 * E.U).toFixed(1)}px)`; b2.drawImage(E.G, 0, 0, B2.width, B2.height); b2.filter = 'none';
    out.globalCompositeOperation = 'lighter';
    out.globalAlpha = 1; out.drawImage(E.G, 0, 0, W, H);
    out.globalAlpha = 0.85 * E.bloom; out.drawImage(E.B1, 0, 0, W, H);
    out.globalAlpha = 0.7 * E.bloom; out.drawImage(E.B2, 0, 0, W, H);
    out.globalAlpha = 1;
  }
  out.globalCompositeOperation = 'source-over';
  if (E.vig > 0) { out.globalAlpha = E.vig; out.drawImage(E.VIG, 0, 0); out.globalAlpha = 1; }
  // grano (overlay: respeta negros profundos)
  if (E.grainAmt > 0) {
    const k = Math.floor(t * 24) % 6, tile = E.grain[k], R = rng(Math.floor(t * 24) * 13 + 7);
    const pat = out.createPattern(tile, 'repeat');
    const sc2 = 1.35 * E.U;
    pat.setTransform(new DOMMatrix([sc2, 0, 0, sc2, R() * 256, R() * 256]));
    out.globalCompositeOperation = 'overlay'; out.globalAlpha = E.grainAmt; out.fillStyle = pat; out.fillRect(0, 0, W, H);
    out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1;
  }
  // franjas cinemascope (solo horizontal)
  if (E.letterbox > 0 && !E.V) {
    const target = W / 2.39, bar = ((H - target) / 2) * E.letterbox;
    out.fillStyle = '#000'; out.fillRect(0, 0, W, bar); out.fillRect(0, H - bar, W, bar);
  }
  if (E.fade > 0) { out.fillStyle = `rgba(0,0,0,${E.fade})`; out.fillRect(0, 0, W, H); }
  E.fade = 0;
}

// ───────────────────────── partículas deterministas (chispas) ─────────────────────────
// posFn(te) → [x,y] posición del emisor en el tiempo te. Sin estado: se re-evalúan por cuadro.
function sparks(ctx, t, t0, t1, posFn, o = {}) {
  const rate = o.rate || 260, life = o.life || 0.45, grav = (o.grav ?? 900) * E.U, spd = (o.speed || 520) * E.U;
  const freeze = o.freeze; // si está definido, el tiempo de las partículas se congela en ese instante
  const tt = freeze !== undefined ? freeze : t;
  const iA = Math.max(Math.ceil(t0 * rate), Math.ceil((tt - life) * rate)), iB = Math.floor(Math.min(t1, tt) * rate);
  const dens = o.density || (() => 1);
  glow(ctx, g => {
    g.lineCap = 'round';
    for (let i = iA; i <= iB; i++) {
      const te = i / rate;
      if (hash(i, 91) > dens(te)) continue;
      const L = life * (0.25 + 0.75 * hash(i, 3));
      const age = tt - te; if (age < 0 || age > L) continue;
      const [x0, y0] = posFn(te);
      const ang = (o.dir ?? -Math.PI / 2) + (hash(i, 5) - 0.5) * (o.spread ?? Math.PI * 1.6);
      const v = spd * (0.3 + 0.9 * hash(i, 7) ** 1.5);
      const vx = Math.cos(ang) * v, vy = Math.sin(ang) * v;
      const x = x0 + vx * age, y = y0 + vy * age + 0.5 * grav * age * age;
      const dt = freeze !== undefined ? 0.012 : 0.028; // estela (desenfoque de movimiento)
      const px = x - vx * dt, py = y - (vy + grav * age) * dt;
      const k = 1 - age / L;
      g.strokeStyle = k > 0.6 ? `rgba(255,236,200,${k})` : `rgba(255,${Math.round(120 + 110 * k)},${Math.round(40 + 60 * k)},${k})`;
      g.lineWidth = (o.width || 2.2) * E.U * (0.5 + k);
      g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
    }
  });
}

// punto láser: núcleo + halo + destello anamórfico
function laserDot(ctx, x, y, intensity = 1, size = 1) {
  const U = E.U * size;
  glow(ctx, g => {
    g.globalCompositeOperation = 'lighter';
    let gr = g.createRadialGradient(x, y, 0, x, y, 60 * U);
    gr.addColorStop(0, `rgba(255,220,160,${0.9 * intensity})`); gr.addColorStop(0.15, `rgba(255,170,80,${0.45 * intensity})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, 60 * U, 0, TAU); g.fill();
    // destello horizontal
    g.save(); g.translate(x, y); g.scale(1, 0.04);
    gr = g.createRadialGradient(0, 0, 0, 0, 0, 260 * U);
    gr.addColorStop(0, `rgba(255,210,150,${0.55 * intensity})`); gr.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 260 * U, 0, TAU); g.fill(); g.restore();
    g.fillStyle = `rgba(255,255,255,${intensity})`; g.beginPath(); g.arc(x, y, 3.2 * U, 0, TAU); g.fill();
  });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createRadialGradient(x, y, 0, x, y, 14 * U);
  gr.addColorStop(0, `rgba(255,255,245,${intensity})`); gr.addColorStop(0.3, `rgba(255,200,120,${0.6 * intensity})`); gr.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 14 * U, 0, TAU); ctx.fill(); ctx.restore();
}

// humo tenue que asciende (determinista)
function smoke(ctx, t, t0, t1, posFn, o = {}) {
  const rate = o.rate || 14, life = o.life || 2.2;
  const iA = Math.max(Math.ceil(t0 * rate), Math.ceil((t - life) * rate)), iB = Math.floor(Math.min(t1, t) * rate);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = iA; i <= iB; i++) {
    const te = i / rate, age = t - te; if (age < 0 || age > life) continue;
    const [x0, y0] = posFn(te); const k = age / life;
    const x = x0 + (hash(i, 2) - 0.5) * 60 * E.U * k + Math.sin(age * 2 + i) * 12 * E.U * k;
    const y = y0 - (o.rise || 110) * E.U * age;
    const r = (10 + 90 * k) * E.U * (o.scale || 1);
    const a = (o.alpha || 0.05) * Math.sin(Math.PI * Math.min(1, k * 1.3));
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(190,185,200,${a})`); gr.addColorStop(1, 'rgba(190,185,200,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ───────────────────────── trazos: longitud de arco ─────────────────────────
// Convierte una lista de polilíneas en una trayectoria recorrible por el láser.
function makePath(polys) {
  const segs = []; let L = 0;
  polys.forEach((pl, pi) => {
    for (let i = 1; i < pl.length; i++) {
      const a = pl[i - 1], b = pl[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l === 0) continue;
      segs.push({ a, b, l, L0: L, pi }); L += l;
    }
  });
  return {
    segs, L,
    at(d) { // posición a distancia d
      d = clamp(d, 0, L);
      let lo = 0, hi = segs.length - 1;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m].L0 <= d) lo = m; else hi = m - 1; }
      const s = segs[lo]; const u = (d - s.L0) / s.l;
      return [lerp(s.a[0], s.b[0], u), lerp(s.a[1], s.b[1], u), s.pi];
    },
    // dibuja desde d0 a d1 (mapa de coordenadas opcional)
    stroke(ctx, d0, d1, map) {
      if (d1 <= d0) return;
      ctx.beginPath(); let lastPi = -1;
      for (const s of segs) {
        if (s.L0 + s.l < d0) continue; if (s.L0 > d1) break;
        const ua = clamp((d0 - s.L0) / s.l), ub = clamp((d1 - s.L0) / s.l);
        const A = [lerp(s.a[0], s.b[0], ua), lerp(s.a[1], s.b[1], ua)], B = [lerp(s.a[0], s.b[0], ub), lerp(s.a[1], s.b[1], ub)];
        const pa = map ? map(A[0], A[1]) : A, pb = map ? map(B[0], B[1]) : B;
        if (s.pi !== lastPi || ua > 0) ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]); lastPi = s.pi;
      }
      ctx.stroke();
    },
  };
}

// polilíneas útiles
function circlePts(cx, cy, r, n = 96, a0 = 0, sweep = TAU) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + sweep * i / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }
function polyPath(ctx, pts, close = true) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close) ctx.closePath(); }
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

window.E = E; window.SC = SC;
