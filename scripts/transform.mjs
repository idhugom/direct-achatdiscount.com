// Transforme (post WordPress + sortie OpenAI) → enregistrement d'article conforme au content collection.
import { CATEGORY_SLUGS } from './article-schema.mjs';

export function slugify(str = '') {
  return str
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'section';
}

// Nettoie les null → undefined (zod .optional) et assigne des id d'ancre uniques aux headings.
function cleanBlocks(blocks) {
  const used = new Set();
  const out = [];
  for (const raw of blocks || []) {
    const b = { ...raw };
    for (const k of Object.keys(b)) if (b[k] === null) delete b[k];
    if (b.type === 'heading') {
      let id = slugify(b.text);
      let n = 2;
      while (used.has(id)) id = `${slugify(b.text)}-${n++}`;
      used.add(id);
      b.id = id;
      b.level = b.level === 3 ? 3 : 2;
    }
    out.push(b);
  }
  return out;
}

export function toArticleRecord(post, gen) {
  const category = CATEGORY_SLUGS.includes(gen.category) ? gen.category : 'loisirs';
  const hasImg = !!(post.image && post.image.full);
  return {
    title: post.title,
    slug: post.slug,
    path: post.path || `/divers/${post.slug}.html`,
    category,
    tags: (gen.tags || []).map((t) => String(t).toLowerCase()).slice(0, 8),
    excerpt: (gen.excerpt || post.excerpt || '').trim(),
    metaDescription: (gen.meta_description || gen.excerpt || post.excerpt || '').trim(),
    seoTitle: (gen.seo_title || post.title).trim(),
    heroKicker: (gen.hero_kicker || '').trim(),
    readingTime: Number.isFinite(gen.reading_time) ? gen.reading_time : 7,
    date: post.date,
    image: {
      id: hasImg ? String(post.id) : null,
      alt: post.image?.alt || post.title,
      width: post.image?.width || null,
      height: post.image?.height || null,
    },
    featured: false,
    sources: [],
    blocks: cleanBlocks(gen.blocks),
  };
}

// Extrait le texte JSON d'une réponse Responses API (format output).
export function extractJson(responseBody) {
  // Responses API : output_text agrégé, ou parcours des output items.
  if (typeof responseBody.output_text === 'string' && responseBody.output_text.trim()) {
    return responseBody.output_text;
  }
  const parts = [];
  for (const item of responseBody.output || []) {
    if (item.type === 'message') {
      for (const c of item.content || []) {
        if (c.type === 'output_text' && typeof c.text === 'string') parts.push(c.text);
      }
    }
  }
  return parts.join('');
}
