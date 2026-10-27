// Reel "Rompetráfico" — PlottInk. Composición 1080×1920 cuadro a cuadro.
// Usa el motor del logo (logo-anim/logo.js: init, draw, E, clamp, lerp, L…) para el cierre y las gotas CMYK.
'use strict';
(() => {
  const RW = 1080, RH = 1920;
  const INK = '#0b0b0d';
  const CMY = { cyan: '#14A9E2', magenta: '#E2167E', yellow: '#F7D417' };
  const RAINBOW = ['#E61441', '#FAB742', '#FEE451', '#A5C965', '#A8DBF0', '#7B9FD3', '#9977B4'];
  let R, c2d, grain;
  const cache = new Map();
  const loadImg = src => {
    if (cache.has(src)) return cache.get(src);
    const p = new Promise((ok, err) => { const im = new Image(); im.onload = () => ok(im); im.onerror = err; im.src = src; });
    cache.set(src, p);
    if (cache.size > 80) cache.delete(cache.keys().next().value);
    return p;
  };
  const srcFrame = s => `../build/reel/src/${String(Math.max(1, Math.min(R.srcFrames, Math.round(s * R.fps) + 1))).padStart(4, '0')}.jpg`;

  // ───────── stickers (etiquetas tipo calcomanía, con rebote) ─────────
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
    const badge = o.n ? h * 1.0 : 0, icon = o.icon ? h * 0.75 : 0;
    const w = tw + pad * 2 + icon;
    const totalW = w + (badge ? badge * 0.85 : 0);
    const s = E.back(pin, 2.1) * (1 - 0.3 * E.out(pout));
    ctx.globalAlpha = clamp(pin * 5) * (1 - pout);
    ctx.translate(RW / 2, o.y);
    ctx.rotate(((o.rot || 0) * Math.PI / 180) + (1 - E.out(pin)) * -0.22);
    ctx.scale(s, s);
    const x0 = -totalW / 2 + (badge ? badge * 0.85 : 0);
    ctx.shadowColor = 'rgba(0,0,0,0.32)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    ctx.fillStyle = o.style === 'dark' ? INK : '#ffffff';
    ctx.beginPath(); ctx.roundRect(x0, -h / 2, w, h, h / 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    if (o.n) { // número en círculo del color CMYK
      const bx = -totalW / 2 + badge / 2;
      ctx.fillStyle = CMY[o.color]; ctx.beginPath(); ctx.arc(bx, 0, badge / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 ${badge * 0.58}px 'Fredoka'`; ctx.fillText(o.n, bx, badge * 0.03);
      ctx.font = `${wgt} ${o.size}px ${fam}`;
    }
    if (o.icon === 'wa') { // globo de chat verde
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

  // ───────── barrido de franjas arcoíris (transiciones de marca) ─────────
  function wipe(t, [a0, a1, b1]) {
    if (t < a0 || t > b1 + 0.2) return false;
    const ctx = c2d, bw = RW / 7;
    let full = true;
    RAINBOW.forEach((col, i) => {
      const d = i * 0.028;
      const a = E.out4(clamp((t - a0 - d) / (a1 - a0 - 0.12)));
      const b = E.inOut(clamp((t - a1 - d) / (b1 - a1 - 0.12)));
      const top = RH * (1 - a), bot = RH * (1 - b);
      if (a < 1 || b > 0) full = false;
      if (bot > top) { ctx.fillStyle = col; ctx.fillRect(i * bw - 1, top, bw + 2, bot - top); }
    });
    return full;
  }

  // ───────── material ─────────
  async function drawFootage(t) {
    const ctx = c2d;
    const c = R.clips.find(k => t >= k.t0 && t < k.t1) || R.clips[R.clips.length - 1];
    const lt = t - c.t0, img = await loadImg(srcFrame(c.src + lt));
    const zoom = (1.07 - 0.07 * E.out(clamp(lt / 0.32))) * (1 + 0.04 * lt / (c.t1 - c.t0));
    ctx.save(); ctx.translate(RW / 2, RH / 2); ctx.scale(zoom, zoom); ctx.drawImage(img, -RW / 2, -RH / 2, RW, RH); ctx.restore();
    if (c !== R.clips[0]) { const f = 1 - clamp(lt / 0.12); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${0.35 * f})`; ctx.fillRect(0, 0, RW, RH); } }
  }
  async function drawFreeze(t) {
    const ctx = c2d, F = R.freeze, lt = t - F.t0;
    const img = await loadImg(srcFrame(F.src));
    // fondo: el mismo cuadro desenfocado y oscurecido
    ctx.save(); ctx.filter = 'blur(18px) brightness(0.55)'; ctx.drawImage(img, -40, -40, RW + 80, RH + 80); ctx.restore();
    // "foto instantánea" que se encoge con marco blanco
    const k = E.out(clamp(lt / 0.35));
    const s = lerp(1.0, 0.8, k), rot = lerp(0, -0.035, k);
    ctx.save(); ctx.translate(RW / 2, RH / 2 + 60 * k); ctx.rotate(rot); ctx.scale(s, s);
    const bw = RW + 60, bh = RH * 0.86 + 60;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
    ctx.fillStyle = '#fff'; ctx.fillRect(-bw / 2, -bh / 2, bw, bh); ctx.shadowColor = 'transparent';
    ctx.save(); ctx.beginPath(); ctx.rect(-RW / 2, -RH * 0.43, RW, RH * 0.86); ctx.clip();
    ctx.drawImage(img, -RW / 2, -RH / 2, RW, RH); ctx.restore();
    ctx.restore();
    const f = 1 - clamp(lt / 0.18); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${0.9 * f})`; ctx.fillRect(0, 0, RW, RH); }
  }
  // ───────── escenario: avenida de noche en hora azul, estilo larga exposición ─────────
  // La avenida cruza el cuadro detrás del rompetráfico (fuga a la derecha); el personaje está en el andén.
  let STAGE, STANDEE, SHADOW, LIT;
  const MX = 180, MY = 320;                        // margen del escenario (paralaje)
  const VPX = 2900, VPY = 1000;                    // punto de fuga (fuera de cuadro, a la derecha)
  const X0 = -400, NEAR0 = 1420, FAR0 = 1160;      // bordillos en x = X0
  const toVP = (y0, px) => y0 + (VPY - y0) * (px - X0) / (VPX - X0);
  const nearY = px => toVP(NEAR0, px), farY = px => toVP(FAR0, px);
  const persp = px => (nearY(px) - farY(px)) / (NEAR0 - FAR0); // escala de perspectiva (1 en x = X0)
  const laneY = (f, px) => lerp(farY(px), nearY(px), f);
  const vn = (x, sd) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, sd), hash(i + 1, sd), u); };
  const ridge = (x, sd) => vn(x / 230, sd) * 0.6 + vn(x / 70, sd + 1) * 0.28 + vn(x / 22, sd + 2) * 0.12;
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const glowDot = (x, px, py, r, rgb, a = 1) => { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.18, `rgba(${rgb},${a * 0.55})`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill(); };

  function buildStage() {
    const w = RW + 2 * MX, h = RH + 2 * MY;
    const sharp = mkc(w, h), x = sharp.getContext('2d');
    x.translate(MX, MY);
    const L0 = -MX, L1 = RW + MX;
    // cielo de hora azul
    const sky = x.createLinearGradient(0, -MY, 0, 1100);
    sky.addColorStop(0, '#040918'); sky.addColorStop(0.4, '#0e1c46'); sky.addColorStop(0.72, '#2a2c68'); sky.addColorStop(0.88, '#71447a'); sky.addColorStop(1, '#d97b66');
    x.fillStyle = sky; x.fillRect(L0, -MY, w, 1100 + MY);
    // cerros al fondo
    [[760, 230, '#1b2350', 3], [840, 150, '#121a3c', 7]].forEach(([base, amp, col, sd]) => {
      x.beginPath(); x.moveTo(L0, 1150);
      for (let px = L0; px <= L1; px += 6) x.lineTo(px, base - ridge(px, sd) * amp);
      x.lineTo(L1, 1150); x.closePath(); x.fillStyle = col; x.fill();
    });
    // edificios al otro lado de la calle (fachadas con ventanas y avisos encendidos)
    const NEON = ['226,22,126', '20,169,226', '247,212,23', '255,120,60', '120,230,160'];
    let bx = L0 - 40;
    for (let i = 0; bx < L1 + 60; i++) {
      const sc = persp(bx), bw = (150 + hash(i, 51) * 170) * sc, bh = (300 + hash(i, 52) * 420) * sc;
      const base = farY(bx) - 14 * sc;
      x.fillStyle = hash(i, 53) < 0.5 ? '#0b1129' : '#101633'; x.fillRect(bx, base - bh, bw - 4 * sc, bh + 20);
      for (let wy = base - bh + 12 * sc; wy < base - 60 * sc; wy += 17 * sc) for (let wx = bx + 8 * sc; wx < bx + bw - 14 * sc; wx += 14 * sc) {
        const hv = hash(Math.floor(wx * 3.1 + wy * 7.7), 54), br = 0.45 + 0.55 * hash(Math.floor(wx * 5 + wy), 56);
        if (hv < 0.36) { x.fillStyle = hv < 0.27 ? `rgba(255,198,120,${br})` : `rgba(165,205,255,${br * 0.9})`; x.fillRect(wx, wy, 7 * sc, 9 * sc); }
      }
      // aviso de local a nivel de calle
      if (hash(i, 55) < 0.75) { const c = NEON[i % NEON.length]; x.fillStyle = `rgba(${c},0.9)`; x.fillRect(bx + bw * 0.15, base - 52 * sc, bw * 0.6, 16 * sc); glowDot(x, bx + bw * 0.45, base - 44 * sc, 90 * sc, c, 0.5); }
      // vitrina iluminada
      x.fillStyle = 'rgba(255,215,160,0.55)'; x.fillRect(bx + bw * 0.1, base - 30 * sc, bw * 0.7, 28 * sc);
      bx += bw;
    }
    // andén del otro lado
    x.fillStyle = '#2a2b35'; x.beginPath(); x.moveTo(L0, farY(L0) - 16 * persp(L0)); x.lineTo(L1, farY(L1) - 16 * persp(L1)); x.lineTo(L1, farY(L1)); x.lineTo(L0, farY(L0)); x.closePath(); x.fill();
    // calzada
    x.beginPath(); x.moveTo(L0, farY(L0)); x.lineTo(L1, farY(L1)); x.lineTo(L1, nearY(L1)); x.lineTo(L0, nearY(L0)); x.closePath();
    const asf = x.createLinearGradient(0, FAR0, 0, NEAR0); asf.addColorStop(0, '#1b1c25'); asf.addColorStop(1, '#262731');
    x.fillStyle = asf; x.fill();
    // reflejos mojados de los avisos y faroles sobre la calzada
    for (let i = 0; i < 18; i++) {
      const px = L0 + hash(i, 61) * w, c = i % 3 === 0 ? NEON[i % NEON.length] : '255,180,110', sc = persp(px);
      x.save(); x.translate(px, laneY(0.35, px)); x.scale(0.3, 1.5); glowDot(x, 0, 0, 120 * sc, c, 0.16); x.restore();
    }
    // marcas viales
    for (const f of [0.25, 0.75]) for (let px = L0; px < L1; px += 120) { const sc = persp(px); x.strokeStyle = 'rgba(230,230,235,0.5)'; x.lineWidth = 5 * sc; x.beginPath(); x.moveTo(px, laneY(f, px)); x.lineTo(px + 60 * sc, laneY(f, px + 60 * sc)); x.stroke(); }
    for (const f of [0.49, 0.51]) { x.strokeStyle = 'rgba(245,200,60,0.55)'; x.lineWidth = 3.5; x.beginPath(); x.moveTo(L0, laneY(f, L0)); x.lineTo(L1, laneY(f, L1)); x.stroke(); }
    // estelas persistentes de larga exposición
    [[0.14, '255,236,205'], [0.34, '255,226,190'], [0.64, '255,45,40'], [0.86, '255,70,45']].forEach(([f, c], li) => {
      for (let r = 0; r < 3; r++) {
        x.beginPath();
        for (let px = L0; px <= L1; px += 8) { const sc = persp(px); const yy = laneY(f, px) - (r * 7 + 6) * sc + Math.sin(px / 140 + li + r) * 1.5 * sc; px === L0 ? x.moveTo(px, yy) : x.lineTo(px, yy); }
        x.strokeStyle = `rgba(${c},${0.5 - r * 0.1})`; x.lineWidth = 4.5; x.stroke();
      }
    });
    // bordillo cercano + andén (en foco)
    x.beginPath(); x.moveTo(L0, nearY(L0)); x.lineTo(L1, nearY(L1)); x.lineTo(L1, RH + MY); x.lineTo(L0, RH + MY); x.closePath();
    const sw = x.createLinearGradient(0, 1200, 0, RH + MY); sw.addColorStop(0, '#3a3c46'); sw.addColorStop(1, '#5a5c66');
    x.fillStyle = sw; x.fill();
    x.strokeStyle = 'rgba(210,212,222,0.6)'; x.lineWidth = 8; x.beginPath(); x.moveTo(L0, nearY(L0) + 4); x.lineTo(L1, nearY(L1) + 4); x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.28)'; x.lineWidth = 2;
    for (let i = 1; i < 14; i++) { const yy = nearY(540) + 34 * i * i * 0.55; x.beginPath(); x.moveTo(L0, yy - (540 - L0) * 0.12); x.lineTo(L1, yy + (L1 - 540) * 0.12 * -1 + (L1 - 540) * 0.0); x.stroke(); }
    for (let i = -8; i < 14; i++) { const xb = 540 + i * 190; x.beginPath(); x.moveTo(xb + (VPX - xb) * 0.02, nearY(xb)); x.lineTo(xb - (VPX - xb) * 0.38, RH + MY); x.stroke(); }
    // faroles: dos del otro lado (lejanos) y uno cercano a la derecha que ilumina al personaje
    [[-60, 0], [420, 0], [900, 0]].forEach(([px]) => {
      const sc = persp(px), by = farY(px) - 14 * sc, hgt = 560 * sc;
      x.strokeStyle = '#0a0d18'; x.lineWidth = 9 * sc; x.beginPath(); x.moveTo(px, by); x.lineTo(px, by - hgt); x.lineTo(px + 70 * sc, by - hgt - 12 * sc); x.stroke();
      glowDot(x, px + 70 * sc, by - hgt - 6 * sc, 120 * sc, '255,190,110', 0.95);
    });
    x.strokeStyle = '#090b14'; x.lineWidth = 26; x.beginPath(); x.moveTo(1010, nearY(1010) + 40); x.lineTo(1010, 120); x.lineTo(860, 96); x.stroke();
    glowDot(x, 870, 112, 260, '255,214,160', 1);
    // profundidad de campo: todo desenfocado salvo el andén cercano
    const out = mkc(w, h), o = out.getContext('2d');
    o.filter = 'blur(13px)'; o.drawImage(sharp, 0, 0); o.filter = 'none';
    // bokeh de lente: discos suaves de las luces lejanas
    o.save(); o.translate(MX, MY); o.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const px = -MX + hash(i, 81) * (RW + 2 * MX), py = 520 + hash(i, 82) * 620, r = 10 + hash(i, 83) * 34;
      const c = hash(i, 84) < 0.6 ? '255,190,120' : hash(i, 84) < 0.8 ? '160,200,255' : ['226,22,126', '20,169,226', '247,212,23'][i % 3];
      const g = o.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${c},0.10)`); g.addColorStop(0.82, `rgba(${c},0.16)`); g.addColorStop(1, `rgba(${c},0)`);
      o.fillStyle = g; o.beginPath(); o.arc(px, py, r, 0, Math.PI * 2); o.fill();
    }
    o.restore();
    const near = mkc(w, h), n = near.getContext('2d');
    n.drawImage(sharp, 0, 0); n.globalCompositeOperation = 'destination-in';
    const m = n.createLinearGradient(0, MY + 1440, 0, MY + 1720); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    n.fillStyle = m; n.fillRect(0, 0, w, h);
    o.drawImage(near, 0, 0);
    return out;
  }

  // tráfico: luces que cruzan detrás del rompetráfico (deterministas, con estela)
  const LANES = [{ f: 0.14, v: -820, c: '255,240,215' }, { f: 0.36, v: -680, c: '255,232,200' }, { f: 0.64, v: 760, c: '255,48,40' }, { f: 0.86, v: 900, c: '255,70,45' }];
  function drawTraffic(ctx, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const span = RW + 2 * MX + 1400;
    LANES.forEach((ln, li) => {
      for (let c = 0; c < 6; c++) {
        const ph = ((t * Math.abs(ln.v) + hash(li * 10 + c, 7) * span * 0.5 + c * span / 6) % span);
        const px = ln.v > 0 ? -MX - 700 + ph : RW + MX + 700 - ph;
        const sc = persp(px), py = laneY(ln.f, px) - 10 * sc;
        const len = Math.abs(ln.v) * 0.95 * sc, tx = px - Math.sign(ln.v) * len;
        for (const [lw, a] of [[34 * sc, 0.16], [12 * sc, 0.45], [4 * sc, 0.9]]) {
          const g = ctx.createLinearGradient(tx, 0, px, 0); g.addColorStop(0, `rgba(${ln.c},0)`); g.addColorStop(1, `rgba(${ln.c},${a})`);
          ctx.strokeStyle = g; ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(tx, laneY(ln.f, tx) - 10 * persp(tx)); ctx.lineTo(px, py); ctx.stroke();
        }
        const hg = ctx.createRadialGradient(px, py, 0, px, py, 64 * sc);
        hg.addColorStop(0, `rgba(${ln.c},0.9)`); hg.addColorStop(0.25, `rgba(${ln.c},0.35)`); hg.addColorStop(1, `rgba(${ln.c},0)`);
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(px, py, 64 * sc, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.restore();
  }

  function buildShadow(img) { // silueta oscura y desenfocada (sombra proyectada en el andén)
    const c = mkc(img.width / 2, img.height / 2), x = c.getContext('2d');
    x.filter = 'blur(10px)'; x.drawImage(img, 0, 0, c.width, c.height);
    x.filter = 'none'; x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgba(5,5,12,1)'; x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function buildLit(img) { // integra la foto a la escena nocturna: luz cálida de farol arriba-derecha, sombras frías
    const c = mkc(img.width, img.height), x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgb(214,214,236)'; x.fillRect(0, 0, c.width, c.height);
    const g = x.createLinearGradient(c.width, 0, 0, c.height);
    g.addColorStop(0, 'rgb(255,236,205)'); g.addColorStop(1, 'rgb(170,180,225)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(img, 0, 0);
    // luz de borde (rim) cálida a la derecha y arriba
    const e = mkc(img.width, img.height), ex = e.getContext('2d');
    ex.drawImage(img, 0, 0); ex.globalCompositeOperation = 'destination-out'; ex.drawImage(img, -9, 6);
    ex.globalCompositeOperation = 'source-in'; ex.fillStyle = 'rgb(255,200,140)'; ex.fillRect(0, 0, e.width, e.height);
    x.globalCompositeOperation = 'source-atop'; x.filter = 'blur(2.5px)'; x.globalAlpha = 0.75; x.drawImage(e, 0, 0);
    return c;
  }

  async function drawPhoto(t) {
    const ctx = c2d, P = R.photo, lt = t - P.t0;
    const img = LIT;
    const k = E.inOut(clamp((lt - 0.6) / 6.0));
    const punch = 0.1 * (1 - E.out(clamp(lt / 0.4)));
    const zoom = 1 + punch + 0.38 * k;
    // escenario + tráfico con paralaje (se mueven menos que el personaje)
    const bz = 1 + (zoom - 1) * 0.3;
    ctx.save(); ctx.translate(RW / 2, RH / 2); ctx.scale(bz, bz); ctx.translate(-RW / 2, -RH / 2 - 40 * k);
    ctx.drawImage(STAGE, -MX, -MY);
    drawTraffic(ctx, t);
    ctx.restore();
    // rompetráfico: de cuerpo entero → acercamiento a la cara
    const s0 = 1460 / (1799 - 141);
    const s = s0 * zoom;
    const F = [lerp(760, 700, k), lerp(970, 590, k)];
    const S = [570, lerp(1580 - (1799 - 970) * s0, 780, k)];
    const x = S[0] - F[0] * s, y = S[1] - F[1] * s;
    const footY = y + 1799 * s, footX = x + 805 * s, footW = 820 * s;
    // charco de luz del farol sobre el andén
    const pool = ctx.createRadialGradient(footX + 60 * s, footY, 0, footX + 60 * s, footY, footW * 1.1);
    pool.addColorStop(0, 'rgba(255,200,140,0.32)'); pool.addColorStop(1, 'rgba(255,190,130,0)');
    ctx.save(); ctx.translate(footX, footY); ctx.scale(1, 0.28); ctx.translate(-footX, -footY);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = pool; ctx.beginPath(); ctx.arc(footX + 60 * s, footY, footW * 1.1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // sombra proyectada hacia atrás-izquierda sobre el andén
    ctx.save(); ctx.globalAlpha = 0.42;
    ctx.translate(footX, footY); ctx.transform(1, 0, 0.5, 0.2, 0, 0); ctx.translate(-footX, -footY);
    ctx.drawImage(SHADOW, x, y, img.width * s, img.height * s); ctx.restore();
    // sombra de contacto
    const cg = ctx.createRadialGradient(footX, footY, 0, footX, footY, footW * 0.6);
    cg.addColorStop(0, 'rgba(0,0,6,0.6)'); cg.addColorStop(1, 'rgba(0,0,6,0)');
    ctx.save(); ctx.translate(footX, footY); ctx.scale(1, 0.1); ctx.translate(-footX, -footY);
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(footX, footY, footW * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.drawImage(img, x, y, img.width * s, img.height * s);
    const f = 1 - clamp(lt / 0.22); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, RW, RH); }
  }

  // gotas CMYK del logo que salpican alrededor de "…A ESTO."
  const BURST = [
    { j: 0, x: 115, y: 470, r: -0.5 }, { j: 1, x: 955, y: 175, r: 0.4 }, { j: 2, x: 975, y: 520, r: 0.9 }, { j: 3, x: 150, y: 770, r: -0.3 },
  ];
  function drawBurst(t) {
    const ctx = c2d, t0 = R.burst, end = 13.15;
    if (t < t0 || t > end + 0.3) return;
    BURST.forEach((b, i) => {
      const u = clamp((t - t0 - i * 0.05) / 0.35); if (u <= 0) return;
      const out = clamp((t - end - i * 0.03) / 0.2);
      const d = L.drops[b.j]; const [x0, y0, x1, y1] = d.bbox; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const k = E.back(u, 2.4) * (1 - E.out(out));
      if (k <= 0.001) return;
      const px = lerp(RW / 2, b.x, E.out(u)), py = lerp(330, b.y, E.out(u));
      ctx.save(); ctx.translate(px, py); ctx.rotate(b.r * E.out(u)); ctx.scale(2.3 * k, 2.3 * k); ctx.translate(-cx, -cy);
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      ctx.fillStyle = `rgb(${d.color})`; ctx.fill(L.dropPaths[b.j].sil);
      ctx.shadowColor = 'transparent';
      if (L.dropPaths[b.j].hl) { ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(L.dropPaths[b.j].hl); }
      ctx.restore();
    });
  }

  // marca de agua: wordmark + gotas en una pastilla blanca (arriba a la izquierda)
  function brandBug(t) {
    const hide = clamp((t - 10.0) / 0.15) * (1 - clamp((t - 13.25) / 0.2)); // fuera durante "DE ESTO… / …A ESTO."
    const a = clamp((t - 0.75) / 0.3) * (1 - clamp((t - 18.3) / 0.2)) * (1 - hide);
    if (a <= 0) return;
    const ctx = c2d, k = 0.58, bx = 54, by = 150;
    ctx.save(); ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.beginPath(); ctx.roundRect(bx, by, 520 * k + 36, 160 * k + 24, 22); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.translate(bx + 18 - 4 * k, by + 12 - 140 * k); ctx.scale(k, k);
    L.letterPaths.forEach(p => { ctx.fillStyle = INK; ctx.fill(p, 'evenodd'); });
    L.drops.forEach((d, j) => { ctx.fillStyle = `rgb(${d.color})`; ctx.fill(L.dropPaths[j].sil); if (L.dropPaths[j].hl) { ctx.fillStyle = '#fff'; ctx.fill(L.dropPaths[j].hl); } });
    ctx.restore();
  }

  function finish(t, inFootage) {
    const ctx = c2d;
    if (inFootage) {
      const vg = ctx.createRadialGradient(RW / 2, RH / 2, RH * 0.35, RW / 2, RH / 2, RH * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, RW, RH);
      const k = Math.floor(t * 24) % 4; const pat = ctx.createPattern(grain[k], 'repeat');
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.07; ctx.fillStyle = pat; ctx.fillRect(0, 0, RW, RH);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
  }

  async function renderReel(t) {
    c2d.setTransform(1, 0, 0, 1, 0, 0); c2d.globalAlpha = 1; c2d.filter = 'none';
    const E2 = R.end;
    let footage = false;
    if (t >= R.wipeOut[1]) {
      draw(Math.max(0, (t - E2.t0) * E2.speed + 0.12)); // cierre: animación del logo acelerada
      c2d.setTransform(1, 0, 0, 1, 0, 0);
    } else if (t >= R.photo.t0) { await drawPhoto(t); footage = true; }
    else if (t >= R.freeze.t0) { await drawFreeze(t); footage = true; }
    else if (t >= R.wipeIn[1] - 0.05) { await drawFootage(t); footage = true; }
    else { c2d.fillStyle = '#fff'; c2d.fillRect(0, 0, RW, RH); }
    finish(t, footage);
    drawBurst(t);
    if (t < R.wipeOut[0] + 0.1 && t > R.wipeIn[2] - 0.2) brandBug(t);
    R.stickers.forEach(s => sticker(s, t));
    wipe(t, R.wipeIn); wipe(t, R.wipeOut);
    const fo = clamp((t - (R.dur - 0.35)) / 0.35); // fundido final muy breve a blanco
    if (fo > 0) { c2d.fillStyle = `rgba(255,255,255,${fo})`; c2d.fillRect(0, 0, RW, RH); }
  }

  window.initReel = async (reel, logo) => {
    R = reel;
    init(logo, RW, RH, { side: RW * 0.9, cx: RW / 2, cy: 690 });
    c2d = document.getElementById('c').getContext('2d');
    grain = [0, 1, 2, 3].map(k => { const g = document.createElement('canvas'); g.width = g.height = 256; const x = g.getContext('2d'), id = x.createImageData(256, 256); for (let i = 0; i < 65536; i++) { const v = 128 + (hash(i, k + 9) - 0.5) * 200; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; } x.putImageData(id, 0, 0); return g; });
    STANDEE = await loadImg('../build/reel/standee.png');
    STAGE = buildStage(); SHADOW = buildShadow(STANDEE); LIT = buildLit(STANDEE);
    await loadImg(srcFrame(R.freeze.src));
  };
  window.renderFrame = renderReel;
})();
