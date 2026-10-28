// Reel "Marcaje vehicular" — PlottInk. 1080×1920, cuadro a cuadro.
// Concepto: "tu vehículo es una valla que se mueve". El material horizontal va en una franja central
// sobre un fondo de asfalto con las líneas del carril en movimiento.
// Usa el motor del logo (logo-anim/logo.js: init, draw, E, clamp, lerp, hash, L…) para el cierre.
'use strict';
(() => {
  const RW = 1080, RH = 1920;
  const INK = '#0b0b0d';
  const CMY = { cyan: '#14A9E2', magenta: '#E2167E', yellow: '#F7D417' };
  const RAINBOW = ['#E61441', '#FAB742', '#FEE451', '#A5C965', '#A8DBF0', '#7B9FD3', '#9977B4'];
  const BANDS = { wide: [0, 960 - 304, RW, 608], square: [0, 960 - 540, RW, 1080], full: [0, 0, RW, RH] };
  let R, c2d, grain, ASPHALT;
  const cache = new Map();
  const loadImg = src => {
    if (cache.has(src)) return cache.get(src);
    const p = new Promise((ok, err) => { const im = new Image(); im.onload = () => ok(im); im.onerror = err; im.src = src; });
    cache.set(src, p);
    if (cache.size > 90) cache.delete(cache.keys().next().value);
    return p;
  };
  const frame = (k, s) => `../build/marcaje/${k}/${String(Math.max(1, Math.min(R.srcFrames[k], Math.round(s * R.fps) + 1))).padStart(4, '0')}.jpg`;

  // ───────── stickers ─────────
  function sticker(o, t) {
    const pin = clamp((t - o.t0) / 0.3);
    const pout = o.out === false ? 0 : clamp((t - (o.t1 - 0.16)) / 0.16);
    if (pin <= 0 || pout >= 1) return;
    const ctx = c2d;
    const fam = o.font === 'sans' ? "'Inter Tight'" : "'Fredoka'";
    const wgt = o.font === 'sans' ? 600 : 700;
    ctx.save();
    ctx.font = `${wgt} ${o.size}px ${fam}`;
    ctx.letterSpacing = (o.size * 0.02) + 'px';
    const tw = ctx.measureText(o.text).width;
    const h = o.size * 1.38, pad = o.size * 0.5;
    const badge = o.n ? h : 0, icon = o.icon ? h * 0.75 : 0;
    const w = tw + pad * 2 + icon;
    const totalW = w + (badge ? badge * 0.85 : 0);
    const s = E.back(pin, 2.1) * (1 - 0.3 * E.out(pout));
    ctx.globalAlpha = clamp(pin * 5) * (1 - pout);
    ctx.translate(o.x ?? RW / 2, o.y);
    ctx.rotate(((o.rot || 0) * Math.PI / 180) + (1 - E.out(pin)) * -0.22);
    ctx.scale(s, s);
    const x0 = -totalW / 2 + (badge ? badge * 0.85 : 0);
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    ctx.fillStyle = o.style === 'dark' ? INK : '#ffffff';
    ctx.beginPath(); ctx.roundRect(x0, -h / 2, w, h, h / 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    if (o.n) {
      const bx = -totalW / 2 + badge / 2;
      ctx.fillStyle = CMY[o.color]; ctx.beginPath(); ctx.arc(bx, 0, badge / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 ${badge * 0.58}px 'Fredoka'`; ctx.fillText(o.n, bx, badge * 0.03);
      ctx.font = `${wgt} ${o.size}px ${fam}`;
    }
    if (o.icon === 'wa') {
      const ix = x0 + pad * 0.85 + icon * 0.45, r = icon * 0.42;
      ctx.fillStyle = '#25D366'; ctx.beginPath(); ctx.arc(ix, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ix - r * 0.75, r * 0.45); ctx.lineTo(ix - r * 1.05, r * 1.05); ctx.lineTo(ix - r * 0.2, r * 0.82); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ix, 0, r * 0.52, 0.7, Math.PI * 2 - 1.0); ctx.stroke();
    }
    ctx.fillStyle = o.style === 'dark' ? '#ffffff' : INK;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(o.text, x0 + pad + icon, o.size * 0.04);
    ctx.restore();
  }

  // ───────── barrido arcoíris de marca ─────────
  function wipe(t, [a0, a1, b1]) {
    if (t < a0 || t > b1 + 0.2) return;
    const ctx = c2d, bw = RW / 7;
    RAINBOW.forEach((col, i) => {
      const d = i * 0.028;
      const a = E.out4(clamp((t - a0 - d) / (a1 - a0 - 0.12)));
      const b = E.inOut(clamp((t - a1 - d) / (b1 - a1 - 0.12)));
      const top = RH * (1 - a), bot = RH * (1 - b);
      if (bot > top) { ctx.fillStyle = col; ctx.fillRect(i * bw - 1, top, bw + 2, bot - top); }
    });
  }

  // ───────── fondo: asfalto con líneas de carril en movimiento ("valla que se mueve") ─────────
  function buildAsphalt() {
    const c = document.createElement('canvas'); c.width = RW; c.height = RH;
    const x = c.getContext('2d'), id = x.createImageData(RW, RH), d = id.data;
    for (let i = 0; i < RW * RH; i++) {
      const px = i % RW, py = (i / RW) | 0;
      const n = hash(i, 5) * 0.55 + hash((px >> 2) + (py >> 2) * 977, 6) * 0.45;
      const v = 30 + n * 22 + (hash(i, 7) > 0.995 ? 30 : 0);
      d[i * 4] = v; d[i * 4 + 1] = v + 1; d[i * 4 + 2] = v + 5; d[i * 4 + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    const vg = x.createRadialGradient(RW / 2, RH / 2, RH * 0.2, RW / 2, RH / 2, RH * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = vg; x.fillRect(0, 0, RW, RH);
    return c;
  }
  function drawRoad(t) {
    const ctx = c2d;
    ctx.drawImage(ASPHALT, 0, 0);
    // velocidad: se acelera en el drop y en el cierre del montaje
    const off = (t * 1100) % 240;
    ctx.fillStyle = 'rgba(235,235,240,0.85)';
    for (const lx of [118, RW - 118 - 16]) for (let y = -240 + off; y < RH; y += 240) { ctx.beginPath(); ctx.roundRect(lx, y, 16, 120, 4); ctx.fill(); }
    // bordes amarillos continuos
    ctx.fillStyle = 'rgba(245,200,40,0.85)'; ctx.fillRect(26, 0, 10, RH); ctx.fillRect(RW - 36, 0, 10, RH);
  }

  // ───────── franja de video (banda) ─────────
  function bandRect(t) {
    const i = R.shots.findIndex(s => t >= s.t0 && t < s.t1);
    const cur = R.shots[i < 0 ? R.shots.length - 1 : i], prev = R.shots[Math.max(0, i - 1)];
    const k = E.inOut(clamp((t - cur.t0) / 0.28));
    const a = BANDS[prev.band], b = BANDS[cur.band];
    return { shot: cur, rect: [0, 1, 2, 3].map(j => lerp(a[j], b[j], i <= 0 ? 1 : k)) };
  }
  function drawCover(img, [x, y, w, h], fx = 0.5, fy = 0.5, zoom = 1) {
    const s = Math.max(w / img.width, h / img.height) * zoom;
    const dw = img.width * s, dh = img.height * s;
    const dx = x + (w - dw) * fx, dy = y + (h - dh) * fy;
    c2d.drawImage(img, dx, dy, dw, dh);
  }

  // cabezal del plotter que "imprime" el marcaje sobre la van blanca
  function drawPrinthead(x, [bx, by, bw, bh], t) {
    const ctx = c2d;
    // neblina de tinta CMYK justo detrás del cabezal
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    const cols = ['20,169,226', '226,22,126', '247,212,23', '20,20,26'];
    for (let i = 0; i < 160; i++) {
      const yy = by + hash(i, 31) * bh, life = hash(i, 32);
      const dx = (8 + life * 70);
      const c = cols[i % 4];
      ctx.fillStyle = `rgba(${c},${0.55 * (1 - life)})`;
      ctx.beginPath(); ctx.arc(x - dx, yy + Math.sin(t * 40 + i) * 3, 1.5 + hash(i, 33) * 3, 0, Math.PI * 2); ctx.fill();
    }
    // borde de luz donde aparece la impresión
    const g = ctx.createLinearGradient(x - 70, 0, x, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.55)');
    ctx.fillStyle = g; ctx.fillRect(x - 70, by, 70, bh);
    // carro del cabezal (riel + cuerpo + boquillas CMYK)
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetX = 10;
    const cw = 54, top = by - 46, h = bh + 92;
    const body = ctx.createLinearGradient(x, 0, x + cw, 0);
    body.addColorStop(0, '#2c2f37'); body.addColorStop(0.45, '#5b606c'); body.addColorStop(1, '#1d1f25');
    ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(x, top, cw, h, 12); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 8, top + 10, 4, h - 20);
    const cmyk = [CMY.cyan, CMY.magenta, CMY.yellow, '#111'];
    for (let j = 0; j < 4; j++) {
      ctx.fillStyle = cmyk[j]; ctx.beginPath(); ctx.roundRect(x + 20, top + 30 + j * 26, 22, 18, 4); ctx.fill();
      ctx.fillStyle = cmyk[j]; ctx.beginPath(); ctx.roundRect(x + 20, top + h - 48 - j * 26, 22, 18, 4); ctx.fill();
    }
    // LED de estado
    ctx.fillStyle = '#7CFF8A'; ctx.beginPath(); ctx.arc(x + cw / 2, top + h / 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  async function drawBand(t) {
    const { shot, rect } = bandRect(t);
    const ctx = c2d, lt = t - shot.t0;
    ctx.save(); ctx.beginPath(); ctx.rect(...rect); ctx.clip();
    if (shot.kind === 'before') {
      drawCover(await loadImg('../build/marcaje/before.jpg'), rect, 0.5, 0.5, 1 + 0.05 * (t / 3));
    } else if (shot.kind === 'sweep') {
      const z = 1.05 + 0.01 * lt;
      const before = await loadImg('../build/marcaje/before.jpg'), after = await loadImg('../build/marcaje/hero.jpg');
      const [s0, s1] = R.sweep;
      const x = lerp(rect[0] - 60, rect[0] + rect[2] + 10, E.inOut(clamp((t - s0) / (s1 - s0))));
      drawCover(before, rect, 0.5, 0.5, z);
      ctx.save(); ctx.beginPath(); ctx.rect(rect[0], rect[1], x - rect[0], rect[3]); ctx.clip(); drawCover(after, rect, 0.5, 0.5, z); ctx.restore();
      if (t < s1) drawPrinthead(x, rect, t);
    } else if (shot.kind === 'video') {
      const img = await loadImg(frame(shot.src, shot.in + lt));
      const punch = 1 + 0.06 * (1 - E.out(clamp(lt / 0.3)));
      drawCover(img, rect, shot.fx ?? 0.5, 0.5, punch * (1 + 0.03 * lt));
    } else if (shot.kind === 'photo') {
      const img = await loadImg('../build/marcaje/photo.jpg');
      const k = E.inOut(clamp(lt / (shot.t1 - shot.t0)));
      // del bisturí (izquierda) a la vista general
      drawCover(img, rect, lerp(0.0, 0.5, k), lerp(0.47, 0.5, k), lerp(1.7, 1.02, k));
    }
    ctx.restore();
    // destello en cada corte (salvo la entrada del barrido)
    if (shot.kind !== 'sweep' && shot.t0 > 0) { const f = 1 - clamp(lt / 0.12); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${0.4 * f})`; ctx.fillRect(...rect); } }
    // filos de la banda
    if (rect[3] < RH - 2) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(0, rect[1] - 4, RW, 4); ctx.fillRect(0, rect[1] + rect[3], RW, 4); }
  }

  function brandBug(t) {
    const a = clamp((t - 0.2) / 0.3) * (1 - clamp((t - 18.3) / 0.2));
    if (a <= 0) return;
    const ctx = c2d, k = 0.58, bx = 54, by = 150;
    ctx.save(); ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.roundRect(bx, by, 520 * k + 36, 160 * k + 24, 22); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.translate(bx + 18 - 4 * k, by + 12 - 140 * k); ctx.scale(k, k);
    L.letterPaths.forEach(p => { ctx.fillStyle = INK; ctx.fill(p, 'evenodd'); });
    L.drops.forEach((d, j) => { ctx.fillStyle = `rgb(${d.color})`; ctx.fill(L.dropPaths[j].sil); if (L.dropPaths[j].hl) { ctx.fillStyle = '#fff'; ctx.fill(L.dropPaths[j].hl); } });
    ctx.restore();
  }

  function grainOver(t) {
    const ctx = c2d, k = Math.floor(t * 24) % 4, pat = ctx.createPattern(grain[k], 'repeat');
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.06; ctx.fillStyle = pat; ctx.fillRect(0, 0, RW, RH);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  async function renderReel(t) {
    c2d.setTransform(1, 0, 0, 1, 0, 0); c2d.globalAlpha = 1; c2d.filter = 'none';
    if (t >= R.wipeOut[1]) {
      draw(Math.max(0, (t - R.end.t0) * R.end.speed + 0.12));
      c2d.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      drawRoad(t);
      await drawBand(t);
      grainOver(t);
      brandBug(t);
    }
    R.stickers.forEach(s => sticker(s, t));
    wipe(t, R.wipeOut);
    // entrada: fundido desde blanco (empata con el final para que el reel haga bucle)
    const fi = 1 - clamp(t / 0.35); if (fi > 0) { c2d.fillStyle = `rgba(255,255,255,${fi})`; c2d.fillRect(0, 0, RW, RH); }
    const fo = clamp((t - (R.dur - 0.35)) / 0.35); if (fo > 0) { c2d.fillStyle = `rgba(255,255,255,${fo})`; c2d.fillRect(0, 0, RW, RH); }
  }

  window.initReel = async (reel, logo) => {
    R = reel;
    init(logo, RW, RH, { side: RW * 0.9, cx: RW / 2, cy: 690 });
    c2d = document.getElementById('c').getContext('2d');
    grain = [0, 1, 2, 3].map(k => { const g = document.createElement('canvas'); g.width = g.height = 256; const x = g.getContext('2d'), id = x.createImageData(256, 256); for (let i = 0; i < 65536; i++) { const v = 128 + (hash(i, k + 9) - 0.5) * 200; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; } x.putImageData(id, 0, 0); return g; });
    ASPHALT = buildAsphalt();
    await Promise.all(['before.jpg', 'hero.jpg', 'photo.jpg'].map(f => loadImg('../build/marcaje/' + f)));
  };
  window.renderFrame = renderReel;
})();
