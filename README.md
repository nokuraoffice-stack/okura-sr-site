# 大倉社会保険労務士事務所 公式サイト（okura-sr.jp）

Astro 5 による静的サイトです。本文は Markdown（`src/content/`）と `.astro` ページで管理し、`main` に push すると GitHub Actions で GitHub Pages に自動公開されます。

> このリポジトリは public です。**顧問先の実名・実データ・内部スキルは絶対に入れないでください。**

## ローカルで動かす

```bash
npm install        # 初回のみ（Node 20 以上）
npm run dev        # http://localhost:4321/ でプレビュー（保存すると自動反映）
npm run build      # 本番ビルド → dist/（llms.txt・Markdown版も生成）
npm run preview    # ビルド結果を確認
```

## 労務ニュース記事の追加

1. `src/content/news/` に `YYYY-MM-<slug>.md` を作成します（例: `2026-12-nenmatsu-chosei.md`）。ファイル名がそのまま URL（`/news/2026-12-nenmatsu-chosei/`）になります。slug は半角英小文字とハイフン。
2. 先頭に次の frontmatter を書きます。

```markdown
---
title: 記事タイトル（全角40字程度まで）
description: 一覧・検索結果・AI 向けに使う要約（1〜2文）
datePublished: 2026-12-01
dateModified: 2026-12-01   # 省略可。更新したら日付を書き換える
tags: [年末調整, 法改正]    # 省略可
draft: false               # true にすると公開されない
---

本文（Markdown）。見出しは ## から始めます（# はタイトルが使うため不可）。
```

3. `npm run dev` で表示を確認 → commit → `main` に push。数分で公開されます。

### そのほかのコンテンツ

| 場所 | 内容 |
|---|---|
| `src/content/services/*.md` | サービス詳細（6本）。`order` で並び順 |
| `src/content/faq/*.md` | よくある質問。`question` `order` `category`、ドラフトは `isDraft: true` |
| `src/pages/*.astro` | トップ・料金目安・事務所概要などの固定ページ |
| `src/data/site.ts` | 事務所名・住所・電話などの基本情報（NAP）。**変更時は Googleビジネスプロフィールと一致させる** |
| `src/data/content.ts` | 3つの理由・流れ・Before/After・セキュリティ4原則 |
| `src/styles/global.css` | 1枚版（事務所案内）由来のデザイントークンと部品 |

本文中の「（ドラフト）」タグ（`<span class="draft">（ドラフト）</span>` または `<Draft />`）は未レビューの仮文言の目印です。レビュー後に削除してください。

## 表記ルール（抜粋・厳守）

- 事務所名の初出は「大倉社会保険労務士事務所（京都・代表 大倉教晃）」
- 勤務先の社名、「行政書士」の肩書き、予備試験は記載しない（資格欄は「行政書士試験 合格（2011年）」のみ可）
- キャッチコピー「自動化で、労務をもっと軽く。」は CTA／フッター限定
- 料金は必ず「目安」「税別」
- 住所は「〒604-0022 京都市中京区御池通室町西北角 ミサワ京都ビル7階」

## デプロイの仕組み

- `.github/workflows/deploy.yml` が `main` への push で起動し、`npm ci` → `npm run build` → GitHub Pages へ公開します。
- 初回のみ、GitHub のリポジトリ設定 › Pages › Source を **GitHub Actions** にしてください。
- 独自ドメインは `public/CNAME`（`okura-sr.jp`）で指定しています。DNS（さくらインターネット）で GitHub Pages の A／AAAA レコードを設定し、Pages 設定で「Enforce HTTPS」を有効にします。

## AI・検索エンジン向けの出力

`npm run build` は `astro build` の後に `scripts/gen-llms.mjs` を実行し、次を生成します。

- `dist/**/index.md` … 各ページの Markdown 版（HTML の本文から変換）
- `dist/llms.txt` … サイト概要とページ一覧
- `dist/llms-full.txt` … 全ページの Markdown を連結したもの
- `sitemap-index.xml` は `@astrojs/sitemap`、`robots.txt` は `public/robots.txt`（AI クローラを明示 Allow）
- 構造化データ（JSON-LD）は `src/components/JsonLd.astro`（全ページ共通）と各ページの `ld` で出力

OG 画像（`public/og.png`）とロゴ（`public/logo.png`）は `node scripts/gen-og.mjs`（Playwright が必要）で再生成できます。
