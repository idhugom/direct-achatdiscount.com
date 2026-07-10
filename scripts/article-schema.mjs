// Schéma + prompt partagés : génération unitaire (Responses API) ET Batch API.
// Objectif : un contenu très qualitatif, complet, structuré, à réelle valeur ajoutée.

export const MODEL = 'gpt-5.6-terra';
export const GEN_PARAMS = {
  model: MODEL,
  reasoning: { effort: 'high' },          // reasoning effort : high (mode standard)
  text: { verbosity: 'high' },            // text verbosity : high
  max_output_tokens: 30000,
};

export const CATEGORY_SLUGS = [
  'maison', 'cuisine', 'auto-moto', 'tech', 'voyage',
  'argent', 'mode', 'loisirs', 'bien-etre', 'famille',
];

// ---- Schéma des blocs (structured outputs, strict) ----
const s = (props, required) => ({ type: 'object', additionalProperties: false, properties: props, required });
const arr = (items) => ({ type: 'array', items });
const str = { type: 'string' };
const nstr = { type: ['string', 'null'] };
const lit = (v) => ({ type: 'string', enum: [v] });   // discriminateur (structured outputs exige un type)

const blockVariants = [
  s({ type: lit('lead'), text: str }, ['type', 'text']),
  s({ type: lit('heading'), level: { type: 'integer', enum: [2, 3] }, text: str }, ['type', 'level', 'text']),
  s({ type: lit('paragraph'), html: str }, ['type', 'html']),
  s({ type: lit('callout'), variant: { type: 'string', enum: ['info', 'tip', 'warning', 'key', 'money'] }, title: nstr, html: str }, ['type', 'variant', 'title', 'html']),
  s({ type: lit('table'), caption: nstr, headers: arr(str), rows: arr(arr(str)), note: nstr }, ['type', 'caption', 'headers', 'rows', 'note']),
  s({ type: lit('comparison'), title: nstr,
      left: s({ title: str, points: arr(str) }, ['title', 'points']),
      right: s({ title: str, points: arr(str) }, ['title', 'points']) }, ['type', 'title', 'left', 'right']),
  s({ type: lit('proscons'), title: nstr, pros: arr(str), cons: arr(str) }, ['type', 'title', 'pros', 'cons']),
  s({ type: lit('faq'), title: nstr, items: arr(s({ q: str, a: str }, ['q', 'a'])) }, ['type', 'title', 'items']),
  s({ type: lit('list'), style: { type: 'string', enum: ['ul', 'ol', 'check'] }, title: nstr, items: arr(str) }, ['type', 'style', 'title', 'items']),
  s({ type: lit('steps'), title: nstr, items: arr(s({ title: str, text: str }, ['title', 'text'])) }, ['type', 'title', 'items']),
  s({ type: lit('quote'), text: str, author: nstr }, ['type', 'text', 'author']),
  s({ type: lit('key_takeaways'), title: nstr, items: arr(str) }, ['type', 'title', 'items']),
  s({ type: lit('stat'), items: arr(s({ value: str, label: str }, ['value', 'label'])) }, ['type', 'items']),
];

export const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    seo_title: str,
    meta_description: str,
    excerpt: str,
    hero_kicker: str,
    category: { type: 'string', enum: CATEGORY_SLUGS },
    tags: arr(str),
    reading_time: { type: 'integer' },
    blocks: arr({ anyOf: blockVariants }),
  },
  required: ['seo_title', 'meta_description', 'excerpt', 'hero_kicker', 'category', 'tags', 'reading_time', 'blocks'],
};

export const RESPONSE_FORMAT = {
  type: 'json_schema',
  name: 'article',
  strict: true,
  schema: ARTICLE_SCHEMA,
};

// ---- Prompt éditorial ----
export const DEVELOPER_PROMPT = `Tu es rédacteur en chef expert du magazine français « Direct Achat Discount », un média de guides d'achat et de conseils pratiques. Tu écris des articles de référence, complets et réellement utiles.

RÈGLES DE FOND
- Langue : français impeccable, vouvoiement (« vous »). Ton clair, expert, direct, chaleureux, zéro remplissage, zéro blabla marketing.
- À partir du TITRE fourni (qui est le sujet), tu rédiges un article ENTIÈREMENT ORIGINAL. Tu ne disposes pas du texte source et tu ne dois pas le supposer : tu traites le sujet en profondeur avec ton expertise.
- L'article doit répondre à TOUTES les intentions de recherche derrière le sujet : définition, critères de choix, comparaison des options, prix/budget (en ordres de grandeur, jamais de prix précis inventés), erreurs à éviter, conseils d'usage/entretien, cas d'usage, alternatives.
- Apporte une VRAIE valeur ajoutée : conseils actionnables, points de vigilance, arbitrages concrets. Pas de généralités creuses.
- Honnêteté : n'invente JAMAIS de statistiques chiffrées précises, d'études, de marques ou de prix exacts présentés comme des faits. Utilise des fourchettes, des ordres de grandeur et des repères qualitatifs. Reste evergreen (évite les dates trop précises).
- Longueur : substantielle et complète (vise ~1700 à 2600 mots de contenu utile).

STRUCTURE (via les blocs)
- Commence par 1 bloc "lead" (chapô accrocheur de 2–3 phrases qui pose l'enjeu).
- Alterne "heading" (level 2, et level 3 pour les sous-parties) et "paragraph". 5 à 8 sections H2 minimum.
- Intègre systématiquement, quand c'est pertinent pour le sujet :
  • au moins 1 "table" (comparatif de critères, budget, caractéristiques…) avec en-têtes clairs ;
  • au moins 1 "callout" de mise en avant (variant tip/key/warning/money/info) ;
  • 1 "key_takeaways" (3–5 points essentiels), placé tôt (juste après le lead ou en 2e position) ;
  • 1 "comparison" en 2 colonnes SI le sujet oppose deux options (sinon ne pas forcer) ;
  • 1 "proscons" (avantages/inconvénients) SI pertinent ;
  • des "list" (style check pour les conseils) et éventuellement "steps" pour un mode d'emploi ;
  • 1 "stat" (2 à 4 repères marquants) si tu peux donner des ordres de grandeur crédibles et généraux ;
- Termine TOUJOURS par 1 bloc "faq" de 4 à 6 questions/réponses réellement utiles (questions que se pose l'acheteur).
- Le HTML autorisé dans les champs html/points/items/réponses : uniquement <strong>, <em>, <a href>. Pas de titres ni de listes en HTML brut (utilise les blocs dédiés).

MÉTA
- seo_title : accrocheur, ≤ 60 caractères si possible, contient le mot-clé principal.
- meta_description : 150–160 caractères, incitative.
- excerpt : résumé éditorial de ~160 caractères.
- hero_kicker : 2–4 mots percutants (surtitre).
- category : choisis LA rubrique la plus juste parmi la liste imposée.
- tags : 4 à 6 mots-clés pertinents (minuscules).
- reading_time : estimation en minutes (entier).

Rends UNIQUEMENT l'objet JSON conforme au schéma.`;

export function userPrompt(post) {
  return `TITRE (sujet de l'article) : « ${post.title} »
SLUG (pour info, ne pas modifier) : ${post.slug}
Rédige l'article complet, structuré et à forte valeur ajoutée sur ce sujet.`;
}
