// Render cuadro a cuadro con Chromium headless (Playwright) → JPEG → ffmpeg.
//   node render.mjs stills --cut full --fmt 16x9 --t 1,2.5,6
//   node render.mjs frames --cut full --fmt 16x9 --workers 4
//   node render.mjs sheet  --cut full --fmt 16x9 --every 1.5      (hoja de contactos)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const args = process.argv.slice(2);
const mode = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const cut = opt('cut', 'full');
const fmt = opt('fmt', '16x9');
const [W, H] = fmt === '9x16' ? [1080, 1920] : [1920, 1080];
const workers = +opt('workers', 4);
const quality = +opt('q', 0.95);
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'timeline.json')));
const fps = timeline.fps;

// servidor estático mínimo
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff': 'font/woff', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-accelerated-2d-canvas', '--force-color-profile=srgb', '--font-render-hinting=none'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  page.on('pageerror', e => console.error('[page]', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/index.html?w=${W}&h=${H}&cut=${cut}&t=0`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}
async function grab(page, t, type = 'image/jpeg') {
  const url = await page.evaluate(([t, type, q]) => { window.renderFrame(t); return document.getElementById('c').toDataURL(type, q); }, [t, type, quality]);
  return Buffer.from(url.split(',')[1], 'base64');
}

const outBase = path.join(ROOT, 'build');
fs.mkdirSync(outBase, { recursive: true });

if (mode === 'stills') {
  const ts = opt('t', '0').split(',').map(Number);
  const dir = path.join(outBase, 'stills'); fs.mkdirSync(dir, { recursive: true });
  const page = await openPage();
  for (const t of ts) {
    const t0 = Date.now();
    const buf = await grab(page, t, 'image/png');
    const f = path.join(dir, `${cut}_${fmt}_${t.toFixed(2)}.png`);
    fs.writeFileSync(f, buf); console.log(f, (Date.now() - t0) + 'ms');
  }
} else if (mode === 'sheet') {
  // hoja de contactos: miniaturas cada N segundos en una sola imagen
  const every = +opt('every', 1.5);
  const total = timeline.cuts[cut].scenes.reduce((s, x) => s + x[1], 0);
  const ts = []; for (let t = +opt('from', 0.3); t < Math.min(total, +opt('to', total)); t += every) ts.push(+t.toFixed(3));
  const page = await openPage();
  const imgs = [];
  for (const t of ts) imgs.push('data:image/jpeg;base64,' + (await grab(page, t)).toString('base64'));
  const cols = fmt === '9x16' ? 8 : 5, tw = fmt === '9x16' ? 240 : 384, th = Math.round(tw * H / W);
  const sheet = await browser.newPage({ viewport: { width: cols * tw, height: Math.ceil(imgs.length / cols) * (th + 18) } });
  await sheet.setContent(`<body style="margin:0;background:#222;display:flex;flex-wrap:wrap;font:11px monospace;color:#ccc">${imgs.map((s, i) => `<div style="width:${tw}px"><img src="${s}" style="width:${tw}px;height:${th}px;display:block"><div style="height:18px">${ts[i].toFixed(2)}s</div></div>`).join('')}</body>`);
  const f = path.join(outBase, `sheet_${cut}_${fmt}${opt('tag', '')}.jpg`);
  await sheet.screenshot({ path: f, fullPage: true, type: 'jpeg', quality: 85 });
  console.log(f);
} else if (mode === 'frames') {
  const total = timeline.cuts[cut].scenes.reduce((s, x) => s + x[1], 0);
  const N = Math.round(total * fps);
  const dir = path.join(outBase, 'frames', `${cut}_${fmt}`); fs.mkdirSync(dir, { recursive: true });
  const from = +opt('from', 0), to = Math.min(N, +opt('to', N));
  let done = 0; const t0 = Date.now();
  const job = async (wi) => {
    const page = await openPage();
    for (let f = from + wi; f < to; f += workers) {
      const file = path.join(dir, String(f).padStart(5, '0') + '.jpg');
      if (fs.existsSync(file) && !args.includes('--force')) { done++; continue; }
      fs.writeFileSync(file, await grab(page, f / fps));
      if (++done % 60 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${cut} ${fmt}: ${done}/${to - from}  ${(el / done * 1000).toFixed(0)} ms/cuadro  ETA ${((to - from - done) * el / done / 60).toFixed(1)} min`); }
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: workers }, (_, i) => job(i)));
  console.log(`listo: ${dir} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
await browser.close();
server.close();
