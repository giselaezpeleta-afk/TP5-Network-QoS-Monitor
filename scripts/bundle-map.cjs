// Empaqueta Leaflet localmente: solo las imágenes del mapa requieren Internet.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'mobile');
const read = file => fs.readFileSync(path.join(root, 'node_modules', file), 'utf8');
const assets = {
  css: read('leaflet/dist/leaflet.css'),
  js: read('leaflet/dist/leaflet.js'),
  heat: read('leaflet.heat/dist/leaflet-heat.js'),
};
fs.mkdirSync(path.join(root, 'src', 'history', 'vendor'), { recursive: true });
fs.writeFileSync(path.join(root, 'src', 'history', 'vendor', 'mapAssets.json'), JSON.stringify(assets));
fs.writeFileSync(path.join(root, 'src', 'history', 'vendor', 'LICENSES.txt'),
  'Leaflet\n' + read('leaflet/LICENSE') + '\nLeaflet.heat\n' + read('leaflet.heat/LICENSE'));
