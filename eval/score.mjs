// 「自」の採点スクリプト（作成日 2026-11-15）
// 使い方: node eval/score.mjs <出力JSON> [lighthouse結果JSON] [顧問先名リスト(リポジトリ外)]
// dist/ をビルド済みであること。結果は { id: {r:1|0, note} }。
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const [OUT, LH, CLIENTS] = process.argv.slice(2);
const ORIGIN = 'https://okura-sr.jp';
const MAIN6 = ['/', '/services/', '/pricing/', '/about/', '/faq/', '/contact/'];

// ---------- 素材の読み込み ----------
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(DIST);
const read = (f) => fs.readFileSync(f, 'utf8');
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const urlOf = (f) => '/' + path.relative(DIST, f).replace(/index\.html$/, '').replace(/\\/g, '/');
const pages = htmlFiles.map((f) => ({ url: urlOf(f), html: read(f) })).filter((p) => p.url !== '/404.html');
const textFiles = files.filter((f) => /\.(html|md|txt|xml)$/.test(f)).map((f) => ({ f: path.relative(DIST, f), s: read(f) }));
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const norm = (s) => s.replace(/[\s　]+/g, '');
const mainOf = (h) => (h.match(/<main[\s\S]*?<\/main>/) || [''])[0];
const jsonld = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => { try { const j = JSON.parse(m[1]); return j['@graph'] || [j]; } catch { return [{ __error: true }]; } });
const typeIs = (n, t) => [].concat(n['@type'] || []).includes(t);
const page = (u) => pages.find((p) => p.url === u);
const SERVICE6 = pages.filter((p) => /^\/services\/[^/]+\/$/.test(p.url));
const ARTICLES = pages.filter((p) => /^\/news\/[^/]+\/$/.test(p.url));

const R = {};
const set = (id, ok, note = '') => { R[id] = { r: ok ? 1 : 0, note: ok ? '' : String(note).slice(0, 300) }; };
const hits = (re, list = textFiles) => list.flatMap((t) => { const m = t.s.match(re); return m ? [`${t.f}:${m[0]}`] : []; });

