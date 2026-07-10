// Envoie le fichier JSONL à OpenAI et crée le batch (endpoint /v1/responses, fenêtre 24h).
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BATCH_DIR = resolve(ROOT, 'data/batch');
const KEY = process.env.OPENAI_API_KEY;

async function main() {
  const jsonl = await readFile(resolve(BATCH_DIR, 'requests.jsonl'));

  // 1) upload du fichier (purpose: batch)
  const form = new FormData();
  form.append('purpose', 'batch');
  form.append('file', new Blob([jsonl], { type: 'application/jsonl' }), 'requests.jsonl');
  const up = await fetch('https://api.openai.com/v1/files', {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form,
  });
  const file = await up.json();
  if (!up.ok) throw new Error('upload: ' + JSON.stringify(file));
  console.log('📤 fichier uploadé :', file.id);

  // 2) création du batch
  const cr = await fetch('https://api.openai.com/v1/batches', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_file_id: file.id, endpoint: '/v1/responses', completion_window: '24h' }),
  });
  const batch = await cr.json();
  if (!cr.ok) throw new Error('batch: ' + JSON.stringify(batch));

  await writeFile(resolve(BATCH_DIR, 'state.json'), JSON.stringify({ batchId: batch.id, inputFileId: file.id, createdAt: batch.created_at }, null, 2));
  console.log(`✅ Batch créé : ${batch.id} (statut : ${batch.status})`);
  console.log('   Suivi : npm run ai:batch:poll');
}
main().catch((e) => { console.error(e); process.exit(1); });
