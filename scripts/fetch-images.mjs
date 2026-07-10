// Télécharge les images à la une des articles présents dans le content collection,
// les optimise en WebP (2 largeurs : 1600 et 800) dans public/media/.
import { readFile, readdir, mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MEDIA = resolve(ROOT, 'public/media');
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; DAD-migrator/1.0)' };
const CONCURRENCY = 5;

const exists = (p) => access(p).then(() => true).catch(() => false);

async function fetchBuf(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 1000 * 2 ** i));
    }
  }
}

async function pool(items, worker, c) {
  let i = 0;
  await Promise.all(Array.from({ length: c }, async () => {
    while (i < items.length) { const idx = i++; await worker(items[idx]); }
  }));
}

async function main() {
  await mkdir(MEDIA, { recursive: true });
  const posts = JSON.parse(await readFile(resolve(ROOT, 'data/wp-posts.json'), 'utf8'));
  const byId = new Map(posts.map((p) => [String(p.id), p]));

  // ids d'images référencés par les articles générés
  const dir = resolve(ROOT, 'src/content/articles');
  let files = [];
  try { files = (await readdir(dir)).filter((f) => f.endsWith('.json')); } catch { /* vide */ }
  const ids = new Set();
  for (const f of files) {
    const a = JSON.parse(await readFile(resolve(dir, f), 'utf8'));
    if (a.image?.id) ids.add(String(a.image.id));
  }
  const list = [...ids];
  console.log(`${list.length} images à traiter…`);

  let ok = 0, skip = 0, fail = 0;
  await pool(list, async (id) => {
    const post = byId.get(id);
    const src = post?.image?.large || post?.image?.full;
    const full = resolve(MEDIA, `${id}.webp`);
    if (!src) { fail++; return; }
    if (await exists(full)) { skip++; return; }
    try {
      const buf = await fetchBuf(src);
      const base = sharp(buf, { failOn: 'none' }).rotate();
      await base.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(full);
      await base.clone().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 78 }).toFile(resolve(MEDIA, `${id}-800.webp`));
      ok++;
      if (ok % 10 === 0) console.log(`  … ${ok} ok`);
    } catch (e) {
      fail++;
      console.error(`  ❌ ${id}: ${e.message}`);
    }
  }, CONCURRENCY);

  console.log(`\n✅ images : ${ok} téléchargées, ${skip} déjà présentes, ${fail} échecs → public/media/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