// ---------- A 正確さ・表記 ----------
set('A1', hits(/FOLIO|フォリオ/i).length === 0, hits(/FOLIO|フォリオ/i).join(' / '));
{
  const bad = [];
  for (const t of textFiles) for (const m of t.s.matchAll(/行政書士/g)) {
    const ctx = t.s.slice(Math.max(0, m.index - 12), m.index + 16);
    if (!/行政書士試験|行政書士登録|行政書士法|[・、]行政書士|行政書士[・、等な]/.test(ctx)) bad.push(`${t.f}:${ctx.replace(/\s+/g, ' ')}`);
  }
  for (const p of pages) for (const n of jsonld(p.html)) if (/行政書士/.test(JSON.stringify(n.jobTitle || ''))) bad.push(`${p.url}:jobTitle`);
  set('A2', bad.length === 0, bad.slice(0, 3).join(' / '));
}
set('A3', hits(/予備試験/).length === 0, hits(/予備試験/).join(' / '));
{
  const bad = pages.filter((p) => p.html.replace(/<section class="cta"[\s\S]*?<\/section>/g, '').replace(/<footer[\s\S]*?<\/footer>/g, '').includes('自動化で、労務をもっと軽く')).map((p) => p.url);
  set('A4', bad.length === 0, 'CTA・フッター以外に出現: ' + bad.join(' '));
}
{
  const SETP = norm('大倉社会保険労務士事務所（京都・代表 大倉教晃）');
  const miss = ['/', '/about/'].filter((u) => !norm(strip(mainOf(page(u).html))).includes(SETP));
  const ps = jsonld(page('/').html).find((n) => typeIs(n, 'ProfessionalService')) || {};
  const okLd = ps.name === '大倉社会保険労務士事務所' && JSON.stringify(ps.alternateName || '').includes('大倉社労士事務所（京都）');
  set('A5', miss.length === 0 && okLd, `セット表記なし:${miss.join(' ')} JSON-LD:${okLd}`);
}
{
  const ADDR = norm('〒604-0022 京都市中京区御池通室町西北角 ミサワ京都ビル7階');
  const bad = [];
  for (const t of textFiles) {
    const s = norm(strip(t.s));
    for (const m of s.matchAll(/〒?604-0022/g)) if (!s.slice(m.index, m.index + 60).includes(ADDR.replace('〒', ''))) bad.push(`${t.f}:住所不一致`);
    if (/御池之町|323番地/.test(s)) bad.push(`${t.f}:旧表記`);
  }
  const a = (jsonld(page('/').html).find((n) => typeIs(n, 'ProfessionalService')) || {}).address || {};
  if (a.postalCode !== '604-0022' || !/御池通室町西北角/.test(a.streetAddress || '') || !/ミサワ京都ビル7階/.test(a.streetAddress || '')) bad.push('JSON-LD address');
  set('A6', bad.length === 0, [...new Set(bad)].slice(0, 4).join(' / '));
}
{
  const bad = [];
  for (const t of textFiles) {
    for (const m of t.s.matchAll(/(?<![\d-])0\d{1,4}-\d{1,4}-\d{3,4}(?!\d)/g)) if (m[0] !== '075-211-6000' && !/604-0022/.test(m[0])) bad.push(`${t.f}:${m[0]}`);
    for (const m of t.s.matchAll(/tel:([+\d-]+)/g)) if (!['0752116000', '+81752116000', '+81-75-211-6000'].includes(m[1])) bad.push(`${t.f}:${m[0]}`);
    for (const m of t.s.matchAll(/\+81[-\d]+/g)) if (m[0].replace(/-/g, '') !== '+81752116000') bad.push(`${t.f}:${m[0]}`);
    if (/0[789]0-?\d{4}-?\d{4}/.test(t.s)) bad.push(`${t.f}:携帯番号`);
  }
  set('A7', bad.length === 0, [...new Set(bad)].slice(0, 4).join(' / '));
}
{
  const h = mainOf(page('/pricing/').html).replace(/<section class="cta"[\s\S]*?<\/section>/g, '');
  const bad = [];
  for (const tb of h.matchAll(/<table[\s\S]*?<\/table>/g)) {
    const head = strip((tb[0].match(/<thead[\s\S]*?<\/thead>/) || [''])[0]);
    for (const m of strip(tb[0]).matchAll(/[\d,]+円(〜)?/g)) if (!m[1] && !/目安/.test(head)) bad.push(m[0]);
  }
  const outside = strip(h.replace(/<table[\s\S]*?<\/table>/g, ''));
  for (const m of outside.matchAll(/[\d,]+円(〜)?/g)) if (!m[1] && !/目安/.test(outside.slice(Math.max(0, m.index - 80), m.index + 80))) bad.push(m[0]);
  const t = strip(h);
  const need = [/税別/, /目安/, /書面|見積書/].filter((re) => !re.test(t)).map(String);
  set('A8', bad.length === 0 && need.length === 0, `目安なし金額:${bad.join(',')} 不足語:${need.join(',')}`);
}
{
  const bad = pages.filter((p) => /初回[^。<]{0,14}無料/.test(strip(p.html)) && !/60分/.test(strip(p.html))).map((p) => p.url);
  set('A9', bad.length === 0, '60分の条件なし: ' + bad.join(' '));
}
{
  const re = /No\.?\s?1|ナンバーワン|最安|業界初|日本一|地域一|京都一|業界最|最高水準|圧倒的|必ず(?!しも)|絶対|\d+\s?[%％]\s?(削減|短縮|向上|アップ|カット)|\d+\s?社(以上)?の(実績|導入)|満足度\s?\d+|他(社|事務所)より/;
  const h = hits(re);
  set('A10', h.length === 0, h.slice(0, 4).join(' / '));
}
{
  if (!CLIENTS || !fs.existsSync(CLIENTS)) set('A11', false, '照合リストなし（判定できない）');
  else {
    const names = read(CLIENTS).split('\n').map((s) => s.trim()).filter(Boolean);
    const bad = textFiles.flatMap((t) => names.filter((n) => t.s.includes(n)).map(() => `${t.f}:顧問先名`));
    set('A11', bad.length === 0, [...new Set(bad)].slice(0, 4).join(' / '));
  }
}
{
  const t = strip(mainOf(page('/about/').html));
  const i = t.search(/行政書士試験\s*合格（2011年）/);
  const ok = /特定社会保険労務士/.test(t) && i >= 0 && /行政書士登録はしていません/.test(t.slice(Math.max(0, i - 150), i + 150));
  set('A12', ok, i < 0 ? '試験合格の表記なし' : '登録なし注記が近くにない');
}
{
  const bad = ['/', '/about/'].filter((u) => { const t = strip(mainOf(page(u).html)); return /京都太陽合同事務所/.test(t) && !/独立した事務所/.test(t); });
  set('A13', bad.length === 0, '独立表示なし: ' + bad.join(' '));
}
{
  const h1 = hits(/AIに(送信し|送り)(ない|ません)|AIに送信しません/);
  const miss = ['/automation/', '/ai-policy/', '/faq/'].filter((u) => { const t = norm(strip(page(u).html)); return !(t.includes('匿名化') && t.includes('最小化') && /生成AIに入力しません|生成AIには入力しません/.test(t)); });
  set('A14', h1.length === 0 && miss.length === 0, `禁止文言:${h1.join(',')} v2文言なし:${miss.join(' ')}`);
}
{
  const led = path.join(ROOT, 'docs', '素材台帳.md');
  const imgs = fs.existsSync(path.join(ROOT, 'public/images')) ? fs.readdirSync(path.join(ROOT, 'public/images')) : [];
  const s = fs.existsSync(led) ? read(led) : null;
  const miss = s === null ? ['台帳なし'] : imgs.filter((f) => !new RegExp(f.replace(/\./g, '\\.') + '.*\\|.*\\|').test(s));
  set('A15', miss.length === 0, miss.join(' '));
}
{
  const s = read(path.join(ROOT, 'docs', '事務所HP_設計書_v1.md'));
  const sec = s.slice(s.indexOf('## 9.'), s.indexOf('## 10.'));
  const open = (sec.match(/- \[ \]/g) || []).length;
  set('A16', open === 0 && /- \[x\]/i.test(sec), `未確定: §9の未チェック ${open}行`);
}

