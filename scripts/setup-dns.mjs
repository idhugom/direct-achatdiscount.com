// Configure le DNS Cloudflare + la redirection apex → www POUR LA BASCULE EN PROD.
// À lancer UNIQUEMENT quand la préprod est validée et que vous déléguez les DNS à Cloudflare.
//   node scripts/setup-dns.mjs
// Idempotent : ne recrée pas ce qui existe déjà.
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const ZONE_NAME = 'direct-achatdiscount.com';
const APEX = ZONE_NAME;
const WWW = `www.${ZONE_NAME}`;
const PAGES_TARGET = 'direct-achatdiscount.pages.dev';

const api = async (path, opts = {}) => {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const d = await r.json();
  if (!d.success) throw new Error(`${path} → ${JSON.stringify(d.errors)}`);
  return d.result;
};

async function main() {
  const zones = await api(`/zones?name=${ZONE_NAME}`);
  if (!zones.length) throw new Error('Zone introuvable');
  const zone = zones[0];
  console.log(`Zone ${zone.name} (${zone.status})`);
  if (zone.status !== 'active') {
    console.log('⚠️  La zone est en attente : déléguez les nameservers Cloudflare chez votre registrar :');
    console.log('   ' + (zone.name_servers || []).join('  '));
  }

  const records = await api(`/zones/${zone.id}/dns_records?per_page=200`);
  const has = (type, name) => records.find((r) => r.type === type && r.name === name);

  // www → Pages (proxied)
  if (!has('CNAME', WWW)) {
    await api(`/zones/${zone.id}/dns_records`, { method: 'POST', body: JSON.stringify({
      type: 'CNAME', name: 'www', content: PAGES_TARGET, proxied: true, comment: 'Site (Cloudflare Pages)',
    }) });
    console.log(`✅ CNAME ${WWW} → ${PAGES_TARGET}`);
  } else console.log(`↷ CNAME ${WWW} déjà présent`);

  // apex → Pages (CNAME aplati à la racine). La redirection apex → www est
  // assurée par la Pages Function functions/_middleware.js (301), sans dépendre
  // de la permission « Rulesets » du token.
  if (!has('A', APEX) && !has('CNAME', APEX)) {
    await api(`/zones/${zone.id}/dns_records`, { method: 'POST', body: JSON.stringify({
      type: 'CNAME', name: '@', content: PAGES_TARGET, proxied: true, comment: 'Apex → Pages (redirection vers www via Function)',
    }) });
    console.log(`✅ CNAME ${APEX} → ${PAGES_TARGET}`);
  } else console.log(`↷ Enregistrement apex déjà présent`);

  console.log('\nℹ️  Pensez à ajouter les deux domaines au projet Pages (www + apex) :');
  console.log('   ils sont servis par Pages ; la Function redirige l’apex vers www en 301.');
  console.log('\n🎉 DNS prêts. Le site répond sur www ; l’apex redirige vers www.');
}
main().catch((e) => { console.error('❌', e.message); process.exit(1); });
