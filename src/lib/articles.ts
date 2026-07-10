import type { CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'articles'>;

/** URL d'un article — conserve le chemin WordPress /divers/<slug>.html */
export function articleUrl(a: Article): string {
  return a.data.path || `/divers/${a.data.slug}.html`;
}

/** Chemin d'une image localisée dans /public/media */
export function mediaSrc(id: string | null | undefined, size?: 800 | 400): string | null {
  if (!id) return null;
  return size ? `/media/${id}-${size}.webp` : `/media/${id}.webp`;
}

const FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
export function formatDate(d: Date): string {
  return FMT.format(d);
}
export function isoDate(d: Date): string {
  return d.toISOString();
}

/** Tri du plus récent au plus ancien */
export function byDateDesc(a: Article, b: Article): number {
  return b.data.date.getTime() - a.data.date.getTime();
}

/** Articles liés : même catégorie puis tags en commun */
export function related(all: Article[], current: Article, n = 3): Article[] {
  const scored = all
    .filter((a) => a.id !== current.id)
    .map((a) => {
      let s = 0;
      if (a.data.category === current.data.category) s += 3;
      const shared = a.data.tags.filter((t) => current.data.tags.includes(t)).length;
      s += shared;
      return { a, s };
    })
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || y.a.data.date.getTime() - x.a.data.date.getTime());
  const out = scored.slice(0, n).map((x) => x.a);
  if (out.length < n) {
    for (const a of all) {
      if (out.length >= n) break;
      if (a.id !== current.id && !out.includes(a)) out.push(a);
    }
  }
  return out;
}
