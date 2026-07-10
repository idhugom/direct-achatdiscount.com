// Génère TOUS les articles restants via la Responses API (le Batch API n'est pas
// disponible dans cet environnement : l'infra suffixe le modèle en `-batch`,
// variante inexistante). Résilient et reprenable : chaque article est écrit dès
// qu'il est prêt, les articles déjà présents sont sautés.
//
// Usage : node scripts/gen-all.mjs [limite] [concurrence]
import { readFile, writeFile, mkdir, readdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generateArticle } from './openai-client.mjs';
import { toArticleRecord } from './transform.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'src/content/articles');
const LIMIT = Number(process.argv[2]) || Infinity;      // "Infinity"/absent → tout
const CONCURRENCY = Number(process.argv[3]) || 6;

async function main() {
  const posts = JSON.parse(await readFile(resolve(ROOT, 'data/wp-posts.json'), 'utf8'));
  await mkdir(OUT, { recursive: true });
  const existing = new Set((await readdir(OUT)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)));
  const todo = posts.filter((p) => !existing.has(p.slug)).slice(0, LIMIT);
  console.log(`À générer : ${todo.length} (déjà présents : ${existing.size}) — concurrence ${CONCURRENCY}\n`);

  let done = 0, fail = 0;
  const failed = [];
  let idx = 0;
  async function worker() {
    while (idx < todo.length) {
      const post = todo[idx++];
      const file = resolve(OUT, `${post.slug}.json`);
      if (existsSync(file)) continue;
      try {
        const t = Date.now();
        const { parsed } = await generateArticle(post);
        // écriture atomique : fichier temporaire puis renommage (évite les fichiers partiels)
        const tmp = `${file}.tmp`;
        await writeFile(tmp, JSON.stringify(toArticleRecord(post, parsed), null, 2));
        await rename(tmp, file);
        done++;
        console.log(`  ✅ ${done + existing.size}/${posts.length}  ${post.slug.slice(0, 46)} (${((Date.now() - t) / 1000) | 0}s)`);
      } catch (e) {
        fail++; failed.push(post.id);
        console.error(`  ❌ ${post.slug.slice(0, 46)} → ${String(e.message).slice(0, 120)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (failed.length) await writeFile(resolve(ROOT, 'data/failed-ids.json'), JSON.stringify(failed));
  console.log(`\n✅ ${done} générés, ${fail} échecs. Total en base : ${existing.size + done}/${posts.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
