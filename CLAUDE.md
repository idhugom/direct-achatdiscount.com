# CLAUDE.md — Direct Achat Discount

> Manuel d'intervention pour Claude Code sur ce dépôt.
> Ce fichier **documente et complète** l'état actuel du projet — il ne change rien au site en place.
> À lire **entièrement** au début de chaque session avant toute modification.

---

## 🔴 Règles d'intervention (non négociables)

### Règle n°1 — TOUJOURS travailler sur `main`
Toute session — développement, rédaction, amélioration, correction, contenu, infra — se fait **directement sur la branche `main`** de GitHub.
**Ne JAMAIS créer de branche** ni travailler sur une branche secondaire. Commit + push **sur `main`**.
> Cloudflare Pages est branché sur `main` : chaque push sur `main` déclenche le build et le déploiement (`npm run build` → `dist/`). C'est la branche de production.

### Règle n°2 — Toujours en qualité optimale
Se placer **systématiquement en qualité maximale** du modèle (le réglage le plus intelligent / le plus performant) pour **chaque** intervention : c'est Claude, en session, avec son meilleur raisonnement, qui produit le travail.
**Seule exception :** la génération d'image OpenAI reste en `quality: "medium"` (voir §6).

### Règle n°3 — Clés API / tokens : depuis l'environnement, jamais en dur
Les clés et tokens nécessaires sont **fournis par l'environnement cloud de Claude Code** (variables d'environnement, `process.env`). On les **récupère depuis l'environnement** — on ne les redemande pas, on ne les invente pas, et on ne les écrit **jamais en dur** dans le code ni dans un commit.

Variables attendues dans l'environnement :

