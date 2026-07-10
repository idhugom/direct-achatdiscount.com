// Construit le fichier JSONL du Batch OpenAI pour tous les articles restant à générer.
// Chaque ligne = une requête Responses API (params imposés). custom_id = id du post (≤64 car).
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildRequestBody } from './openai-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BATCH_DIR = resolve(ROOT, 'data/batch');

async function main() {
  const limit = process.argv[2] ? parseInt(process.argv[2], 10) : Infinity;
  const posts = JSON.parse(await readFile(resolve(ROOT, 'data/wp-posts.json'), 'utf8'));

  // exclut les articles déjà générés
  let done = new Set();
  try {
    const files = await readdir(resolve(ROOT, 'src/content/articles'));
    for (const f of files) if (f.endsWith('.json')) {
      const a = JSON.parse(await readFile(resolve(ROOT, 'src/content/articles', f), 'utf8'));
      done.add(a.slug);
    }
  } catch { /* dossier vide */ }

  const todo = posts.filter((p) => !done.has(p.slug)).slice(0, limit);
  await mkdir(BATCH_DIR, { recursive: true });

  const lines = todo.map((post) => JSON.stringify({
    custom_id: String(post.id),
    method: 'POST',
    url: '/v1/responses',
    body: buildRequestBody(post),
  }));

  await writeFile(resolve(BATCH_DIR, 'requests.jsonl'), lines.join('\n') + '\n');
  // map custom_id (id) -> post (pour l'ingestion)
  const map = Object.fromEntries(todo.map((p) => [String(p.id), p]));
  await writeFile(resolve(BATCH_DIR, 'map.json'), JSON.stringify(map));

  console.log(`✅ ${todo.length} requêtes → data/batch/requests.jsonl (${done.size} déjà générés, exclus)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
