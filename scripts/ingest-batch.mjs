// Récupère les résultats du batch terminé et écrit les articles dans le content collection.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { toArticleRecord, extractJson } from './transform.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BATCH_DIR = resolve(ROOT, 'data/batch');
const OUT = resolve(ROOT, 'src/content/articles');
const KEY = process.env.OPENAI_API_KEY;

async function downloadFile(id) {
  const r = await fetch(`https://api.openai.com/v1/files/${id}/content`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error('download ' + id + ': ' + r.status);
  return await r.text();
}

async function main() {
  const state = JSON.parse(await readFile(resolve(BATCH_DIR, 'state.json'), 'utf8'));
  const map = JSON.parse(await readFile(resolve(BATCH_DIR, 'map.json'), 'utf8'));

  const meta = await (await fetch(`https://api.openai.com/v1/batches/${state.batchId}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  })).json();
  if (meta.status !== 'completed') {
    console.log(`Batch non terminé (statut : ${meta.status}). Réessayez plus tard.`);
    process.exit(0);
  }

  const outText = await downloadFile(meta.output_file_id);
  const lines = outText.split('\n').filter(Boolean);
  let ok = 0, fail = 0;
  for (const line of lines) {
    let rec;
    try { rec = JSON.parse(line); } catch { fail++; continue; }
    const post = map[rec.custom_id];
    if (!post) { fail++; continue; }
    try {
      const body = rec.response?.body;
      if (!body || rec.error) throw new Error(rec.error?.message || 'no body');
      const parsed = JSON.parse(extractJson(body));
      const record = toArticleRecord(post, parsed);
      await writeFile(resolve(OUT, `${post.slug}.json`), JSON.stringify(record, null, 2));
      ok++;
    } catch (e) {
      fail++;
      console.error(`  ❌ ${post.slug}: ${e.message}`);
    }
  }
  console.log(`\n✅ Ingestion : ${ok} articles écrits, ${fail} échecs.`);
  console.log('   Étapes suivantes : npm run wp:images && npm run build');
}
main().catch((e) => { console.error(e); process.exit(1); });
