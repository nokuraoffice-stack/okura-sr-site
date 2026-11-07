# 事務所ホームページ 設計書 v1（okura-sr.jp）

作成: 2026-11-07 ／ 正本: Claude Project doc `claude/事務所HP_設計書_v1.md`（同内容をNotionプロジェクト「事務所HP（okura-sr.jp）」にも掲載）
タスク管理: Notion Kei Desk › プロジェクト「事務所HP（okura-sr.jp）」› タスクDB（担当プロパティで割り振り）

## 1. 目的・位置づけ
- Notion公開ページ（事務所案内）を置き換え、人にもAI（ChatGPT／Perplexity／Google AI）にも拾われる事務所サイトにする
- サイト＝「全国リモートで完結する、自動化された社労士事務所」の実体。京都太陽合同事務所サイト（taiyo-rna.jp）は受け皿ではなく**送り先**（相互リンク）
- 継続費用はドメイン代のみ（年3,000円前後）。更新は Markdown 追記 → 自動デプロイ

## 2. 決定事項（2026-11-05〜07）
| 項目 | 決定 |
|---|---|
| ドメイン | **okura-sr.jp**（さくらインターネットで Noriaki が取得・二段階認証ON）。okura-sr.com は大倉久実社労士事務所（東京）が使用中のため不可 |
| ホスティング | GitHub Pages（無料・HTTPS）。リポジトリ `nokuraoffice-stack/okura-sr-site`（public） |
| 技術 | Astro（静的出力・JS最小）＋ Markdown コンテンツ ＋ GitHub Actions 自動デプロイ |
| 京都太陽サイト | 別サイト＋相互リンク。taiyo-rna.jp/jimusho/ の大倉欄にリンク＋2〜3行紹介（Noriakiが編集権限で実施）。JSON-LD で memberOf／affiliation を相互に記述 |
| 料金 | 目安のみ（人数帯の月額レンジ＋スポット入口） |
| 住所表記 | 〒604-0022 京都市中京区御池通室町西北角 ミサワ京都ビル7階（京都太陽サイト・署名と同一。「御池之町323番地」は使わない） |
| 電話 | 直通 090-8232-3568 を主、075-211-6000（代）を併記（既定・要確認） |
| 労務ニュース | 一般公開 `/news/`（月次配信を記事化） |
| 広告指針 | 社労士会の業務広告指針を別途調査し §9 チェックリストで照合してから公開 |

## 3. 表記ルール（厳守）
- FOLIO／FOLIOホールディングスの社名は出さない → 「スタートアップ企業の管理部門」
- 「行政書士」を肩書きに使わない。資格欄に「行政書士試験 合格（2011年）」のみ可
- 司法試験予備試験は記載しない
- キャッチコピー「自動化で、労務をもっと軽く。」は CTA／フッター限定
- 事務所名は初出で「大倉社会保険労務士事務所（京都・代表 大倉教晃）」とセット表記（同名他事務所との区別。JSON-LD の name／alternateName も同様）
- 顧問先の実名・実データは載せない。事例は業種＋規模のみ、数値は丸める
- 対象顧客の表現: 「従業員1〜50名の中小企業・成長企業」「東京をはじめ全国」

## 4. サイト構成
| URL | 役割 | 素材 | ドラフト → レビュー |
|---|---|---|---|
| `/` | 1枚版の内容（誰向け・何を・3つの理由・流れ・CTA） | Notion現行＋1枚版 | Claude Code → Fable |
| `/services/` ＋ 6サブ（`procedures` `payroll` `rules` `consulting` `subsidy` `training`） | サービス詳細 | 8月版デッキ付録 | Claude Code → Fable |
| `/automation/` | 業務自動化・AI活用、Before/After、セキュリティ4原則 | デッキ6〜8枚目 | Claude Code → Fable |
| `/ai-policy/` | 生成AIの利用方針・個人情報の扱い（公開版） | 個人情報取扱方針v2 | Claude Code → Noriaki |
| `/about/` | 事務所概要・代表プロフィール・連携先 | 表記ルール適用 | Claude Code → Noriaki |
| `/faq/` | 1問1答 20問程度 | 新規 | Codex/ChatGPT → Fable |
| `/pricing/` | 料金目安 | 料金たたき台（実単価確認） | Fable → Noriaki |
| `/news/` ＋ 記事 | 法改正・労務コラム | 労務ニュース配信 | kei/Claude Code → Fable |
| `/contact/` | Googleフォーム埋め込み＋mailto／tel | — | Claude Code |
| `/privacy/` | 個人情報保護方針 | 個人情報取扱方針v2 | Claude Code → Noriaki |
| `/robots.txt` `/sitemap.xml` `/llms.txt` `/llms-full.txt` | 機械向け | 自動生成 | Claude Code |

## 5. AI対応仕様
### 5.1 文書構造
- 静的HTML（JS描画なし）、h1は1ページ1つ、見出し階層、短い段落、表、1ページ1テーマ
- 全ページに「最終更新日」を表示、記事は datePublished／dateModified
- 各ページの Markdown 版を同階層に出力（例 `/services/index.md`、Content-Type text/markdown）→ llms-full.txt からリンク

