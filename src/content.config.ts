import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    no: z.string(),            // 表示番号 01〜06
    order: z.number(),
    group: z.string(),         // 1枚版の3カラム区分
    summary: z.string(),       // 一行説明（一覧・meta description）
    serviceType: z.string(),   // JSON-LD Service.serviceType
    updated: z.coerce.date(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    datePublished: z.coerce.date(),
    dateModified: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: z.object({
    question: z.string(),
    order: z.number(),
    category: z.string().default('全般'),
    isDraft: z.boolean().default(false), // true なら「（ドラフト）」表示
  }),
});

export const collections = { services, news, faq };
