// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';

// sitemap の lastmod は、各ページに表示している「最終更新」日から取る
const lastmodOf = (url) => {
  try {
    const p = new URL(url).pathname;
    const html = fs.readFileSync(`./dist${p}index.html`, 'utf8');
    const m = html.match(/最終更新[^<]*<time datetime="(\d{4}-\d{2}-\d{2})"/);
    return m ? m[1] : undefined;
  } catch { return undefined; }
};

export default defineConfig({
  site: 'https://okura-sr.jp',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      serialize(item) { const d = lastmodOf(item.url); return d ? { ...item, lastmod: d } : item; },
    }),
  ],
});
