// OG画像（1200x630）とロゴ（512x512）を Playwright で生成する一回限りのスクリプト。
// 使い方: node scripts/gen-og.mjs  → public/og.png, public/logo.png
import { createRequire } from 'node:module';
// playwright は devDependency に入れず、環境にあるものを使う（NODE_PATH 経由）
const { chromium } = createRequire(import.meta.url)('playwright');
const font = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@600&family=IBM+Plex+Sans+JP:wght@500;700&display=swap">`;
const grid = `background-image:repeating-linear-gradient(0deg,#EEF3F4 0,#EEF3F4 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#EEF3F4 0,#EEF3F4 1px,transparent 1px,transparent 40px);`;
const og = `<!doctype html><html lang="ja"><head><meta charset="utf-8">${font}<style>
body{margin:0;width:1200px;height:630px;font-family:'IBM Plex Sans JP',sans-serif;color:#22272E;background:#fff;${grid}display:flex;flex-direction:column;justify-content:space-between;padding:64px 72px;box-sizing:border-box}
.h{display:flex;align-items:center;gap:14px;font-size:28px;font-weight:700}.sq{width:22px;height:22px;background:#6CC1CC}
h1{font-size:68px;line-height:1.25;margin:0}.sub{font-size:24px;color:#4A5461;margin-top:18px}
.t{display:flex;gap:14px}.tile{border:1px solid #D5DDE0;background:#fff;padding:14px 20px}.n{font-family:'IBM Plex Mono';font-size:40px;color:#17798A;font-weight:600;line-height:1}.l{font-size:18px;color:#4A5461;margin-top:6px}
</style></head><body><div class="h"><span class="sq"></span>大倉社会保険労務士事務所<span style="font-weight:500;color:#4A5461;font-size:22px">京都・代表 大倉教晃</span></div>
<div><h1>労務を、仕組みで回す<br>事務所です。</h1><div class="sub">従業員1〜50名の中小企業・成長企業向け ／ 全国オンライン対応</div></div>
<div class="t"><div class="tile"><div class="n">2018</div><div class="l">開業（京都）</div></div><div class="tile"><div class="n">全国</div><div class="l">リモートで完結</div></div><div class="tile"><div class="n">100%</div><div class="l">電子申請</div></div></div></body></html>`;
const logo = `<!doctype html><html><body style="margin:0;width:512px;height:512px;background:#fff;display:flex;align-items:center;justify-content:center"><div style="width:320px;height:320px;background:#6CC1CC;display:flex;align-items:center;justify-content:center"><div style="width:128px;height:128px;background:#17798A"></div></div></body></html>`;
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(og, { waitUntil: 'networkidle' });
await p.screenshot({ path: 'public/og.png' });
await p.setViewportSize({ width: 512, height: 512 });
await p.setContent(logo);
await p.screenshot({ path: 'public/logo.png' });
await browser.close();
console.log('og.png / logo.png generated');
