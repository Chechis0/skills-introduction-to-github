// Extrae el contorno continental de Colombia (Natural Earth 1:50m vía world-atlas) a colombia.json
import fs from 'fs';
import * as topojson from 'topojson-client';
const topo = JSON.parse(fs.readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)));
const fc = topojson.feature(topo, topo.objects.countries);
const co = fc.features.find(f => f.properties.name === 'Colombia');
const rings = (co.geometry.type === 'Polygon' ? [co.geometry.coordinates] : co.geometry.coordinates).map(p => p[0]);
rings.sort((a, b) => b.length - a.length);
const main = rings[0].map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]);
fs.writeFileSync(new URL('../colombia.json', import.meta.url), JSON.stringify({ mainland: main }));
console.log('colombia.json:', main.length, 'puntos');