// ---------- B 伝わり方（自） ----------
{
  const bad = pages.filter((p) => !/<section class="cta"[\s\S]*?href="\/contact\/"/.test(p.html) && !/href="\/contact\/"/.test(mainOf(p.html)) && p.url !== '/contact/').map((p) => p.url);
  const noCta = pages.filter((p) => !/<section class="cta"/.test(p.html) && p.url !== '/contact/').map((p) => p.url);
  set('B3', bad.length === 0 && noCta.length === 0, 'CTAなし: ' + [...new Set([...bad, ...noCta])].join(' '));
}
const h1Of = (h) => strip((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || ['', ''])[1]).trim();
{
  const bad = []; const descs = {};
  for (const p of pages) {
    const title = (p.html.match(/<title>([^<]*)/) || ['', ''])[1];
    const d = (p.html.match(/<meta name="description" content="([^"]*)"/) || ['', ''])[1];
    const h1 = norm(h1Of(p.html));
    const grams = new Set(); for (let i = 0; i < h1.length - 1; i++) grams.add(h1.slice(i, i + 2));
    const share = [...grams].filter((g) => norm(title).includes(g)).length / Math.max(1, grams.size);
    if (share < 0.5) bad.push(`${p.url}:title≠h1`);
    if (!d) bad.push(`${p.url}:descなし`); else if (descs[d]) bad.push(`${p.url}:desc重複`); descs[d] = 1;
  }
  set('B4', bad.length === 0, bad.slice(0, 5).join(' / '));
}
{
  const bad = pages.filter((p) => /data-draft|（ドラフト）/.test(p.html)).map((p) => p.url);
  set('B6', bad.length === 0, 'ドラフト印: ' + bad.join(' '));
}
{
  const h = mainOf(page('/contact/').html);
  const miss = [['フォーム', /docs\.google\.com\/forms|forms\.gle/], ['mailto', /href="mailto:/], ['tel', /href="tel:/]].filter(([, re]) => !re.test(h)).map(([n]) => n);
  set('B7', miss.length === 0, 'なし: ' + miss.join(' '));
}
{
  const bad = [];
  for (const p of [...SERVICE6, page('/automation/'), ...ARTICLES]) {
    const after = p.html.slice(p.html.indexOf('</h1>')).replace(/<p class="updated"[\s\S]*?<\/p>/, ''); // 更新日の行は段落に数えない
    const para = strip((after.match(/<p[^>]*>([\s\S]*?)<\/p>/) || ['', ''])[1]).trim();
    if (para.length < 40 || para.length > 200 || !/[。！？]$/.test(para)) bad.push(`${p.url}(${para.length}字)`);
  }
  set('B9', bad.length === 0, bad.join(' '));
}

