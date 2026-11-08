// astro build の後に実行し、AI 向けの機械可読ファイルを dist/ に出力する。
//   - dist/**/index.md   … 各ページの Markdown 版（HTML の <main> を変換）
//   - dist/llms.txt      … サイト概要＋ページ一覧（一行説明つき）
//   - dist/llms-full.txt … 全ページの Markdown を連結
// HTML をスクレイプする方式にしているのは、.astro ページ・コンテンツコレクションの
// どちらで書いたページも同じ規則で変換でき、本文とズレないため。
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url)); // Windows でも正しいパスになる
const SITE = 'https://okura-sr.jp';

// ---- 1. dist 内の index.html を列挙 ----
async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    if ((await stat(p)).isDirectory()) out.push(...(await walk(p)));
    else if (name === 'index.html') out.push(p);
  }
  return out;
}

// ---- 2. HTML → Markdown ----
const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '*' });
td.use(gfm);
td.remove(['script', 'style', 'svg', 'iframe', 'noscript']);
td.addRule('dt', { filter: 'dt', replacement: (c) => `\n**${c.trim()}**: ` });
td.addRule('dd', { filter: 'dd', replacement: (c) => `${c.trim()}\n` });
td.addRule('time', { filter: 'time', replacement: (c) => c });
// 見出し内の <br> は改行せずに詰める
td.addRule('headingBr', { filter: (n) => n.nodeName === 'BR' && /^H[1-6]$/.test(n.parentNode?.nodeName || ''), replacement: () => '' });
// カード型リンク（サービス一覧など）は「- [タイトル](URL): 説明」の箇条書きに
td.addRule('cardlink', {
  filter: (n) => n.nodeName === 'A' && /\bcard\b/.test(n.getAttribute('class') || ''),
  replacement: (_c, node) => {
    const q = (cls) => (node.querySelector(`.${cls}`)?.textContent || '').replace(/\s+/g, ' ').trim();
    let href = node.getAttribute('href');
    if (href.startsWith('/')) href = SITE + href;
    const no = q('no');
    return `\n- [${no ? no + ' ' : ''}${q('t')}](${href})${q('d') ? ': ' + q('d') : ''}\n`;
  },
});
// サイト内リンクを絶対 URL に（llms-full.txt 単体で読んでも辿れるように）
td.addRule('abslink', {
  filter: (n) => n.nodeName === 'A' && n.getAttribute('href') && !/\bcard\b/.test(n.getAttribute('class') || ''),
  replacement: (content, node) => {
    let href = node.getAttribute('href');
    const text = content.replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (href.startsWith('/')) href = SITE + href;
    return `[${text}](${href})`;
  },
});

const pick = (html, re) => (html.match(re)?.[1] ?? '').trim();
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const files = await walk(DIST);
const pages = [];
for (const file of files) {
  const html = await readFile(file, 'utf8');
  if (/<meta name="robots" content="noindex"/.test(html)) continue;
  const rel = relative(DIST, file).split(sep).join('/');           // e.g. services/index.html
  const path = '/' + rel.replace(/index\.html$/, '');               // e.g. /services/
  const title = decode(pick(html, /<title>([^<]*)<\/title>/));
  const h1 = decode(pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/).replace(/<[^>]+>/g, ''));
  const description = decode(pick(html, /<meta name="description" content="([^"]*)"/));
  const updated = pick(html, /最終更新 <time datetime="([^"]+)"/) || pick(html, /最終更新[\s\S]{0,40}?datetime="([^"]+)"/);
  let main = pick(html, /<main[^>]*>([\s\S]*)<\/main>/);
  // CTA ブロックは全ページ共通なので Markdown 版からは外す
  main = main.replace(/<section class="cta"[\s\S]*?<\/section>/, '');
  let body = td.turndown(main).replace(/^[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  const md = [
    '---',
    `title: "${(h1 || title).replace(/"/g, '\\"')}"`,
    `url: ${SITE}${path}`,
    `description: "${description.replace(/"/g, '\\"')}"`,
    updated ? `updated: ${updated}` : null,
    '---',
    '',
    body,
    '',
  ].filter((l) => l !== null).join('\n');
  const mdPath = file.replace(/index\.html$/, 'index.md');
  await writeFile(mdPath, md);
  pages.push({ path, title: h1 || title, description, md, mdUrl: `${SITE}${path}index.md` });
}

// ---- 3. llms.txt / llms-full.txt ----
const order = ['/', '/services/', '/automation/', '/pricing/', '/about/', '/faq/', '/ai-policy/', '/news/', '/contact/', '/privacy/'];
const rank = (p) => { const i = order.indexOf(p); return i === -1 ? order.length : i; };
pages.sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path));

const line = (p) => `- [${p.title}](${SITE}${p.path}): ${p.description}（Markdown: ${p.mdUrl}）`;
const groups = [
  ['主要ページ', pages.filter((p) => !p.path.startsWith('/services/') && !p.path.startsWith('/news/') && !['/privacy/', '/contact/'].includes(p.path))],
  ['サービス', pages.filter((p) => p.path.startsWith('/services/'))],
  ['労務ニュース', pages.filter((p) => p.path.startsWith('/news/'))],
  ['その他', pages.filter((p) => ['/privacy/', '/contact/'].includes(p.path))],
];

const summary = [
  '# 大倉社会保険労務士事務所（京都・代表 大倉教晃）',
  '',
  '> 従業員1〜50名の中小企業・成長企業向けの社会保険労務士事務所。手続き代行・給与計算・就業規則・労務相談・助成金・研修を、Python・AIで自動化した仕組みで提供する。2018年京都で開業、東京をはじめ全国にオンライン（電子申請100%）で対応。代表は特定社会保険労務士 大倉教晃（京都大学法学部卒、京都府社会保険労務士会 理事）。京都太陽合同事務所（https://taiyo-rna.jp/）と連携。',
  '',
  '- 所在地: 〒604-0022 京都市中京区御池通室町西北角 ミサワ京都ビル7階（京都太陽合同事務所内）',
  '- 電話: 075-211-6000（京都太陽合同事務所 代表）',
  '- メール: nokuraoffice@gmail.com',
  '- 料金は目安・税別で /pricing/ に掲載',
  '',
  '',
].join('\n');

const llms = summary + groups
  .filter(([, ps]) => ps.length)
  .map(([h, ps]) => `## ${h}\n\n${ps.map(line).join('\n')}\n`)
  .join('\n') + `\n## Optional\n\n- [全ページ連結版](${SITE}/llms-full.txt): 全ページの Markdown を1ファイルにまとめたもの\n`;
await writeFile(join(DIST, 'llms.txt'), llms);

const full = summary + '\n' + pages.map((p) => `\n\n<!-- source: ${SITE}${p.path} ／ markdown: ${p.mdUrl} -->\n\n${p.md}`).join('\n---\n');
await writeFile(join(DIST, 'llms-full.txt'), full);

console.log(`[gen-llms] ${pages.length} pages → index.md twins, llms.txt, llms-full.txt`);
