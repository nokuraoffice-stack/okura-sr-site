// Lighthouse を主要6ページ（モバイル設定）で実行（作成日 2026-11-15）
// 使い方: LH_DIR=<lighthouseを入れたフォルダ> node eval/lh.mjs <出力JSON>
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execP = promisify(exec);
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const OUT = process.argv[2];
const MAIN6 = ['/', '/services/', '/pricing/', '/about/', '/faq/', '/contact/'];
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const ext = path.extname(f), buf = fs.readFileSync(f); const gz = /html|css|svg|xml|txt/.test(ext);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ...(gz ? { 'Content-Encoding': 'gzip' } : {}) }); res.end(gz ? zlib.gzipSync(buf) : buf);
});
await new Promise((r) => server.listen(4398, r));
const CHROME = require('/opt/npm-tools/node_modules/playwright').chromium.executablePath();
const out = {};
for (const u of MAIN6) {
  const tmp = path.join(process.env.LH_DIR, 'lh-tmp.json');
  await execP(`npx lighthouse http://localhost:4398${u} --quiet --chrome-flags="--headless=new --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=${tmp}`, { cwd: process.env.LH_DIR, env: { ...process.env, CHROME_PATH: CHROME } });
  const r = JSON.parse(fs.readFileSync(tmp, 'utf8')); const c = (k) => Math.round(r.categories[k].score * 100);
  out[u] = { performance: c('performance'), accessibility: c('accessibility'), 'best-practices': c('best-practices'), seo: c('seo'), contrast: r.audits['color-contrast'].score, failed: Object.values(r.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode === 'binary').map((a) => a.id) };
  console.log(u, JSON.stringify(out[u]));
}
server.close();
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
