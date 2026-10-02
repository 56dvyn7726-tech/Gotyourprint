// Sestaví webovou verzi pro statický hosting v podsložce (GitHub Pages).
// Použití: node scripts/build-web.mjs /Gotyourprint/zahradnik-app ../zahradnik-app
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [baseUrl, outArg] = process.argv.slice(2);
if (!baseUrl || !outArg) {
  console.error('Použití: node scripts/build-web.mjs <baseUrl> <výstupní složka>');
  process.exit(1);
}
const out = path.resolve(outArg);
fs.rmSync(out, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir "${out}"`, {
  stdio: 'inherit',
  env: { ...process.env, EXPO_BASE_URL: baseUrl },
});

// Ikona a manifest, aby šla stránka „přidat na plochu“ jako aplikace.
fs.copyFileSync('assets/icon.png', path.join(out, 'icon.png'));
fs.writeFileSync(
  path.join(out, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'Zahradník',
      short_name: 'Zahradník',
      lang: 'cs',
      start_url: `${baseUrl}/`,
      scope: `${baseUrl}/`,
      display: 'standalone',
      background_color: '#F4F7F1',
      theme_color: '#F4F7F1',
      icons: [{ src: `${baseUrl}/icon.png`, sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
    },
    null,
    2,
  ),
);

const indexPath = path.join(out, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const head = [
  `<link rel="manifest" href="${baseUrl}/manifest.webmanifest"/>`,
  `<link rel="apple-touch-icon" href="${baseUrl}/icon.png"/>`,
  '<meta name="theme-color" content="#F4F7F1"/>',
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-title" content="Zahradník"/>',
  '<meta name="description" content="Denní rady k péči o zahradu podle počasí."/>',
].join('');
html = html
  .replace('<html lang="en">', '<html lang="cs">')
  .replace('shrink-to-fit=no', 'shrink-to-fit=no, viewport-fit=cover')
  .replace('</head>', `${head}</head>`);
fs.writeFileSync(indexPath, html);

// Statický hosting nezná trasy aplikace – kopie index.html zajistí, že funguje i obnovení stránky.
// Statické trasy bereme ze souborů v src/app (bez layoutů, skupin „(tabs)“ a dynamických [param]).
function staticRoutes(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) {
      if (e.name.startsWith('[')) return [];
      const seg = /^\(.*\)$/.test(e.name) ? '' : `${e.name}/`;
      return staticRoutes(path.join(dir, e.name), prefix + seg);
    }
    const name = e.name.replace(/\.tsx?$/, '');
    if (name.startsWith('_') || name.startsWith('+') || name === 'index' || name.startsWith('[')) return [];
    return [prefix + name];
  });
}
const plantsSrc = fs.readFileSync('src/data/plants.ts', 'utf8');
const plantIds = [...plantsSrc.matchAll(/^ {4}id: '([^']+)'/gm)].map((m) => m[1]);
const routes = [...staticRoutes('src/app'), ...plantIds.map((id) => `pridat/${id}`)];
for (const r of routes) {
  fs.mkdirSync(path.join(out, r), { recursive: true });
  fs.writeFileSync(path.join(out, r, 'index.html'), html);
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`Hotovo: ${out} (${plantIds.length} rostlin, ${routes.length} tras)`);
