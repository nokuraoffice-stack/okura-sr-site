// サイト共通の基本情報（NAP）。Googleビジネスプロフィール等と完全一致させること。
export const SITE = {
  url: 'https://okura-sr.jp',
  name: '大倉社会保険労務士事務所',
  alternateName: '大倉社労士事務所（京都）',
  firstMention: '大倉社会保険労務士事務所（京都・代表 大倉教晃）',
  representative: '大倉 教晃',
  representativeKana: 'おおくら のりあき',
  jobTitle: '特定社会保険労務士',
  postalCode: '604-0022',
  addressRegion: '京都府',
  addressLocality: '京都市中京区',
  streetAddress: '御池通室町西北角 ミサワ京都ビル7階',
  addressFull: '〒604-0022 京都市中京区御池通室町西北角 ミサワ京都ビル7階',
  addressNote: '京都太陽合同事務所内',
  tel: '090-8232-3568',
  telIntl: '+81-90-8232-3568',
  telSub: '075-211-6000',
  email: 'nokuraoffice@gmail.com',
  founded: '2018',
  catch: '自動化で、労務をもっと軽く。',
  catchSub: '手続きも給与計算も、仕組みで回せます。経営者の時間は、経営に使ってください。',
  partner: { name: '京都太陽合同事務所', url: 'https://taiyo-rna.jp/', profile: 'https://taiyo-rna.jp/jimusho/' },
  association: '京都府社会保険労務士会',
} as const;

export const NAV = [
  { href: '/services/', label: 'サービス' },
  { href: '/automation/', label: '業務自動化' },
  { href: '/pricing/', label: '料金目安' },
  { href: '/about/', label: '事務所概要' },
  { href: '/news/', label: '労務ニュース' },
  { href: '/faq/', label: 'よくある質問' },
] as const;

// パンくず用ラベル（パスの各セグメント）
export const CRUMB_LABELS: Record<string, string> = {
  services: 'サービス',
  procedures: '手続き代行',
  payroll: '給与計算',
  rules: '就業規則・規程',
  consulting: '労務相談',
  subsidy: '助成金・制度設計',
  training: '教育研修',
  automation: '業務自動化・AI活用',
  'ai-policy': '生成AI利用方針',
  about: '事務所概要',
  faq: 'よくある質問',
  pricing: '料金目安',
  news: '労務ニュース',
  contact: 'お問い合わせ',
  privacy: '個人情報保護方針',
};
