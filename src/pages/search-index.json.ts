import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getCategory } from '../lib/categories';
import { articleUrl } from '../lib/articles';

export const GET: APIRoute = async () => {
  const all = await getCollection('articles');
  const index = all
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((a) => {
      const cat = getCategory(a.data.category);
      return {
        t: a.data.title,
        e: a.data.excerpt,
        u: articleUrl(a),
        c: cat.short,
        cs: cat.slug,
        col: cat.color,
        tg: a.data.tags,
        img: a.data.image.id ? `/media/${a.data.image.id}-800.webp` : null,
      };
    });
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
  });
};
