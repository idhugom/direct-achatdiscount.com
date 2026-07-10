// Affiche l'état d'avancement du batch en cours.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const KEY = process.env.OPENAI_API_KEY;

async function main() {
  const state = JSON.parse(await readFile(resolve(ROOT, 'data/batch/state.json'), 'utf8'));
  const r = await fetch(`https://api.openai.com/v1/batches/${state.batchId}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  const b = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(b));
  const c = b.request_counts || {};
  console.log(`Batch ${b.id}`);
  console.log(`  statut        : ${b.status}`);
  console.log(`  requêtes      : ${c.completed || 0}/${c.total || 0} terminées, ${c.failed || 0} échecs`);
  console.log(`  fichier sortie: ${b.output_file_id || '—'}`);
  console.log(`  fichier erreur: ${b.error_file_id || '—'}`);
  if (b.status === 'completed') console.log('\n→ Prêt à ingérer : npm run ai:batch:ingest');
}
main().catch((e) => { console.error(e); process.exit(1); });
