// Render del reel.  node reel-rompetrafico/render.mjs stills --t 1,5,12
//                   node reel-rompetrafico/render.mjs sheet --every 0.75
//                   node reel-rompetrafico/render.mjs frames
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..'); // se sirve plottink-video/ (fuentes, logo, build)
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const args = process.argv.slice(2), mode = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const reel = JSON.parse(fs.readFileSync(path.join(HERE, 'reel.json')));
const workers = +opt('workers', 4);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff': 'font/woff', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-accelerated-2d-canvas', '--force-color-profile=srgb'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  page.on('pageerror', e => console.error('[page]', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/reel-rompetrafico/index.html?t=0`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}
const grab = async (page, t, type = 'image/jpeg') => Buffer.from((await page.evaluate(async ([t, type]) => { await window.renderFrame(t); return document.getElementById('c').toDataURL(type, 0.95); }, [t, type])).split(',')[1], 'base64');
const out = path.join(ROOT, 'build', 'reel');
fs.mkdirSync(out, { recursive: true });
if (mode === 'stills') {
  const page = await openPage();
  for (const t of opt('t', '0').split(',').map(Number)) { const f = path.join(out, `still_${t.toFixed(2)}.png`); fs.writeFileSync(f, await grab(page, t, 'image/png')); console.log(f); }
} else if (mode === 'sheet') {
  const page = await openPage(); const every = +opt('every', 0.75); const imgs = [], ts = [];
  for (let t = +opt('from', 0.1); t < Math.min(reel.dur, +opt('to', reel.dur)); t += every) { ts.push(t); imgs.push('data:image/jpeg;base64,' + (await grab(page, t)).toString('base64')); }
  const tw = 216, th = 384, cols = 8;
  const sheet = await browser.newPage({ viewport: { width: cols * tw, height: Math.ceil(imgs.length / cols) * (th + 16) } });
  await sheet.setContent(`<body style="margin:0;background:#222;display:flex;flex-wrap:wrap;font:11px monospace;color:#ccc">${imgs.map((s, i) => `<div style="width:${tw}px"><img src="${s}" style="width:${tw}px;height:${th}px;display:block"><div style="height:16px">${ts[i].toFixed(2)}s</div></div>`).join('')}</body>`);
  const f = path.join(out, `sheet${opt('tag', '')}.jpg`); await sheet.screenshot({ path: f, fullPage: true, type: 'jpeg', quality: 85 }); console.log(f);
} else if (mode === 'frames') {
  const dir = path.join(out, 'frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const N = Math.round(reel.dur * reel.fps), t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => { const page = await openPage(); for (let f = w; f < N; f += workers) fs.writeFileSync(path.join(dir, String(f).padStart(5, '0') + '.jpg'), await grab(page, f / reel.fps)); }));
  console.log('listo', dir, N, 'cuadros', ((Date.now() - t0) / 1000).toFixed(0) + ' s');
}
await browser.close(); server.close();
