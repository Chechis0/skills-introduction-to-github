// Extrae contornos vectoriales para que el láser "recorte" las letras en pantalla.
//  - wordmark "Plott INK" (recreación del logo: Fredoka, P alta + LOTT en versalitas, INK más pesado)
import fs from 'fs';
import opentype from 'opentype.js';

const load = f => { const b = fs.readFileSync(new URL('../fonts/' + f, import.meta.url)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };

function flatten(path, steps = 8) {
  const contours = []; let cur = null; let last = null;
  for (const c of path.commands) {
    if (c.type === 'M') { cur = [[c.x, c.y]]; contours.push(cur); last = [c.x, c.y]; }
    else if (c.type === 'L') { cur.push([c.x, c.y]); last = [c.x, c.y]; }
    else if (c.type === 'Q') { for (let s = 1; s <= steps; s++) { const t = s / steps, m = 1 - t; cur.push([m*m*last[0] + 2*m*t*c.x1 + t*t*c.x, m*m*last[1] + 2*m*t*c.y1 + t*t*c.y]); } last = [c.x, c.y]; }
    else if (c.type === 'C') { for (let s = 1; s <= steps; s++) { const t = s / steps, m = 1 - t; cur.push([m*m*m*last[0] + 3*m*m*t*c.x1 + 3*m*t*t*c.x2 + t*t*t*c.x, m*m*m*last[1] + 3*m*m*t*c.y1 + 3*m*t*t*c.y2 + t*t*t*c.y]); } last = [c.x, c.y]; }
    else if (c.type === 'Z') { if (cur && cur.length) cur.push(cur[0].slice()); }
  }
  return contours.map(c => c.map(([a, b]) => [+a.toFixed(1), +b.toFixed(1)]));
}

function setWord(parts) {
  // parts: [{text, font, size, tracking, gapBefore}]
  let x = 0; const letters = [];
  for (const p of parts) {
    x += p.gapBefore || 0;
    const glyphs = p.font.stringToGlyphs(p.text);
    glyphs.forEach((g, i) => {
      const size = Array.isArray(p.size) ? p.size[i] : p.size;
      const path = g.getPath(x, 0, size);
      const bb = path.getBoundingBox();
      letters.push({ ch: p.text[i], x, size, adv: g.advanceWidth * size / p.font.unitsPerEm, bbox: [bb.x1, bb.y1, bb.x2, bb.y2], contours: flatten(path) });
      x += g.advanceWidth * size / p.font.unitsPerEm + (p.tracking || 0) * size;
    });
  }
  const minY = Math.min(...letters.map(l => l.bbox[1])), maxY = Math.max(...letters.map(l => l.bbox[3]));
  const minX = Math.min(...letters.map(l => l.bbox[0])), maxX = Math.max(...letters.map(l => l.bbox[2]));
  return { bbox: [minX, minY, maxX, maxY], letters };
}

const f600 = load('Fredoka-600.woff'), f700 = load('Fredoka-700.woff');
const wordmark = setWord([
  { text: 'PLOTT', font: f600, size: [1000, 760, 760, 760, 760], tracking: 0.035 },
  { text: 'INK', font: f700, size: 1060, tracking: 0.03, gapBefore: 170 },
]);
fs.writeFileSync(new URL('../glyphs.json', import.meta.url), JSON.stringify({ wordmark }));
console.log('glyphs.json: wordmark', wordmark.bbox.map(v => v.toFixed(0)).join(','), wordmark.letters.map(l => l.ch + ':' + l.contours.length).join(' '));
