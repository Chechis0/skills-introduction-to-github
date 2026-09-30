// Render del logo animado.  node logo-anim/render.mjs stills --fmt 1x1 --t 0.5,1,2,6
//                            node logo-anim/render.mjs frames --fmt 9x16
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const args = process.argv.slice(2), mode = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const fmt = opt('fmt', '1x1');
const [W, H] = { '1x1': [1080, 1080], '16x9': [1920, 1080], '9x16': [1080, 1920] }[fmt];
const FPS = 30, DUR = 6.0, workers = +opt('workers', 4);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-accelerated-2d-canvas', '--force-color-profile=srgb'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  page.on('pageerror', e => console.error('[page]', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?w=${W}&h=${H}&t=0`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}
const grab = async (page, t, type = 'image/jpeg') => Buffer.from((await page.evaluate(([t, type]) => { window.renderFrame(t); return document.getElementById('c').toDataURL(type, 0.96); }, [t, type])).split(',')[1], 'base64');
const out = path.join(ROOT, '..', 'build', 'logo');
if (mode === 'stills') {
  fs.mkdirSync(out, { recursive: true }); const page = await openPage();
  for (const t of opt('t', '6').split(',').map(Number)) { const f = path.join(out, `still_${fmt}_${t.toFixed(2)}.png`); fs.writeFileSync(f, await grab(page, t, 'image/png')); console.log(f); }
} else if (mode === 'frames') {
  const dir = path.join(out, `frames_${fmt}`); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const N = Math.round(DUR * FPS);
  await Promise.all(Array.from({ length: workers }, async (_, w) => { const page = await openPage(); for (let f = w; f < N; f += workers) fs.writeFileSync(path.join(dir, String(f).padStart(5, '0') + '.jpg'), await grab(page, f / FPS)); }));
  console.log('listo', dir, N, 'cuadros');
}
await browser.close(); server.close();
