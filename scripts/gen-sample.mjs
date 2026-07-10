// Génère un échantillon d'articles diversifié (Responses API) pour peupler la préprod.
// Usage : node scripts/gen-sample.mjs [N]   (N articles, défaut 16)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generateArticle } from './openai-client.mjs';
import { toArticleRecord } from './transform.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'src/content/articles');
const N = parseInt(process.argv[2] || process.env.SAMPLE_N || '16', 10);
const CONCURRENCY = 3;

// Buckets de mots-clés → assure une variété thématique dans l'échantillon.
const BUCKETS = [
  ['maison', /matelas|isolation|déco|meuble|maison|rangement|jardin|osier|acariens|literie/i],
  ['cuisine', /foie gras|congeler|conserver|cuisine|recette|couteau|cave|vin|café|bocal/i],
  ['auto-moto', /moto|tesla|voiture|attelage|amortisseur|pneu|scooter|casque|vintage/i],
  ['tech', /microsoft|licence|montre connectée|gps|logiciel|impression|clavier|police|dyslex/i],
  ['voyage', /séjour|voyage|guadeloupe|plongée|île|dauphins|annecy|aventure|escapade/i],
  ['argent', /assurance|mutuelle|crédit|casino|budget|tarif|économie/i],
  ['mode', /boutons de manchette|maillot|sac|montre|bijou|style|mode|vêtement/i],
  ['loisirs', /cornhole|jeu|sport|jet ski|bateau|foot|loisir|randonnée/i],
];

function pickDiverse(posts, n) {
  const withImg = posts.filter((p) => p.image?.full);
  const chosen = [];
  const seen = new Set();
  const perBucket = Math.max(1, Math.ceil(n / BUCKETS.length));
  for (const [, re] of BUCKETS) {
    let c = 0;
    for (const p of withImg) {
      if (c >= perBucket || chosen.length >= n) break;
      if (seen.has(p.id)) continue;
      if (re.test(p.title)) { chosen.push(p); seen.add(p.id); c++; }
    }
  }
  // complète avec les plus récents si besoin
  for (const p of withImg) {
    if (chosen.length >= n) break;
    if (!seen.has(p.id)) { chosen.push(p); seen.add(p.id); }
  }
  return chosen.slice(0, n);
}

async function pool(items, worker, concurrency) {
  const results = [];
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  return results;
}

async function main() {
  const posts = JSON.parse(await readFile(resolve(ROOT, 'data/wp-posts.json'), 'utf8'));
  await mkdir(OUT, { recursive: true });
  const selected = pickDiverse(posts, N);
  console.log(`Génération de ${selected.length} articles (concurrence ${CONCURRENCY})…\n`);

  let ok = 0, fail = 0;
  await pool(selected, async (post, idx) => {
    const file = resolve(OUT, `${post.slug}.json`);
    if (existsSync(file)) { console.log(`  ↷ déjà présent : ${post.slug}`); ok++; return; }
    try {
      const t = Date.now();
      const { parsed } = await generateArticle(post);
      const record = toArticleRecord(post, parsed);
      if (idx < 3) record.featured = true;
      await writeFile(file, JSON.stringify(record, null, 2));
      ok++;
      console.log(`  ✅ [${ok}/${selected.length}] ${post.slug.slice(0, 50)}… (${((Date.now() - t) / 1000) | 0}s, ${record.blocks.length} blocs)`);
    } catch (e) {
      fail++;
      console.error(`  ❌ ${post.slug.slice(0, 50)} → ${e.message}`);
    }
  }, CONCURRENCY);

  console.log(`\n✅ ${ok} générés, ${fail} échecs → src/content/articles/`);
  // liste des ids d'images à télécharger
  const ids = selected.map((p) => p.id);
  await writeFile(resolve(ROOT, 'data/sample-ids.json'), JSON.stringify(ids));
}
main().catch((e) => { console.error(e); process.exit(1); });