// ---------- E 機械向け ----------
{
  const bad = pages.filter((p) => jsonld(p.html).some((n) => n.__error) || jsonld(p.html).length === 0).map((p) => p.url);
  set('E1', bad.length === 0, bad.join(' '));
}
const g0 = jsonld(page('/').html);
{
  const n = g0.find((x) => typeIs(x, 'ProfessionalService')) || {};
  const miss = ['name', 'alternateName', 'url', 'telephone', 'email', 'address', 'areaServed', 'founder', 'memberOf', 'knowsAbout', 'priceRange'].filter((k) => n[k] == null);
  set('E2', miss.length === 0, '不足: ' + miss.join(','));
}
{
  const n = g0.find((x) => typeIs(x, 'Person')) || {};
  const miss = ['alumniOf', 'memberOf', 'worksFor'].filter((k) => n[k] == null);
  if (n.jobTitle !== '特定社会保険労務士') miss.push('jobTitle');
  set('E3', miss.length === 0, '不足: ' + miss.join(','));
}
{
  const bad = [];
  const svc = new Set(); for (const p of SERVICE6) if (jsonld(p.html).some((n) => typeIs(n, 'Service'))) svc.add(p.url);
  if (svc.size !== 6) bad.push(`Service ${svc.size}/6`);
  if (!jsonld(page('/faq/').html).some((n) => typeIs(n, 'FAQPage'))) bad.push('FAQPageなし');
  for (const p of ARTICLES) { const a = jsonld(p.html).find((n) => typeIs(n, 'Article') || typeIs(n, 'BlogPosting') || typeIs(n, 'NewsArticle')); if (!a || !a.datePublished || !a.dateModified) bad.push(`${p.url}:Article`); }
  for (const p of pages) { const g = jsonld(p.html); if (!g.some((n) => typeIs(n, 'WebSite'))) bad.push(`${p.url}:WebSite`); if (p.url !== '/' && !g.some((n) => typeIs(n, 'BreadcrumbList'))) bad.push(`${p.url}:Breadcrumb`); }
  set('E4', bad.length === 0, bad.slice(0, 5).join(' / '));
}
{
  const bad = [];
  for (const p of pages) {
    const t = norm(strip(p.html.replace(/<head[\s\S]*?<\/head>/, '')));
    for (const n of jsonld(p.html)) {
      if (typeIs(n, 'FAQPage')) for (const q of n.mainEntity || []) {
        if (!t.includes(norm(q.name))) bad.push(`${p.url}:FAQ質問「${q.name.slice(0, 12)}」`);
        const a = norm(strip(q.acceptedAnswer?.text || '')); if (a && !t.includes(a.slice(0, 30))) bad.push(`${p.url}:FAQ回答「${a.slice(0, 12)}」`);
      }
      if ((typeIs(n, 'Article') || typeIs(n, 'Service')) && n.name && !t.includes(norm(n.name))) bad.push(`${p.url}:name`);
      if (typeIs(n, 'Article')) { if (n.headline && !t.includes(norm(n.headline))) bad.push(`${p.url}:headline`); if (n.dateModified && !p.html.includes(`datetime="${String(n.dateModified).slice(0, 10)}"`)) bad.push(`${p.url}:dateModified`); }
    }
  }
  set('E5', bad.length === 0, bad.slice(0, 4).join(' / '));
}
{
  const rb = read(path.join(DIST, 'robots.txt'));
  const UAS = ['Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'Amazonbot', 'Meta-ExternalAgent', 'CCBot'];
  const miss = UAS.filter((u) => !new RegExp(`User-agent: ${u}\\s`, 'i').test(rb));
  set('E6', miss.length === 0 && !/^Disallow: \/\S/m.test(rb) && /Sitemap: https:\/\/okura-sr\.jp\/sitemap-index\.xml/.test(rb), '不足: ' + miss.join(','));
}
const sm = files.filter((f) => /sitemap-\d+\.xml$/.test(f)).map(read).join('');
const smUrls = [...sm.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({ loc: (m[1].match(/<loc>([^<]+)/) || [])[1], lastmod: (m[1].match(/<lastmod>([^<]+)/) || [])[1] }));
{
  const locs = smUrls.map((u) => u.loc.replace(ORIGIN, ''));
  const miss = pages.map((p) => p.url).filter((u) => !locs.includes(u));
  const noMod = smUrls.filter((u) => !/^\d{4}-\d{2}-\d{2}/.test(u.lastmod || '')).length;
  set('E7', miss.length === 0 && noMod === 0, `未掲載:${miss.join(' ')} lastmodなし:${noMod}件`);
}
{
  const bad = [];
  for (const f of ['llms.txt', 'llms-full.txt']) if (!fs.existsSync(path.join(DIST, f))) bad.push(f + 'なし');
  for (const p of pages) if (!fs.existsSync(path.join(DIST, p.url, 'index.md'))) bad.push(p.url + 'index.md');
  for (const f of ['llms.txt', 'llms-full.txt']) if (fs.existsSync(path.join(DIST, f))) for (const m of read(path.join(DIST, f)).matchAll(/https:\/\/okura-sr\.jp(\/[^\s)>\]）]*)/g)) { const t = path.join(DIST, m[1].split('#')[0]); if (!fs.existsSync(t) && !fs.existsSync(path.join(t, 'index.html'))) bad.push(`${f}→${m[1]}`); }
  set('E8', bad.length === 0, bad.slice(0, 5).join(' / '));
}
{
  const bad = pages.filter((p) => (p.html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] !== ORIGIN + p.url).map((p) => p.url);
  set('E9', bad.length === 0, bad.join(' '));
}
{
  const bad = [];
  for (const p of pages) {
    const hs = [...p.html.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
    if (hs.filter((x) => x === 1).length !== 1) bad.push(`${p.url}:h1×${hs.filter((x) => x === 1).length}`);
    for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) { bad.push(`${p.url}:h${hs[i - 1]}→h${hs[i]}`); break; }
  }
  set('E10', bad.length === 0, bad.slice(0, 5).join(' / '));
}
{
  const bad = pages.filter((p) => !/最終更新[^<]*<time datetime="\d{4}-\d{2}-\d{2}"/.test(p.html)).map((p) => p.url);
  set('E11', bad.length === 0, bad.join(' '));
}
{
  const need = [/property="og:title"/, /property="og:description"/, /property="og:url"/, /property="og:image" content="https:\/\/okura-sr\.jp\/([^"]+)"/, /name="twitter:card"/, /rel="icon"/];
  const bad = pages.filter((p) => need.some((re) => !re.test(p.html))).map((p) => p.url);
  const og = (page('/').html.match(need[3]) || [])[1];
  set('E12', bad.length === 0 && og && fs.existsSync(path.join(DIST, og)), bad.join(' ') + (og ? '' : ' og:imageなし'));
}
const hrefs = (h) => [...h.matchAll(/<a\s[^>]*href="([^"]+)"/g)].map((m) => m[1]);
{
  const no = pages.filter((p) => /noindex|nosnippet|max-snippet:0/.test(p.html)).map((p) => p.url);
  // 本文リンク＝ヘッダー・フッターのナビを除いた main 内のリンク
  const inbound = {};
  for (const p of pages) for (const h of hrefs(mainOf(p.html))) { const u = h.replace(ORIGIN, '').split('#')[0]; if (u !== p.url) inbound[u] = 1; }
  const orphan = pages.map((p) => p.url).filter((u) => u !== '/' && !inbound[u]);
  set('E13', no.length === 0 && orphan.length === 0, `noindex:${no.join(' ')} 本文リンクなし:${orphan.join(' ')}`);
}
{
  const bad = ARTICLES.filter((p) => !hrefs(mainOf(p.html)).some((h) => /https?:\/\/[^/]*(\.go\.jp|e-gov\.go\.jp|mhlw\.go\.jp|\.lg\.jp)/.test(h))).map((p) => p.url);
  set('E14', ARTICLES.length > 0 && bad.length === 0, '一次情報リンクなし: ' + bad.join(' '));
}
{
  const bad = [...SERVICE6, ...ARTICLES].filter((p) => { const m = mainOf(p.html).replace(/<section class="cta"[\s\S]*?<\/section>/g, ''); const t = norm(strip(m)); return !(t.includes('大倉教晃') && t.includes('社会保険労務士') && /href="\/about\/[^"]*"/.test(m)); }).map((p) => p.url);
  set('E15', bad.length === 0, '執筆・監修の表示なし: ' + bad.join(' '));
}
{
  const bad = pages.filter((p) => /<script(?![^>]*application\/ld\+json)[^>]*>/.test(p.html.replace(/<iframe[\s\S]*?<\/iframe>/g, ''))).map((p) => p.url);
  set('E16', bad.length === 0, bad.join(' '));
}

// ---------- F（静的に判定できる分） ----------
{
  const bad = [];
  for (const p of pages) for (const m of p.html.matchAll(/<img\s[^>]*>/g)) { const t = m[0]; if (!/\salt="[^"]+"/.test(t) && !/role="presentation"|aria-hidden="true"/.test(t)) bad.push(`${p.url}:alt`); if (!/\swidth="\d+"/.test(t) || !/\sheight="\d+"/.test(t)) bad.push(`${p.url}:寸法`); }
  set('F4', bad.length === 0, bad.slice(0, 4).join(' / '));
}
{
  const bad = []; const ext = new Set();
  for (const p of pages) for (const h of hrefs(p.html)) {
    if (/^(mailto:|tel:|#)/.test(h)) continue;
    if (/^https?:\/\//.test(h) && !h.startsWith(ORIGIN)) { ext.add(h); continue; }
    const u = h.replace(ORIGIN, '').split('#')[0].split('?')[0]; const t = path.join(DIST, u);
    if (!(fs.existsSync(t) && (fs.statSync(t).isFile() || fs.existsSync(path.join(t, 'index.html'))))) bad.push(`${p.url}→${h}`);
    const frag = h.split('#')[1];
    if (frag) { const tp = page(u || p.url) || (u === '' ? p : null); if (tp && !new RegExp(`id="${decodeURIComponent(frag).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(tp.html)) bad.push(`${p.url}→${h}(アンカーなし)`); }
  }
  for (const h of ext) { let code = '000'; try { code = execSync(`curl -s -o /dev/null -m 20 -L -A "Mozilla/5.0" -w "%{http_code}" "${h}"`, { encoding: 'utf8' }); } catch {} if (!/^(2|3)/.test(code)) bad.push(`外部 ${h} (${code})`); }
  set('F5', bad.length === 0, bad.slice(0, 5).join(' / '));
}
{
  const bad = [];
  for (const p of pages) { for (const m of p.html.matchAll(/<img\s[^>]*src="([^"]+)"/g)) if (!/\.(webp|svg)(\?|$)/.test(m[1])) bad.push(`${p.url}:${m[1]}`); for (const m of p.html.matchAll(/fonts\.googleapis\.com\/css2[^"]*/g)) if (!/display=swap/.test(m[0])) bad.push(`${p.url}:swapなし`); }
  set('F6', bad.length === 0, bad.slice(0, 4).join(' / '));
}

// ---------- C1：CSSの色相 ----------
{
  const css = files.filter((f) => f.endsWith('.css')).map(read).join('\n') + pages.map((p) => [...p.html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]).join(';') + [...p.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('')).join('\n');
  const cols = new Set();
  for (const m of css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) { let h = m[1]; if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join(''); if (h.length >= 6) cols.add(h.slice(0, 6).toLowerCase()); }
  for (const m of css.matchAll(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/g)) cols.add([m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join(''));
  const bad = [];
  for (const c of cols) {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); if (s < 0.2 || l < 0.12 || l > 0.97) continue; // 無彩色・ほぼ白黒は対象外
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    if (h < 165 || h > 205) bad.push(`#${c}(色相${Math.round(h)})`);
  }
  set('C1', bad.length === 0, 'ティール系以外: ' + bad.slice(0, 8).join(' '));
}

// ---------- ブラウザで実測（C2〜C4, C6, D1〜D4） ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };
const server = http.createServer((req, res) => {
  let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const ext = path.extname(f), buf = fs.readFileSync(f); const gz = /html|css|js|svg|xml|txt|md/.test(ext);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ...(gz ? { 'Content-Encoding': 'gzip' } : {}) }); res.end(gz ? zlib.gzipSync(buf) : buf);
});
await new Promise((r) => server.listen(4399, r));
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const browser = await chromium.launch();
const measure = async (w, h, urls, fn) => { const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const out = {}; for (const u of urls) { const pg = await ctx.newPage(); await pg.goto('http://localhost:4399' + u, { waitUntil: 'networkidle' }); out[u] = await pg.evaluate(fn); await pg.close(); } await ctx.close(); return out; };
const ALLU = pages.map((p) => p.url);
const pc = await measure(1440, 900, ALLU, () => {
  const cs = (e) => getComputedStyle(e); const body = cs(document.body);
  const ps = [...document.querySelectorAll('main p, main li')].filter((e) => e.offsetParent && !e.closest('.cta') && !e.matches('.note,.updated,.eyebrow,.lead,.lead-sub,.d,.sub,.tag') && !e.closest('table,.tiles,.card,.step-cards,nav'));
  const small = ps.filter((e) => parseFloat(cs(e).fontSize) < 16 || parseFloat(cs(e).lineHeight) / parseFloat(cs(e).fontSize) < 1.6).map((e) => `${cs(e).fontSize}/${(parseFloat(cs(e).lineHeight) / parseFloat(cs(e).fontSize)).toFixed(2)} ${e.textContent.trim().slice(0, 14)}`);
  const wraps = [...document.querySelectorAll('main .wrap')].map((e) => { const c = cs(e); return e.getBoundingClientRect().width - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight); });
  const over = [...document.querySelectorAll('body *')].filter((e) => e.offsetParent && e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.skip')).map((e) => e.tagName + '.' + e.className).slice(0, 3);
  const mono = document.querySelector('.mono, .no, .eyebrow');
  return { color: body.color, font: body.fontFamily, mono: mono ? cs(mono).fontFamily : '', small: small.slice(0, 3), maxWrap: Math.max(0, ...wraps), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, over };
});
const sp = await measure(390, 844, ALLU, () => {
  const cs = (e) => getComputedStyle(e);
  const taps = [...document.querySelectorAll('.site-header a, .site-header button, .site-header summary, .btn, .site-footer nav a')].filter((e) => e.offsetParent || e.getClientRects().length).filter((e) => e.getBoundingClientRect().height < 40 && e.getBoundingClientRect().height > 0).map((e) => `${e.textContent.trim().slice(0, 8)}:${Math.round(e.getBoundingClientRect().height)}px`);
  const tables = [...document.querySelectorAll('table')].filter((t) => { if (t.getBoundingClientRect().right <= innerWidth + 1) return false; let p = t.parentElement; while (p && p !== document.body) { if (/auto|scroll/.test(cs(p).overflowX)) return false; p = p.parentElement; } return true; }).length;
  const ps = [...document.querySelectorAll('main article p, main .prose p, main .faq-item p')].filter((e) => e.offsetParent && !e.matches('.note,.updated'));
  const small = ps.filter((e) => parseFloat(cs(e).fontSize) < 16).length;
  return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, taps: [...new Set(taps)].slice(0, 6), tables, small, vp: !!document.querySelector('meta[name=viewport][content*="width=device-width"]') };
});
await browser.close(); server.close();
{
  const p0 = pc['/'];
  const ok = p0.color === 'rgb(34, 39, 46)' && /^"?IBM Plex Sans JP/.test(p0.font) && /IBM Plex Mono/.test(p0.mono);
  set('C2', ok, `color=${p0.color} font=${p0.font.slice(0, 30)} mono=${p0.mono.slice(0, 30)}`);
  const badW = MAIN6.filter((u) => Math.round(pc[u].maxWrap) > 1040 || Math.round(pc[u].maxWrap) < 1000).map((u) => `${u}:${Math.round(pc[u].maxWrap)}`);
  set('C3', badW.length === 0, '本文幅: ' + badW.join(' '));
  const badF = MAIN6.filter((u) => pc[u].small.length).map((u) => `${u}:${pc[u].small[0]}`);
  set('C4', badF.length === 0, badF.join(' / '));
  const badO = ALLU.filter((u) => pc[u].sw > pc[u].cw || pc[u].over.length).map((u) => `${u}:${pc[u].over[0] || 'scroll'}`);
  set('C6', badO.length === 0, badO.slice(0, 4).join(' / '));
  const d1 = ALLU.filter((u) => sp[u].sw > sp[u].cw); set('D1', d1.length === 0, '横スクロール: ' + d1.join(' '));
  const d2 = [...new Set(ALLU.flatMap((u) => sp[u].taps))]; set('D2', d2.length === 0, '40px未満: ' + d2.slice(0, 8).join(' '));
  const d3 = ALLU.filter((u) => sp[u].tables); set('D3', d3.length === 0, '表がはみ出す: ' + d3.join(' '));
  const d4 = ALLU.filter((u) => !sp[u].vp || sp[u].small); set('D4', d4.length === 0, '16px未満の本文: ' + d4.join(' '));
}

// ---------- Lighthouse（C5, F1〜F3） ----------
if (LH && fs.existsSync(LH)) {
  const lh = JSON.parse(read(LH)); // { url: {performance, accessibility, 'best-practices', seo, contrast} }
  const f = (k, min) => MAIN6.filter((u) => !(lh[u] && lh[u][k] >= min)).map((u) => `${u}:${lh[u] ? lh[u][k] : '-'}`);
  set('C5', MAIN6.every((u) => lh[u] && lh[u].contrast === 1), 'コントラスト不合格: ' + MAIN6.filter((u) => !(lh[u] && lh[u].contrast === 1)).join(' '));
  set('F1', f('performance', 90).length === 0, f('performance', 90).join(' '));
  set('F2', f('accessibility', 95).length === 0, f('accessibility', 95).join(' '));
  const f3 = [...f('best-practices', 95), ...f('seo', 95)]; set('F3', f3.length === 0, f3.join(' '));
} else for (const id of ['C5', 'F1', 'F2', 'F3']) set(id, false, 'Lighthouse結果なし（判定できない）');

fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString().slice(0, 10), results: R }, null, 1));
const z = Object.entries(R).filter(([, v]) => !v.r);
console.log(`自 ${Object.keys(R).length}項目  1=${Object.keys(R).length - z.length}  0=${z.length}`);
for (const [k, v] of z) console.log(k, v.note);
