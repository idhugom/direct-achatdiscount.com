#!/usr/bin/env node
/**
 * Récupère TOUTES les métadonnées des articles WordPress source.
 * - slug (conservé 100% identique)
 * - lien canonique d'origine (/divers/<slug>.html) → conservé pour le SEO
 * - titre (décodé), extrait, date, image à la une
 * Écrit data/wp-posts.json
 *
 * Le CONTENU n'est PAS récupéré : il sera intégralement refait via OpenAI.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE = 'https://www.direct-achatdiscount.com';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; DAD-migrator/1.0)' };

function decodeEntities(s = '') {
  return s
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#171;|&laquo;/g, '«')
    .replace(/&#187;|&raquo;/g, '»')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#039;|&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
}
function stripHtml(s = '') { return decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(); }
function pathFromLink(link) {
  try { return new URL(link).pathname; } catch { return link; }
}

async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise(res => setTimeout(res, 1000 * 2 ** i));
    }
  }
}

async function main() {
  const perPage = 100;
  const first = await fetch(`${BASE}/wp-json/wp/v2/posts?per_page=1`, { headers: UA });
  const total = +first.headers.get('x-wp-total') || 0;
  const pages = Math.ceil(total / perPage);
  console.log(`Total posts: ${total} → ${pages} pages`);

  const out = [];
  for (let p = 1; p <= pages; p++) {
    const url = `${BASE}/wp-json/wp/v2/posts?per_page=${perPage}&page=${p}&_embed=1` +
      `&_fields=id,slug,link,date,modified,title,excerpt,categories,tags,featured_media,_links,_embedded`;
    const arr = await getJSON(url);
    for (const post of arr) {
      const fm = post?._embedded?.['wp:featuredmedia']?.[0];
      const sizes = fm?.media_details?.sizes || {};
      const terms = post?._embedded?.['wp:term'] || [];
      const cats = terms.flat().filter(t => t?.taxonomy === 'category').map(t => t.name);
      const tags = terms.flat().filter(t => t?.taxonomy === 'post_tag').map(t => t.name);
      out.push({
        id: post.id,
        slug: post.slug,
        path: pathFromLink(post.link),           // /divers/<slug>.html  (conservé)
        originalUrl: post.link,
        date: post.date,
        modified: post.modified,
        title: decodeEntities(post.title?.rendered || ''),
        excerpt: stripHtml(post.excerpt?.rendered || ''),
        wpCategories: cats,
        wpTags: tags,
        image: {
          full: sizes.full?.source_url || fm?.source_url || null,
          large: sizes.large?.source_url || sizes.full?.source_url || fm?.source_url || null,
          medium: sizes.medium?.source_url || sizes.medium_large?.source_url || null,
          width: fm?.media_details?.width || sizes.full?.width || null,
          height: fm?.media_details?.height || sizes.full?.height || null,
          alt: decodeEntities(fm?.alt_text || ''),
        },
      });
    }
    console.log(`  page ${p}/${pages} → ${out.length} posts`);
  }

  out.sort((a, b) => new Date(b.date) - new Date(a.date));
  await mkdir(resolve(ROOT, 'data'), { recursive: true });
  await writeFile(resolve(ROOT, 'data/wp-posts.json'), JSON.stringify(out, null, 2));
  const withImg = out.filter(p => p.image.full).length;
  console.log(`\n✅ ${out.length} posts → data/wp-posts.json  (${withImg} avec image à la une)`);
}
main().catch(e => { console.error(e); process.exit(1); });