### 5.2 JSON-LD（全ページ共通 @graph ＋ ページ別）
- `ProfessionalService`: name「大倉社会保険労務士事務所」, alternateName「大倉社労士事務所（京都）」, url, logo, telephone, email, address(PostalAddress), areaServed(JP／全国), founder→Person, memberOf→京都太陽合同事務所(Organization, url taiyo-rna.jp), sameAs[taiyo-rna.jp/jimusho/, Googleビジネスプロフィール, 社労士会名簿（判明後）], knowsAbout[給与計算, 社会保険手続, 就業規則, 労務相談, 助成金, 業務自動化], priceRange, openingHoursSpecification
- `Person`: 大倉教晃, jobTitle「特定社会保険労務士」, alumniOf 京都大学, memberOf 京都府社会保険労務士会, worksFor→上記
- `Service` ×6（serviceType, provider, areaServed）
- `FAQPage`（/faq/）, `Article`（/news/*）, `BreadcrumbList`, `WebSite`
- 公開前に Google リッチリザルトテスト／Schema Validator で全ページ検証

### 5.3 クローラ制御（robots.txt）
- 全面 Allow。明示 Allow: Googlebot, Bingbot, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Applebot, Applebot-Extended, Amazonbot, Meta-ExternalAgent, CCBot
- `Sitemap: https://okura-sr.jp/sitemap-index.xml`
- Cloudflare 等の AI ボット既定ブロックは使わない（GitHub Pages は該当なし）

### 5.4 その他
- canonical、OGP／Twitter card（og:image は 1枚版PNGから生成）、favicon
- sitemap は @astrojs/sitemap、llms.txt／llms-full.txt はビルド時スクリプトで生成
- フォント: IBM Plex Sans JP（Google Fonts, display=swap）、画像は webp、JS はフォーム埋め込みのみ
- 公開後: Google Search Console 登録、Googleビジネスプロフィール（名称・住所・電話をサイトと完全一致）、社労士会名簿のURL欄更新

## 6. デザイン
- 方向性B「テック・クリーン」: 白基調 × ティール `#6CC1CC`、文字 `#1f2a30` 系、アクセントは控えめ
- 書体: IBM Plex Sans JP（本文）／IBM Plex Mono（数字・ラベル）
- 1枚版 `事務所案内_2026秋/..._1枚版_source.html` の CSS 部品（カード・数字・3カラム）を移植し、デッキ・A4・Web で統一
- モバイルファースト、本文最大幅 1040px、印刷スタイルあり、ダークモード不要

## 7. 運用
- 更新フロー: `src/content/**/*.md` を追記 → git push → GitHub Actions → 数分で公開
- 労務ニュース: 月次配信（kei定期タスク）の本文を `/news/YYYY-MM-<slug>.md` に転記（kei／Claude Code）→ Fable または Noriaki がレビュー → push
- リポジトリ構成（案）: `src/content/{pages,services,news,faq}/`, `src/layouts/Base.astro`, `src/components/{JsonLd,Header,Footer,Cta}.astro`, `public/robots.txt`, `scripts/gen-llms.mjs`, `.github/workflows/deploy.yml`, `public/CNAME`
- 顧問先データ・内部スキル・実名は一切リポジトリに入れない（public のため）

## 8. 役割分担
| 担当 | 役割 |
|---|---|
| Noriaki | ドメイン取得・DNS、GitHubリポジトリ作成、Google各種登録、写真提供、料金実単価・広告指針の最終確認、京都太陽サイトのリンク設置 |
| Fable（本セッション） | オーケストレーション、設計書、レビュー（表記ルール・料金・法的表現）、Noriakiへの報告 |
| Claude Code（Opus／Sonnet） | Astro実装、デプロイ設定、本文ドラフト、公開後の技術チェック（構造化データ・速度） |
| Codex／ChatGPT Business | FAQドラフト、広告指針調査、ニュース記事ドラフト |
| kei | 月次ニュース記事化、タスク進捗の巡回・リマインド |

## 9. 広告規律チェックリスト（2026-11-07 調査v1・詳細は `claude/事務所HP_広告指針_調査メモ_v1.md`）
調査結果の要点（未検証箇所は【推定】）:
- 社労士法に広告を直接規制する条文はない。実体は **連合会会則 第43条の3（報酬の書面明示）・第43条の4（誇大・虚偽広告の禁止、承諾なきメール広告の禁止）** と **法16条（信用失墜行為の禁止）**。会則原本は未確認（二次資料）
- 「業務広告に関する指針」という名称の文書は見つからず。京都会の広告規程・届出義務もオンライン未確認 → **京都会事務局に電話確認（Noriaki）**
- 行政書士法19条の2: 未登録で「行政書士」またはまぎらわしい表示は不可 → 「行政書士試験 合格（2011年）」は事実表示のみ、肩書欄に置かず「行政書士登録はしていません」と注記
- 京都太陽との連携表示: 法23条の2（非社労士からのあっせん・名義利用の禁止）に照らし、独立した事務所であることを明示し、紹介料の授受はしない

チェック項目:
- [ ] 料金目安: 税別と明記、「〜」「目安」表記、契約時は別途書面で報酬明示（会則43条の3）
- [ ] 「初回相談無料」: 条件（回数・時間）を明記、誇大表現なし
- [ ] 実績数値・比較・最上級表現（No.1／最安）は使わない
- [ ] 顧問先名・事例: 実名なし、業種＋規模のみ
- [ ] 資格表示: 特定社会保険労務士／行政書士試験合格（登録なし注記）
- [ ] 連携表示: 「京都太陽合同事務所内・独立した事務所」
- [ ] 京都会事務局への確認結果を反映（Noriaki）

## 10. マイルストーン（目安）
| M | 内容 | 目安 |
|---|---|---|
| M1 | 骨組み（全ページ雛形・JSON-LD・robots/llms）プレビュー | 11/9 |
| M2 | 本文・FAQ・料金・AI方針、広告指針照合 | 11/16 |
| M3 | ドメイン取得・DNS・公開 | 11/23 |
| M4 | GSC・GBP登録、京都太陽リンク、Notion公開ページ差替、署名・名刺URL | 11/30 |
