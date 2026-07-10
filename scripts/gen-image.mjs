// Génère des images « ultra réalistes » via l'API OpenAI (gpt-image-2) pour les
// articles sans image à la une, puis les optimise en WebP dans public/media/.
//
// Usage :
//   node scripts/gen-image.mjs --missing         # tous les articles sans image
//   node scripts/gen-image.mjs <slug> [<slug>…]  # articles ciblés
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ART = resolve(ROOT, 'src/content/articles');
const MEDIA = resolve(ROOT, 'public/media');
const KEY = process.env.OPENAI_API_KEY;

const IMAGE_PARAMS = { model: 'gpt-image-2', size: '1536x1024', quality: 'medium' };

function prompt(title) {
  return `Photographie éditoriale ultra réaliste illustrant le sujet : « ${title} ». ` +
    `Rendu photo authentique, lumière naturelle douce, mise au point nette, composition magazine, ` +
    `couleurs riches et vives, cadrage large, sans texte, sans logo, sans watermark, sans visage reconnaissable.`;
}

async function genOne(title) {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...IMAGE_PARAMS, prompt: prompt(title) }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(d).slice(0, 300));
  const b64 = d.data?.[0]?.b64_json;
  if (!b64) throw new Error('pas d’image renvoyée');
  return Buffer.from(b64, 'base64');
}

async function main() {
  await mkdir(MEDIA, { recursive: true });
  const args = process.argv.slice(2);
  const files = (await readdir(ART)).filter((f) => f.endsWith('.json'));
  let targets = [];
  if (args.includes('--missing')) {
    for (const f of files) {
      const a = JSON.parse(await readFile(resolve(ART, f), 'utf8'));
      if (!a.image?.id) targets.push({ file: f, a });
    }
  } else {
    for (const slug of args) {
      const f = `${slug}.json`;
      if (files.includes(f)) targets.push({ file: f, a: JSON.parse(await readFile(resolve(ART, f), 'utf8')) });
    }
  }
  console.log(`${targets.length} image(s) à générer (gpt-image-2, 1536x1024, medium)…`);

  for (const { file, a } of targets) {
    try {
      const buf = await genOne(a.title);
      const id = `gen-${a.slug}`.slice(0, 80);
      const base = sharp(buf);
      await base.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(resolve(MEDIA, `${id}.webp`));
      await base.clone().resize({ width: 800 }).webp({ quality: 78 }).toFile(resolve(MEDIA, `${id}-800.webp`));
      a.image = { id, alt: a.title, width: 1536, height: 1024 };
      await writeFile(resolve(ART, file), JSON.stringify(a, null, 2));
      console.log(`  ✅ ${a.slug}`);
    } catch (e) {
      console.error(`  ❌ ${a.slug}: ${e.message}`);
    }
  }
  console.log('Terminé. Pensez à rebuild : npm run build');
}
main().catch((e) => { console.error(e); process.exit(1); });
