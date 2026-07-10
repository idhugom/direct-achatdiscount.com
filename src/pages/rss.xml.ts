import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { articleUrl, byDateDesc } from '../lib/articles';
import { getCategory } from '../lib/categories';
import { SITE } from '../lib/site';

export async function GET(context: APIContext) {
  const all = (await getCollection('articles')).sort(byDateDesc).slice(0, 50);
  return rss({
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: all.map((a) => ({
      title: a.data.title,
      description: a.data.excerpt,
      link: articleUrl(a),
      pubDate: a.data.date,
      categories: [getCategory(a.data.category).name, ...a.data.tags],
    })),
    customData: `<language>fr-fr</language>`,
  });
}
