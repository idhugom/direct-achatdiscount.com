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

  // apex → adresse fictive proxifiée (support de la redirection)
  if (!has('A', APEX) && !has('CNAME', APEX)) {
    await api(`/zones/${zone.id}/dns_records`, { method: 'POST', body: JSON.stringify({
      type: 'A', name: '@', content: '192.0.2.1', proxied: true, comment: 'Redirection apex → www',
    }) });
    console.log(`✅ A ${APEX} → 192.0.2.1 (proxifié)`);
  } else console.log(`↷ Enregistrement apex déjà présent`);

  // Règle de redirection apex → www (single redirect dynamique)
  const phase = `/zones/${zone.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`;
  let ruleset;
  try { ruleset = await api(phase); } catch { ruleset = null; }
  const rules = (ruleset?.rules || []).filter((r) => r.description !== 'apex → www');
  rules.push({
    description: 'apex → www',
    expression: `(http.host eq "${APEX}")`,
    action: 'redirect',
    action_parameters: {
      from_value: {
        status_code: 301,
        target_url: { expression: `concat("https://${WWW}", http.request.uri.path)` },
        preserve_query_string: true,
      },
    },
  });
  await api(phase, { method: 'PUT', body: JSON.stringify({
    name: 'default', phase: 'http_request_dynamic_redirect', rules,
  }) });
  console.log('✅ Redirection 301 apex → www configurée');

  console.log('\n🎉 DNS + redirection prêts. Le site répondra dès que les DNS seront actifs.');
}
main().catch((e) => { console.error('❌', e.message); process.exit(1); });
