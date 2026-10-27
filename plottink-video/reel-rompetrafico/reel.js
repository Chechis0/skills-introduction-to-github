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
  async function drawPhoto(t) {
    const ctx = c2d, P = R.photo, lt = t - P.t0;
    const img = await loadImg('../build/reel/photo.jpg');
    const base = Math.max(RW / img.width, RH / img.height);
    const k = E.inOut(clamp((lt - 0.6) / 6.0));
    const zoom = 1 + 0.12 * (1 - E.out(clamp(lt / 0.4))) + 0.38 * k;
    const fx = lerp(0.54, 0.49, k), fy = lerp(0.5, 0.33, k);
    const w = img.width * base * zoom, h = img.height * base * zoom;
    let x = RW / 2 - fx * w, y = RH / 2 - fy * h;
    x = Math.min(0, Math.max(RW - w, x)); y = Math.min(0, Math.max(RH - h, y));
    ctx.drawImage(img, x, y, w, h);
    // velo inferior para los textos finales
    const v = clamp((lt - 4.7) / 0.5);
    if (v > 0) { const g = ctx.createLinearGradient(0, RH * 0.45, 0, RH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.55 * v})`); ctx.fillStyle = g; ctx.fillRect(0, 0, RW, RH); }
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
    await Promise.all([loadImg('../build/reel/photo.jpg'), loadImg(srcFrame(R.freeze.src))]);
  };
  window.renderFrame = renderReel;
})();