| Variable | Usage |
|---|---|
| `OPENAI_API_KEY` | Génération des photos (et, historiquement, du texte) |
| `OPENAI_IMAGE_MODEL` | Modèle image (défaut projet : `gpt-image-2`) |
| `OPENAI_TEXT_MODEL` | Modèle texte du pipeline historique (défaut : `gpt-5.6-terra`) |
| `CLOUDFLARE_API_TOKEN` | Déploiement Pages / DNS (scripts d'infra uniquement) |
| `CLOUDFLARE_ACCOUNT_ID` | Compte Cloudflare (scripts d'infra uniquement) |

Le fichier `.env.example` liste ces clés à titre indicatif ; `.env` est ignoré par git. Si un script lit une valeur en dur (ex. `MODEL` dans `scripts/article-schema.mjs`), **préférer la variable d'environnement quand elle est présente** (`process.env.OPENAI_TEXT_MODEL || 'gpt-5.6-terra'`), sans jamais committer de secret.

---

## Le projet en bref (technique)

**Direct Achat Discount** — *« le magazine des achats malins »*. Média éditorial de **guides d'achat, comparatifs, astuces et bons plans** qui a remplacé un ancien WordPress.

- **Stack :** [Astro 5](https://astro.build) — build **statique** → `dist/`, déployé sur **Cloudflare Pages**. Zéro CMS, zéro base à l'exécution : des pages HTML pures et ultra-rapides.
- **Contenu :** 1 fichier **JSON par article** dans `src/content/articles/` (le nom du fichier = le `slug`). Schéma typé + validé par Zod dans `src/content.config.ts`.
- **URLs conservées à 100 %** depuis WordPress : chaque article vit à `/divers/<slug>.html` (champ `path`). **Ne jamais changer un slug ni un `path` existant** → ce serait une perte SEO directe.
- **~900 articles** publiés, 10 rubriques couleur (voir plus bas).
- **Images :** WebP optimisées (sharp), 2 largeurs, dans `public/media/`.

### Arborescence utile
```
src/
  content/articles/     # 1 JSON par article (slug = nom de fichier) ← le contenu vit ici
  content.config.ts     # schéma Zod des articles + blocs riches (source de vérité)
  lib/
    categories.ts       # les 10 rubriques (slug, nom, couleur, emoji) ← taxonomie
    site.ts             # nom, tagline, description, nav, ticker
    articles.ts         # helpers de listing/tri
  components/           # Hero, Header, Footer, ArticleCard, BlockRenderer…
  layouts/Base.astro    # shell HTML, SEO, JSON-LD
  pages/
    divers/[slug].astro # rendu article — URL identique à WordPress
    rubrique/[cat]/     # pages rubriques
    articles/           # liste paginée
    recherche/          # recherche instantanée côté client
scripts/                # récupération WP, génération OpenAI, images
  article-schema.mjs    # schéma + prompt historiques du pipeline OpenAI texte
  gen-image.mjs         # génération des photos OpenAI (gpt-image-2) → WebP
public/media/           # images optimisées servies telles quelles
data/wp-posts.json      # métadonnées source (slug, titre, image, date)
```

### Commandes
```bash
npm install
npm run dev                 # serveur de dev
npm run build               # build de production → dist/
npm run preview             # prévisualise dist/
node scripts/gen-image.mjs --missing        # génère la photo des articles sans image
node scripts/gen-image.mjs <slug> [<slug>…] # (re)génère la photo d'articles ciblés
```

### Déploiement
Push sur `main` → build Cloudflare Pages automatique. Rien d'autre à faire. Vérifier après coup que le build passe (pas d'erreur de schéma Zod : un JSON d'article invalide casse le build).

---

## ✍️ Règles de rédaction

### 0. Règles d'or (prioritaires, toujours applicables)

1. **Rédaction par Claude, pas par l'API.** Le contenu d'un article est **écrit par Claude, en session**, avec son meilleur raisonnement — **pas** par le pipeline OpenAI texte. Désormais c'est Claude qui rédige. **Seules les images** passent par OpenAI (§6). *(Les scripts `ai:*` OpenAI texte restent dans le dépôt pour référence historique, mais ne sont plus la voie de rédaction.)*
2. **Anti-cannibalisation.** Sur sujet libre, **vérifier d'abord l'existant** : chaque nouvel article doit porter sur un angle **différent** de ce qui est déjà publié (voir §3).
3. **Qualité avant tout.** Chaque article doit apporter **la meilleure information disponible** sur son sujet : des détails en plus, et — selon la pertinence — des éléments riches (tableau, comparatif, astuces, FAQ, citation, chiffres…). Ce sont des **exemples**, pas une check-list à cocher entièrement (voir §4).
4. **Photo OpenAI obligatoire.** **Jamais** publier un article sans visuel. Toujours une vraie **photo à la une générée par OpenAI**, « photo généraliste sur le thème, ultra réaliste », **avant** publication (voir §6).
5. **Liens internes.** Ajouter **1 à 4 liens internes** par article vers d'autres pages du site (voir §5).

### 1. Le site en bref (ligne éditoriale)

Direct Achat Discount aide le lecteur à **choisir mieux, dépenser moins et vivre plus malin**. On décrypte ce que les gens achètent et utilisent au quotidien : produits, équipements, services, petites décisions de vie.

- **Promesse :** des guides d'achat et des conseils pratiques **sans langue de bois**, indépendants, réellement utiles.
- **Registre :** grand public, concret, orienté décision (« qu'est-ce que j'achète, à quel prix, pour quel usage »).
- **Format type :** un article = un sujet traité **en profondeur et evergreen** (qui ne se périme pas), avec critères de choix, comparaisons, budget en ordres de grandeur, erreurs à éviter, entretien/usage, FAQ.
- **Ce qu'on ne fait pas :** du remplissage, du blabla marketing, des prix précis inventés, des « fausses stats » présentées comme des faits, des contenus qui se périment vite.

### 2. Identité & ton

- **Langue :** français impeccable, **vouvoiement** (« vous ») systématique.
- **Voix :** experte, **claire, directe, chaleureuse**. On tranche, on conseille, on donne des arbitrages concrets. On parle à un lecteur pressé qui veut une vraie réponse.
- **Zéro remplissage.** Chaque paragraphe apporte une info actionnable ou un point de vigilance. Pas de généralités creuses, pas de superlatifs gratuits.
- **Honnêteté / evergreen :** ne **jamais inventer** de statistiques précises, d'études, de marques ou de prix exacts donnés comme des faits. Utiliser des **fourchettes**, des **ordres de grandeur** et des repères qualitatifs. Éviter les dates trop précises et l'actu périssable.
- **Cohérence de marque :** on reste dans l'esprit de la tagline « le magazine des achats malins » et des accroches du ticker (`src/lib/site.ts`) : *guides sans langue de bois, comparatifs indépendants, dépenser moins, le bon produit au bon prix*.

### 3. Avant d'écrire — anti-cannibalisation

Avant de rédiger un nouvel article (surtout sur sujet libre) :

1. **Chercher l'existant** sur le même thème :
   ```bash
   ls src/content/articles/ | grep -i "<mot-cle>"
   grep -ril "<mot-cle>" src/content/articles/
   ```
   (Les 900 slugs sont dans `src/content/articles/` ; les titres/tags dans chaque JSON.)
2. **Si un article proche existe :** choisir un **angle distinct** (autre intention de recherche, autre sous-sujet, autre cas d'usage) ou **enrichir l'existant** plutôt que d'en créer un doublon.
3. **Ne jamais** publier deux articles qui visent le même mot-clé principal / la même intention → cannibalisation SEO.
4. Profiter de l'occasion pour **relier** le nouvel article à l'existant via des **liens internes** (§5).

### 4. Qualité rédactionnelle

L'article doit répondre à **toutes les intentions de recherche** derrière le sujet : définition, critères de choix, comparaison des options, budget (ordres de grandeur), erreurs à éviter, usage/entretien, cas d'usage, alternatives.

**Structure via les blocs** (schéma dans `src/content.config.ts`). Blocs disponibles :
`lead` · `key_takeaways` · `heading` (H2/H3) · `paragraph` · `callout` (variantes `info` / `tip` / `warning` / `key` / `money`) · `table` · `comparison` (2 colonnes) · `proscons` · `list` (`ul` / `ol` / `check`) · `steps` · `stat` · `quote` · `faq`.

Trame recommandée (à adapter, **ne pas tout forcer**) :
- **1 `lead`** — chapô accrocheur (2–3 phrases) qui pose l'enjeu.
- **1 `key_takeaways`** — 3 à 5 points essentiels, placé tôt (juste après le lead).
- **5 à 8 sections `heading` H2** minimum, alternées avec des `paragraph` ; H3 pour les sous-parties.
- Selon la pertinence du sujet : **au moins 1 `table`** (comparatif de critères / budget / caractéristiques), **au moins 1 `callout`** de mise en avant, une **`comparison`** si le sujet oppose deux options, un **`proscons`** si pertinent, des **`list`** (style `check` pour les conseils), des **`steps`** pour un mode d'emploi, un **`stat`** (2–4 repères) si tu peux donner des ordres de grandeur crédibles.
- **Toujours terminer par 1 `faq`** de 4 à 6 questions/réponses réellement utiles (les vraies questions de l'acheteur).

Ces éléments riches sont des **exemples au service du sujet** : on les met **quand ils apportent quelque chose**, pas pour cocher une case.

**HTML autorisé** dans les champs `html` / `points` / `items` / réponses : **uniquement** `<strong>`, `<em>`, `<a href="…">`. Pas de titres ni de listes en HTML brut → utiliser les blocs dédiés.

**Longueur :** substantielle et complète (viser ~1700 à 2600 mots de contenu utile).

**Champs méta** (voir §« Créer un article » et le schéma) : `seoTitle` (accrocheur, ≤ ~60 car., mot-clé principal), `metaDescription` (150–160 car., incitative), `excerpt` (~160 car.), `heroKicker` (2–4 mots), `category` (LA rubrique la plus juste), `tags` (4–6, minuscules), `readingTime` (entier, minutes).

### 5. Liens internes (1 à 4 par article)

Chaque article contient **1 à 4 liens internes** vers d'autres pages **réelles** du site :

- **Vers un autre article :** utiliser son `path`, ex. `<a href="/divers/machine-a-glace-comment-faire-le-bon-choix.html">…</a>`.
- **Vers une rubrique :** ex. `<a href="/rubrique/cuisine/">…</a>`.
- **Placement :** dans le corps (`paragraph`, `callout`, `list`, réponses de `faq`), avec une **ancre descriptive** (le texte du lien décrit la page cible — jamais « cliquez ici »).
- **Pertinence :** ne relier que des pages **vraiment liées** au sujet (renfort thématique, maillage cohérent). Vérifier que la cible **existe** (`ls src/content/articles/`) avant de lier — un lien mort est une régression.
- **Rappel HTML :** seuls `<a href>`, `<strong>`, `<em>` sont autorisés dans les champs texte.

### 6. Photo — toujours une vraie photo OpenAI avant publication

**Règle absolue :** jamais publier un article sans visuel. Toujours **une** vraie **photo de couverture (hero)** générée par OpenAI, **« ultra réaliste »**, avant publication.

- **Une seule image (hero) par article.** Pas de galerie, pas d'image dans le corps.
- **Modèle & paramètres** (via `OPENAI_API_KEY` de l'environnement) :
  ```json
  { "model": "gpt-image-2", "size": "1536x1024", "quality": "medium" }
  ```
  > `quality: "medium"` est la **seule** exception à la Règle n°2 (« qualité maximale »).
- **Style de prompt :** photographie éditoriale ultra réaliste, généraliste sur le thème, lumière naturelle douce, composition magazine, couleurs riches — **sans texte, sans logo, sans watermark, sans visage reconnaissable**.
- **Outillage prêt à l'emploi :** `scripts/gen-image.mjs` applique déjà ces paramètres, optimise en WebP (1600 px + 800 px) dans `public/media/`, et renseigne le champ `image` du JSON. Après avoir créé l'article :
  ```bash
  node scripts/gen-image.mjs <slug>
  ```
- **Champ `image` du JSON** une fois la photo générée : `{ "id": "gen-<slug>", "alt": "<titre>", "width": 1536, "height": 1024 }`. Un article dont `image.id` vaut `null` = article **sans visuel** → à ne pas laisser en l'état.

---

## Créer un nouvel article (procédure)

1. **Anti-cannibalisation** — vérifier l'existant (§3), choisir un angle unique.
2. **Rédiger le JSON** dans `src/content/articles/<slug>.json`, conforme au schéma `src/content.config.ts` :
   - `slug` = nom du fichier (sans `.json`), `path` = `/divers/<slug>.html`.
   - `category` = un slug parmi la taxonomie (ci-dessous).
   - Contenu de qualité (§4), **1 à 4 liens internes** (§5).
   - `image` avec `id: null` en attendant la photo.
3. **Générer la photo** (§6) : `node scripts/gen-image.mjs <slug>` → remplit `image` et crée les WebP.
4. **Vérifier** : `npm run build` (le build échoue si le JSON viole le schéma Zod).
5. **Commit + push sur `main`** (Règle n°1). Le déploiement Cloudflare Pages se déclenche seul.

### Taxonomie (10 rubriques — `src/lib/categories.ts`)

| slug | Rubrique |
|---|---|
| `maison` | Maison & Déco |
| `cuisine` | Cuisine & Gourmandises |
| `auto-moto` | Auto & Moto |
| `tech` | Tech & Numérique |
| `voyage` | Voyage & Évasion |
| `argent` | Argent & Assurance |
| `mode` | Mode & Style |
| `loisirs` | Loisirs & Sorties |
| `bien-etre` | Bien-être & Santé |
| `famille` | Famille & Enfants |

---

## Rappels de sécurité & hygiène

- **Secrets :** jamais de clé/token en dur ni committée (§3 des règles d'intervention). Lire depuis `process.env`.
- **Ne pas casser le SEO :** ne jamais renommer un `slug`/`path` existant, ni supprimer un article publié sans raison explicite.
- **Ne pas laisser d'article sans photo** ni de JSON invalide (le build casserait).
- **Toujours sur `main`**, en **qualité maximale**, images OpenAI en `medium`.
