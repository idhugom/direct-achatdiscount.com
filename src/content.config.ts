import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORY_SLUGS } from './lib/categories';

// Blocs de contenu riches — rendus par des composants dédiés.
const block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('lead'), text: z.string() }),
  z.object({ type: z.literal('heading'), level: z.number().int().min(2).max(3).default(2), text: z.string(), id: z.string() }),
  z.object({ type: z.literal('paragraph'), html: z.string() }),
  z.object({
    type: z.literal('callout'),
    variant: z.enum(['info', 'tip', 'warning', 'key', 'money']).default('info'),
    title: z.string().optional(),
    html: z.string(),
  }),
  z.object({
    type: z.literal('table'),
    caption: z.string().optional(),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal('comparison'),
    title: z.string().optional(),
    left: z.object({ title: z.string(), points: z.array(z.string()) }),
    right: z.object({ title: z.string(), points: z.array(z.string()) }),
  }),
  z.object({
    type: z.literal('proscons'),
    title: z.string().optional(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
  }),
  z.object({
    type: z.literal('faq'),
    title: z.string().optional(),
    items: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
  z.object({
    type: z.literal('list'),
    style: z.enum(['ul', 'ol', 'check']).default('ul'),
    title: z.string().optional(),
    items: z.array(z.string()),
  }),
  z.object({
    type: z.literal('steps'),
    title: z.string().optional(),
    items: z.array(z.object({ title: z.string(), text: z.string() })),
  }),
  z.object({ type: z.literal('quote'), text: z.string(), author: z.string().optional() }),
  z.object({ type: z.literal('key_takeaways'), title: z.string().optional(), items: z.array(z.string()) }),
  z.object({ type: z.literal('stat'), items: z.array(z.object({ value: z.string(), label: z.string() })) }),
]);

const articles = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),                       // 100 % identique à WordPress
    path: z.string(),                       // URL canonique conservée : /divers/<slug>.html
    category: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
    tags: z.array(z.string()).default([]),
    excerpt: z.string(),
    metaDescription: z.string(),
    seoTitle: z.string().optional(),
    heroKicker: z.string().optional(),
    readingTime: z.number().int().default(6),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    image: z.object({
      id: z.string().nullable(),            // fichier /media/<id>.webp
      alt: z.string().default(''),
      width: z.number().nullable().default(null),
      height: z.number().nullable().default(null),
    }),
    featured: z.boolean().default(false),
    sources: z.array(z.object({ label: z.string(), url: z.string().optional() })).default([]),
    blocks: z.array(block),
  }),
});

export const collections = { articles };
