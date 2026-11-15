// スクリーンショット（作成日 2026-11-15）: node eval/shots.mjs <出力フォルダ>
// 主要6ページ × PC1440・スマホ390、ファーストビューと全体（全体は高さ2400pxごとに分割）
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist'); const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); });
await new Promise((r) => server.listen(4397, r));
const { chromium } = require('/opt/npm-tools/node_modules/playwright'); const b = await chromium.launch();
const PAGES = { top: '/', services: '/services/', pricing: '/pricing/', about: '/about/', faq: '/faq/', contact: '/contact/' };
for (const [vw, vh, tag] of [[1440, 900, 'pc'], [390, 844, 'sp']]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  for (const [name, u] of Object.entries(PAGES)) {
    const pg = await ctx.newPage(); await pg.goto('http://localhost:4397' + u, { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(OUT, `${name}_${tag}_fv.png`) });
    const H = await pg.evaluate(() => document.documentElement.scrollHeight); const STEP = 2400; let i = 1;
    for (let y = 0; y < H; y += STEP, i++) await pg.screenshot({ path: path.join(OUT, `${name}_${tag}_full_${String(i).padStart(2, '0')}.png`), fullPage: true, clip: { x: 0, y, width: vw, height: Math.min(STEP, H - y) } });
    await pg.close();
  }
  await ctx.close();
}
await b.close(); server.close(); console.log(fs.readdirSync(OUT).length, 'files');
